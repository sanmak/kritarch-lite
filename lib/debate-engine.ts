import { run } from "@openai/agents";
import type { CoordinationDecision, Domain, JurorId } from "@/lib/types";
import type {
  BaselineOutput,
  ConsensusVerdict,
  Critique,
  CritiquesOutput,
  EvaluationOutput,
  JurorPosition,
  RevisedPosition,
} from "@/lib/agents/schemas";
import {
  baselineAgent,
  chiefJustice,
  evaluatorAgent,
} from "@/lib/agents/chief-justice";
import {
  critiqueAgentA,
  critiqueAgentB,
  critiqueAgentC,
  jurorA,
  jurorB,
  jurorC,
  revisionAgentA,
  revisionAgentB,
  revisionAgentC,
} from "@/lib/agents/jurors";
import type { LogFields } from "@/lib/logging/logger";
import { truncate } from "@/lib/logging/logger";

export type DebatePhase =
  | "baseline"
  | "positions"
  | "critique"
  | "revision"
  | "verdict"
  | "complete";

export type DebateEvent =
  | { type: "phase"; phase: DebatePhase }
  | { type: "baseline"; data: BaselineOutput }
  | { type: "juror_delta"; juror: JurorId; delta: string }
  | { type: "coordination"; data: CoordinationDecision }
  | { type: "positions_complete"; positions: Record<JurorId, JurorPosition> }
  | { type: "critiques_complete"; critiques: Record<JurorId, Critique[]> | null }
  | { type: "revisions_complete"; revisions: Record<JurorId, RevisedPosition> | null }
  | { type: "verdict"; data: ConsensusVerdict }
  | { type: "evaluation"; data: EvaluationOutput }
  | { type: "complete" };

const chunkText = (text: string, size = 80) => {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
};

const streamJurorText = async function* (
  juror: JurorId,
  text: string
): AsyncGenerator<DebateEvent> {
  const chunks = chunkText(text);
  for (const chunk of chunks) {
    yield { type: "juror_delta", juror, delta: chunk };
  }
};

const positionAgreementScore = (
  a: JurorPosition["position"],
  b: JurorPosition["position"]
) => {
  if (a === b) return 1;
  if (a === "nuanced" || b === "nuanced") return 0.6;
  return 0;
};

const computeAgreementScore = (positions: Record<JurorId, JurorPosition>) => {
  const ab = positionAgreementScore(positions.A.position, positions.B.position);
  const ac = positionAgreementScore(positions.A.position, positions.C.position);
  const bc = positionAgreementScore(positions.B.position, positions.C.position);
  return (ab + ac + bc) / 3;
};

const computeAverageConfidence = (positions: Record<JurorId, JurorPosition>) =>
  (positions.A.confidence + positions.B.confidence + positions.C.confidence) / 3;

const buildDisagreementFocus = (positions: Record<JurorId, JurorPosition>) => {
  const focus: string[] = [];
  const addFocus = (left: JurorId, right: JurorId) => {
    focus.push(
      `Juror ${left} (${positions[left].position}): ${positions[left].summary} | ` +
        `Juror ${right} (${positions[right].position}): ${positions[right].summary}`
    );
  };

  if (positions.A.position !== positions.B.position) addFocus("A", "B");
  if (positions.A.position !== positions.C.position) addFocus("A", "C");
  if (positions.B.position !== positions.C.position) addFocus("B", "C");

  return focus;
};

export async function* runDebate(
  query: string,
  domain: Domain,
  logger?: {
    debug: (message: string, fields?: LogFields) => void;
    info: (message: string, fields?: LogFields) => void;
    warn: (message: string, fields?: LogFields) => void;
    error: (message: string, fields?: LogFields) => void;
  }
): AsyncGenerator<DebateEvent> {
  const context = { query, domain };
  const requestStart = Date.now();
  logger?.info("debate.start", {
    domain,
    queryPreview: truncate(query, 160),
  });

  const phaseStart = (phase: DebatePhase) =>
    logger?.info("phase.start", { phase });
  const phaseEnd = (phase: DebatePhase, start: number) =>
    logger?.info("phase.end", { phase, durationMs: Date.now() - start });

  let timer = Date.now();
  yield { type: "phase", phase: "baseline" };
  phaseStart("baseline");
  const baselineResult = await run(baselineAgent, query, { context });
  if (!baselineResult.finalOutput) {
    throw new Error("Baseline agent did not return output.");
  }
  const baseline = baselineResult.finalOutput;
  yield { type: "baseline", data: baseline };
  phaseEnd("baseline", timer);

  timer = Date.now();
  yield { type: "phase", phase: "positions" };
  phaseStart("positions");
  const [posAResult, posBResult, posCResult] = await Promise.all([
    run(jurorA, query, { context }),
    run(jurorB, query, { context }),
    run(jurorC, query, { context }),
  ]);

  if (!posAResult.finalOutput || !posBResult.finalOutput || !posCResult.finalOutput) {
    throw new Error("One or more juror positions missing.");
  }

  const positions = {
    A: posAResult.finalOutput,
    B: posBResult.finalOutput,
    C: posCResult.finalOutput,
  };

  const jurorSummaries = {
    A: `${positions.A.summary}\n\n${positions.A.reasoning}`,
    B: `${positions.B.summary}\n\n${positions.B.reasoning}`,
    C: `${positions.C.summary}\n\n${positions.C.reasoning}`,
  };

  for await (const event of streamJurorText("A", jurorSummaries.A)) {
    yield event;
  }
  for await (const event of streamJurorText("B", jurorSummaries.B)) {
    yield event;
  }
  for await (const event of streamJurorText("C", jurorSummaries.C)) {
    yield event;
  }

  yield { type: "positions_complete", positions };
  phaseEnd("positions", timer);

  const agreementScore = computeAgreementScore(positions);
  const averageConfidence = computeAverageConfidence(positions);
  const disagreementFocus = buildDisagreementFocus(positions);
  const shouldSkipCritique = agreementScore >= 0.8 && averageConfidence >= 0.6;

  let coordination: CoordinationDecision = {
    agreementScore,
    averageConfidence,
    skipCritique: shouldSkipCritique,
    skipRevision: shouldSkipCritique,
    rationale: shouldSkipCritique
      ? "High agreement and confidence; fast-tracking to verdict."
      : "Disagreement detected; running critique and revision rounds.",
    disagreementFocus,
  };

  logger?.info("coordination.decision", {
    agreementScore,
    averageConfidence,
    skipCritique: coordination.skipCritique,
    skipRevision: coordination.skipRevision,
  });
  yield { type: "coordination", data: coordination };

  let critiques: Record<JurorId, Critique[]> | null = null;
  let revisions: Record<JurorId, RevisedPosition> | null = null;

  if (shouldSkipCritique) {
    timer = Date.now();
    yield { type: "phase", phase: "critique" };
    phaseStart("critique");
    critiques = { A: [], B: [], C: [] };
    yield { type: "critiques_complete", critiques };
    phaseEnd("critique", timer);

    timer = Date.now();
    yield { type: "phase", phase: "revision" };
    phaseStart("revision");
    yield { type: "revisions_complete", revisions };
    phaseEnd("revision", timer);
  } else {
    timer = Date.now();
    yield { type: "phase", phase: "critique" };
    phaseStart("critique");
    const focusBlock = disagreementFocus.length
      ? `Key disagreements to resolve:\n- ${disagreementFocus.join("\n- ")}\n\n`
      : "No major disagreements detected.\n\n";
    const critiquePrompt = (juror: JurorId) =>
      `Question: ${query}\n\n` +
      `Juror A position: ${positions.A.summary}\n${positions.A.reasoning}\n\n` +
      `Juror B position: ${positions.B.summary}\n${positions.B.reasoning}\n\n` +
      `Juror C position: ${positions.C.summary}\n${positions.C.reasoning}\n\n` +
      focusBlock +
      `Provide critiques from the perspective of Juror ${juror}. ` +
      `Return an object with a 'critiques' array following the schema.`;

    const [critAResult, critBResult, critCResult] = await Promise.all([
      run(critiqueAgentA, critiquePrompt("A"), { context }),
      run(critiqueAgentB, critiquePrompt("B"), { context }),
      run(critiqueAgentC, critiquePrompt("C"), { context }),
    ]);

    if (!critAResult.finalOutput || !critBResult.finalOutput || !critCResult.finalOutput) {
      throw new Error("One or more critiques missing.");
    }

    critiques = {
      A: (critAResult.finalOutput as CritiquesOutput).critiques,
      B: (critBResult.finalOutput as CritiquesOutput).critiques,
      C: (critCResult.finalOutput as CritiquesOutput).critiques,
    };

    yield { type: "critiques_complete", critiques };
    phaseEnd("critique", timer);

    const majorChallenges = Object.values(critiques)
      .flat()
      .flatMap((critique) => critique.challenges)
      .filter((challenge) => challenge.severity === "major").length;
    const shouldSkipRevision = majorChallenges === 0 && agreementScore >= 0.6;

    if (shouldSkipRevision) {
      coordination = {
        ...coordination,
        skipRevision: true,
        rationale: "Low-severity critiques; skipping revision round.",
      };
      yield { type: "coordination", data: coordination };

      timer = Date.now();
      yield { type: "phase", phase: "revision" };
      phaseStart("revision");
      yield { type: "revisions_complete", revisions };
      phaseEnd("revision", timer);
    } else {
      timer = Date.now();
      yield { type: "phase", phase: "revision" };
      phaseStart("revision");
      const revisionPrompt = (
        juror: JurorId,
        original: JurorPosition,
        critiqueList: Critique[]
      ) =>
        `Question: ${query}\n\n` +
        `Your original position: ${original.summary}\n${original.reasoning}\n\n` +
        `Critiques you received: ${JSON.stringify(critiqueList)}\n\n` +
        "Revise your position if needed. Provide updated summary, confidence, concessions, and rebuttals.";

      const [revAResult, revBResult, revCResult] = await Promise.all([
        run(revisionAgentA, revisionPrompt("A", positions.A, critiques.A), { context }),
        run(revisionAgentB, revisionPrompt("B", positions.B, critiques.B), { context }),
        run(revisionAgentC, revisionPrompt("C", positions.C, critiques.C), { context }),
      ]);

      if (!revAResult.finalOutput || !revBResult.finalOutput || !revCResult.finalOutput) {
        throw new Error("One or more revisions missing.");
      }

      revisions = {
        A: revAResult.finalOutput,
        B: revBResult.finalOutput,
        C: revCResult.finalOutput,
      };

      yield { type: "revisions_complete", revisions };
      phaseEnd("revision", timer);
    }
  }

  timer = Date.now();
  yield { type: "phase", phase: "verdict" };
  phaseStart("verdict");
  const critiqueSummary = coordination.skipCritique
    ? "Skipped due to high agreement in Round 1."
    : JSON.stringify(critiques);
  const revisionSummary = coordination.skipRevision
    ? coordination.skipCritique
      ? "Skipped due to high agreement in Round 1."
      : "Skipped due to low-severity critiques."
    : JSON.stringify(revisions);
  const verdictPrompt =
    `Question: ${query}\n\n` +
    `Round 1 positions: ${JSON.stringify(positions)}\n\n` +
    `Round 2 critiques: ${critiqueSummary}\n\n` +
    `Round 3 revisions: ${revisionSummary}\n\n` +
    "Synthesize a final consensus verdict with agreement/confidence scores and hallucination flags.";

  const verdictResult = await run(chiefJustice, verdictPrompt, { context });
  if (!verdictResult.finalOutput) {
    throw new Error("Verdict missing.");
  }

  const verdict = verdictResult.finalOutput;
  yield { type: "verdict", data: verdict };
  phaseEnd("verdict", timer);
  try {
    const evaluationPrompt =
      `Question: ${query}\n\n` +
      `Baseline answer: ${baseline.summary}\n` +
      `Baseline reasoning: ${baseline.reasoning}\n` +
      `Baseline confidence: ${baseline.confidence}\n\n` +
      `Jury verdict: ${verdict.verdict}\n` +
      `Final reasoning: ${verdict.finalReasoning}\n` +
      `Agreement score: ${verdict.agreementScore}\n` +
      `Confidence score: ${verdict.confidenceScore}\n` +
      `Key agreements: ${JSON.stringify(verdict.keyAgreements)}\n` +
      `Key disagreements: ${JSON.stringify(verdict.keyDisagreements)}\n\n` +
      "Score baseline vs jury for consistency, specificity, reasoning transparency, and coverage. " +
      "Return strict JSON matching the schema.";
    const evaluationResult = await run(evaluatorAgent, evaluationPrompt, { context });
    if (evaluationResult.finalOutput) {
      yield { type: "evaluation", data: evaluationResult.finalOutput };
    }
  } catch (error) {
    logger?.warn("evaluation.failed", {
      message: error instanceof Error ? error.message : "Evaluation failed",
    });
  }
  logger?.info("debate.complete", { durationMs: Date.now() - requestStart });
  yield { type: "complete" };
}

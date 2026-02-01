import { run } from "@openai/agents";
import type { CoordinationDecision, Domain, JurorId, ModelOption } from "@/lib/types";
import { getAlternateModel, MODEL_OPTIONS } from "@/lib/types";
import type {
  BaselineOutput,
  ConsensusVerdict,
  Critique,
  CritiquesOutput,
  EvaluationOutput,
  JurorPosition,
  RebuttalOutput,
  RevisedPosition,
} from "@/lib/agents/schemas";
import { runtimeConfig } from "@/lib/config";
import {
  baselineFairAgent,
  baselineMiniAgent,
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
  rebuttalAgentA,
  rebuttalAgentB,
  rebuttalAgentC,
  revisionAgentA,
  revisionAgentB,
  revisionAgentC,
} from "@/lib/agents/jurors";
import { buildUsageSnapshot } from "@/lib/agents/cost";
import { modelSettingsFor } from "@/lib/agents/model-settings";
import {
  BASELINE_TEMPERATURE,
  CHIEF_JUSTICE_TEMPERATURE,
  EVALUATOR_TEMPERATURE,
  JUROR_TEMPERATURES,
} from "@/lib/agents/model-presets";
import type { UsageScope, UsageSnapshot } from "@/lib/usage";
import type { LogFields } from "@/lib/logging/logger";
import { truncate } from "@/lib/logging/logger";

export type DebatePhase =
  | "baseline"
  | "positions"
  | "critique"
  | "rebuttal"
  | "revision"
  | "verdict"
  | "complete";

export type DebateEvent =
  | { type: "phase"; phase: DebatePhase }
  | { type: "baseline_fair"; data: BaselineOutput }
  | { type: "baseline_mini"; data: BaselineOutput }
  | { type: "juror_delta"; juror: JurorId; delta: string }
  | { type: "coordination"; data: CoordinationDecision }
  | { type: "positions_complete"; positions: Record<JurorId, JurorPosition> }
  | { type: "critiques_complete"; critiques: Record<JurorId, Critique[]> | null }
  | { type: "rebuttals_complete"; rebuttals: Record<JurorId, RebuttalOutput> | null }
  | { type: "revisions_complete"; revisions: Record<JurorId, RevisedPosition> | null }
  | { type: "verdict"; data: ConsensusVerdict }
  | { type: "evaluation"; data: EvaluationOutput }
  | { type: "usage"; scope: UsageScope; data: UsageSnapshot }
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
  primaryModel: ModelOption = runtimeConfig.OPENAI_MODEL as ModelOption,
  logger?: {
    debug: (message: string, fields?: LogFields) => void;
    info: (message: string, fields?: LogFields) => void;
    warn: (message: string, fields?: LogFields) => void;
    error: (message: string, fields?: LogFields) => void;
  }
): AsyncGenerator<DebateEvent> {
  const normalizedModel = MODEL_OPTIONS.includes(primaryModel)
    ? primaryModel
    : MODEL_OPTIONS[0];
  const alternateModel = getAlternateModel(normalizedModel);
  const context = { query, domain };
  const requestStart = Date.now();
  logger?.info("debate.start", {
    domain,
    queryPreview: truncate(query, 160),
    primaryModel: normalizedModel,
    alternateModel,
  });

  const baselineFairAgentForRun = baselineFairAgent.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, BASELINE_TEMPERATURE),
  });
  const baselineMiniAgentForRun = baselineMiniAgent.clone({
    model: alternateModel,
    modelSettings: modelSettingsFor(alternateModel, BASELINE_TEMPERATURE),
  });
  const jurorAAgent = jurorA.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.A),
  });
  const jurorBAgent = jurorB.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.B),
  });
  const jurorCAgent = jurorC.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.C),
  });
  const critiqueAgentAForRun = critiqueAgentA.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.A),
  });
  const critiqueAgentBForRun = critiqueAgentB.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.B),
  });
  const critiqueAgentCForRun = critiqueAgentC.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.C),
  });
  const rebuttalAgentAForRun = rebuttalAgentA.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.A),
  });
  const rebuttalAgentBForRun = rebuttalAgentB.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.B),
  });
  const rebuttalAgentCForRun = rebuttalAgentC.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.C),
  });
  const revisionAgentAForRun = revisionAgentA.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.A),
  });
  const revisionAgentBForRun = revisionAgentB.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.B),
  });
  const revisionAgentCForRun = revisionAgentC.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, JUROR_TEMPERATURES.C),
  });
  const chiefJusticeAgent = chiefJustice.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, CHIEF_JUSTICE_TEMPERATURE),
  });
  const evaluatorAgentForRun = evaluatorAgent.clone({
    model: normalizedModel,
    modelSettings: modelSettingsFor(normalizedModel, EVALUATOR_TEMPERATURE),
  });

  const phaseStart = (phase: DebatePhase) =>
    logger?.info("phase.start", { phase });
  const phaseEnd = (phase: DebatePhase, start: number) =>
    logger?.info("phase.end", { phase, durationMs: Date.now() - start });

  let timer = Date.now();
  yield { type: "phase", phase: "baseline" };
  phaseStart("baseline");
  const [baselineMiniResult, baselineFairResult] = await Promise.all([
    run(baselineMiniAgentForRun, query, { context }),
    run(baselineFairAgentForRun, query, { context }),
  ]);
  if (!baselineMiniResult.finalOutput || !baselineFairResult.finalOutput) {
    throw new Error("Baseline agents did not return output.");
  }
  const baselineMini = baselineMiniResult.finalOutput;
  const baselineFair = baselineFairResult.finalOutput;
  yield { type: "baseline_mini", data: baselineMini };
  yield { type: "baseline_fair", data: baselineFair };
  yield {
    type: "usage",
    scope: "baselineMini",
    data: buildUsageSnapshot(
      baselineMiniAgentForRun.model,
      baselineMiniResult.state.usage
    ),
  };
  yield {
    type: "usage",
    scope: "baselineFair",
    data: buildUsageSnapshot(
      baselineFairAgentForRun.model,
      baselineFairResult.state.usage
    ),
  };
  phaseEnd("baseline", timer);

  timer = Date.now();
  yield { type: "phase", phase: "positions" };
  phaseStart("positions");
  const [posAResult, posBResult, posCResult] = await Promise.all([
    run(jurorAAgent, query, { context }),
    run(jurorBAgent, query, { context }),
    run(jurorCAgent, query, { context }),
  ]);

  if (!posAResult.finalOutput || !posBResult.finalOutput || !posCResult.finalOutput) {
    throw new Error("One or more juror positions missing.");
  }

  const positions = {
    A: posAResult.finalOutput,
    B: posBResult.finalOutput,
    C: posCResult.finalOutput,
  };
  yield {
    type: "usage",
    scope: "jurorA",
    data: buildUsageSnapshot(jurorAAgent.model, posAResult.state.usage),
  };
  yield {
    type: "usage",
    scope: "jurorB",
    data: buildUsageSnapshot(jurorBAgent.model, posBResult.state.usage),
  };
  yield {
    type: "usage",
    scope: "jurorC",
    data: buildUsageSnapshot(jurorCAgent.model, posCResult.state.usage),
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
  const isDeepDeliberation = !shouldSkipCritique && agreementScore < 0.4;

  let coordination: CoordinationDecision = {
    agreementScore,
    averageConfidence,
    skipCritique: shouldSkipCritique,
    skipRevision: shouldSkipCritique,
    deepDeliberation: isDeepDeliberation,
    rationale: shouldSkipCritique
      ? "High agreement and confidence; fast-tracking to verdict."
      : isDeepDeliberation
        ? "Deep disagreement detected; running critique, rebuttal, and revision rounds."
        : "Disagreement detected; running critique and revision rounds.",
    disagreementFocus,
  };

  logger?.info("coordination.decision", {
    agreementScore,
    averageConfidence,
    skipCritique: coordination.skipCritique,
    skipRevision: coordination.skipRevision,
    deepDeliberation: coordination.deepDeliberation,
  });
  yield { type: "coordination", data: coordination };

  let critiques: Record<JurorId, Critique[]> | null = null;
  let rebuttals: Record<JurorId, RebuttalOutput> | null = null;
  let revisions: Record<JurorId, RevisedPosition> | null = null;

  if (shouldSkipCritique) {
    timer = Date.now();
    yield { type: "phase", phase: "critique" };
    phaseStart("critique");
    critiques = { A: [], B: [], C: [] };
    yield { type: "critiques_complete", critiques };
    phaseEnd("critique", timer);

    yield { type: "rebuttals_complete", rebuttals };

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
      run(critiqueAgentAForRun, critiquePrompt("A"), { context }),
      run(critiqueAgentBForRun, critiquePrompt("B"), { context }),
      run(critiqueAgentCForRun, critiquePrompt("C"), { context }),
    ]);

    if (!critAResult.finalOutput || !critBResult.finalOutput || !critCResult.finalOutput) {
      throw new Error("One or more critiques missing.");
    }

    critiques = {
      A: (critAResult.finalOutput as CritiquesOutput).critiques,
      B: (critBResult.finalOutput as CritiquesOutput).critiques,
      C: (critCResult.finalOutput as CritiquesOutput).critiques,
    };
    yield {
      type: "usage",
      scope: "critiqueA",
      data: buildUsageSnapshot(critiqueAgentAForRun.model, critAResult.state.usage),
    };
    yield {
      type: "usage",
      scope: "critiqueB",
      data: buildUsageSnapshot(critiqueAgentBForRun.model, critBResult.state.usage),
    };
    yield {
      type: "usage",
      scope: "critiqueC",
      data: buildUsageSnapshot(critiqueAgentCForRun.model, critCResult.state.usage),
    };

    yield { type: "critiques_complete", critiques };
    phaseEnd("critique", timer);

    if (isDeepDeliberation) {
      timer = Date.now();
      yield { type: "phase", phase: "rebuttal" };
      phaseStart("rebuttal");
      const rebuttalPrompt = (juror: JurorId, original: JurorPosition, critiqueList: Critique[]) =>
        `Question: ${query}\n\n` +
        `Your original position: ${original.summary}\n${original.reasoning}\n\n` +
        `Critiques you received: ${JSON.stringify(critiqueList)}\n\n` +
        "Respond to these critiques. Concede valid points, defend your strongest arguments, and refine your position. " +
        "Return concessions, defenses, refined position, and refined summary.";

      const [rebAResult, rebBResult, rebCResult] = await Promise.all([
        run(rebuttalAgentAForRun, rebuttalPrompt("A", positions.A, critiques.A), { context }),
        run(rebuttalAgentBForRun, rebuttalPrompt("B", positions.B, critiques.B), { context }),
        run(rebuttalAgentCForRun, rebuttalPrompt("C", positions.C, critiques.C), { context }),
      ]);

      if (!rebAResult.finalOutput || !rebBResult.finalOutput || !rebCResult.finalOutput) {
        throw new Error("One or more rebuttals missing.");
      }

      rebuttals = {
        A: rebAResult.finalOutput,
        B: rebBResult.finalOutput,
        C: rebCResult.finalOutput,
      };
      yield {
        type: "usage",
        scope: "rebuttalA",
        data: buildUsageSnapshot(rebuttalAgentAForRun.model, rebAResult.state.usage),
      };
      yield {
        type: "usage",
        scope: "rebuttalB",
        data: buildUsageSnapshot(rebuttalAgentBForRun.model, rebBResult.state.usage),
      };
      yield {
        type: "usage",
        scope: "rebuttalC",
        data: buildUsageSnapshot(rebuttalAgentCForRun.model, rebCResult.state.usage),
      };

      yield { type: "rebuttals_complete", rebuttals };
      phaseEnd("rebuttal", timer);
    } else {
      yield { type: "rebuttals_complete", rebuttals };
    }

    const majorChallenges = Object.values(critiques)
      .flat()
      .flatMap((critique) => critique.challenges)
      .filter((challenge) => challenge.severity === "major").length;
    const shouldSkipRevision = !isDeepDeliberation && majorChallenges === 0 && agreementScore >= 0.6;

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
        critiqueList: Critique[],
        rebuttal: RebuttalOutput | null
      ) => {
        let prompt =
          `Question: ${query}\n\n` +
          `Your original position: ${original.summary}\n${original.reasoning}\n\n` +
          `Critiques you received: ${JSON.stringify(critiqueList)}\n\n`;
        if (rebuttal) {
          prompt +=
            `Your rebuttal: concessions=${JSON.stringify(rebuttal.concessions)}, ` +
            `defenses=${JSON.stringify(rebuttal.defenses)}, ` +
            `refined position=${rebuttal.refinedPosition}, ` +
            `refined summary=${rebuttal.refinedSummary}\n\n`;
        }
        prompt += "Revise your position if needed. Provide updated summary, confidence, concessions, and rebuttals.";
        return prompt;
      };

      const [revAResult, revBResult, revCResult] = await Promise.all([
        run(revisionAgentAForRun, revisionPrompt("A", positions.A, critiques.A, rebuttals?.A ?? null), { context }),
        run(revisionAgentBForRun, revisionPrompt("B", positions.B, critiques.B, rebuttals?.B ?? null), { context }),
        run(revisionAgentCForRun, revisionPrompt("C", positions.C, critiques.C, rebuttals?.C ?? null), { context }),
      ]);

      if (!revAResult.finalOutput || !revBResult.finalOutput || !revCResult.finalOutput) {
        throw new Error("One or more revisions missing.");
      }

      revisions = {
        A: revAResult.finalOutput,
        B: revBResult.finalOutput,
        C: revCResult.finalOutput,
      };
      yield {
        type: "usage",
        scope: "revisionA",
        data: buildUsageSnapshot(revisionAgentAForRun.model, revAResult.state.usage),
      };
      yield {
        type: "usage",
        scope: "revisionB",
        data: buildUsageSnapshot(revisionAgentBForRun.model, revBResult.state.usage),
      };
      yield {
        type: "usage",
        scope: "revisionC",
        data: buildUsageSnapshot(revisionAgentCForRun.model, revCResult.state.usage),
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
  const rebuttalSummary = rebuttals
    ? JSON.stringify(rebuttals)
    : "No rebuttal round (standard mode).";
  const revisionSummary = coordination.skipRevision
    ? coordination.skipCritique
      ? "Skipped due to high agreement in Round 1."
      : "Skipped due to low-severity critiques."
    : JSON.stringify(revisions);
  const verdictPrompt =
    `Question: ${query}\n\n` +
    `Round 1 positions: ${JSON.stringify(positions)}\n\n` +
    `Round 2 critiques: ${critiqueSummary}\n\n` +
    (isDeepDeliberation ? `Rebuttals: ${rebuttalSummary}\n\n` : "") +
    `Round 3 revisions: ${revisionSummary}\n\n` +
    "Synthesize a final consensus verdict with agreement/confidence scores, key agreements/disagreements, 2-4 key evidence points, hallucination flags, and 2-4 next actions.";

  const verdictResult = await run(chiefJusticeAgent, verdictPrompt, { context });
  if (!verdictResult.finalOutput) {
    throw new Error("Verdict missing.");
  }

  const verdict = verdictResult.finalOutput;
  yield { type: "verdict", data: verdict };
  yield {
    type: "usage",
    scope: "verdict",
    data: buildUsageSnapshot(chiefJusticeAgent.model, verdictResult.state.usage),
  };
  phaseEnd("verdict", timer);
  try {
    const evaluationPrompt =
      `Question: ${query}\n\n` +
      `Baseline answer: ${baselineFair.summary}\n` +
      `Baseline reasoning: ${baselineFair.reasoning}\n` +
      `Baseline confidence: ${baselineFair.confidence}\n\n` +
      `Jury verdict: ${verdict.verdict}\n` +
      `Final reasoning: ${verdict.finalReasoning}\n` +
      `Agreement score: ${verdict.agreementScore}\n` +
      `Confidence score: ${verdict.confidenceScore}\n` +
      `Key agreements: ${JSON.stringify(verdict.keyAgreements)}\n` +
      `Key disagreements: ${JSON.stringify(verdict.keyDisagreements)}\n` +
      `Key evidence: ${JSON.stringify(verdict.keyEvidence)}\n` +
      `Next actions: ${JSON.stringify(verdict.nextActions)}\n\n` +
      "Score baseline vs jury for consistency, specificity, reasoning transparency, and coverage. " +
      "Return strict JSON matching the schema.";
    const evaluationResult = await run(evaluatorAgentForRun, evaluationPrompt, { context });
    if (evaluationResult.finalOutput) {
      yield { type: "evaluation", data: evaluationResult.finalOutput };
      yield {
        type: "usage",
        scope: "evaluator",
        data: buildUsageSnapshot(
          evaluatorAgentForRun.model,
          evaluationResult.state.usage
        ),
      };
    }
  } catch (error) {
    logger?.warn("evaluation.failed", {
      message: error instanceof Error ? error.message : "Evaluation failed",
    });
  }
  logger?.info("debate.complete", { durationMs: Date.now() - requestStart });
  yield { type: "complete" };
}

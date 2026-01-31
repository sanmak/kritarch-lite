import { run } from "@openai/agents";
import type { Domain, JurorId } from "@/lib/types";
import type {
  BaselineOutput,
  ConsensusVerdict,
  Critique,
  CritiquesOutput,
  JurorPosition,
  RevisedPosition,
} from "@/lib/agents/schemas";
import {
  baselineAgent,
  chiefJustice,
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
  | { type: "positions_complete"; positions: Record<JurorId, JurorPosition> }
  | { type: "critiques_complete"; critiques: Record<JurorId, Critique[]> }
  | { type: "revisions_complete"; revisions: Record<JurorId, RevisedPosition> }
  | { type: "verdict"; data: ConsensusVerdict }
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
  yield { type: "baseline", data: baselineResult.finalOutput };
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

  timer = Date.now();
  yield { type: "phase", phase: "critique" };
  phaseStart("critique");
  const critiquePrompt = (juror: JurorId) =>
    `Question: ${query}\n\n` +
    `Juror A position: ${positions.A.summary}\n${positions.A.reasoning}\n\n` +
    `Juror B position: ${positions.B.summary}\n${positions.B.reasoning}\n\n` +
    `Juror C position: ${positions.C.summary}\n${positions.C.reasoning}\n\n` +
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

  const critiques: Record<JurorId, Critique[]> = {
    A: (critAResult.finalOutput as CritiquesOutput).critiques,
    B: (critBResult.finalOutput as CritiquesOutput).critiques,
    C: (critCResult.finalOutput as CritiquesOutput).critiques,
  };

  yield { type: "critiques_complete", critiques };
  phaseEnd("critique", timer);

  timer = Date.now();
  yield { type: "phase", phase: "revision" };
  phaseStart("revision");
  const revisionPrompt = (juror: JurorId, original: JurorPosition, critiqueList: Critique[]) =>
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

  const revisions = {
    A: revAResult.finalOutput,
    B: revBResult.finalOutput,
    C: revCResult.finalOutput,
  };

  yield { type: "revisions_complete", revisions };
  phaseEnd("revision", timer);

  timer = Date.now();
  yield { type: "phase", phase: "verdict" };
  phaseStart("verdict");
  const verdictPrompt =
    `Question: ${query}\n\n` +
    `Round 1 positions: ${JSON.stringify(positions)}\n\n` +
    `Round 2 critiques: ${JSON.stringify(critiques)}\n\n` +
    `Round 3 revisions: ${JSON.stringify(revisions)}\n\n` +
    "Synthesize a final consensus verdict with agreement/confidence scores and hallucination flags.";

  const verdictResult = await run(chiefJustice, verdictPrompt, { context });
  if (!verdictResult.finalOutput) {
    throw new Error("Verdict missing.");
  }

  yield { type: "verdict", data: verdictResult.finalOutput };
  phaseEnd("verdict", timer);
  logger?.info("debate.complete", { durationMs: Date.now() - requestStart });
  yield { type: "complete" };
}

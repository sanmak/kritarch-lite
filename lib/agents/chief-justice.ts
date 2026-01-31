import { Agent } from "@openai/agents";
import {
  BaselineSchema,
  ConsensusVerdictSchema,
  EvaluationSchema,
} from "@/lib/agents/schemas";
import type { DebateContext } from "@/lib/agents/jurors";
import { runtimeConfig } from "@/lib/config";
import { modelSettingsFor } from "@/lib/agents/model-settings";

const MODEL = runtimeConfig.OPENAI_MODEL;
const BASELINE_MODEL = runtimeConfig.OPENAI_BASELINE_MODEL;

export const baselineAgent = new Agent<DebateContext, typeof BaselineSchema>({
  name: "Single Model Baseline",
  instructions: (runContext) =>
    `Answer the ${runContext.context.domain} question directly and concisely.\n` +
    "Provide a position, summary, confidence, and short reasoning. Avoid speculation.",
  model: BASELINE_MODEL,
  modelSettings: modelSettingsFor(BASELINE_MODEL, 0.3),
  outputType: BaselineSchema,
});

export const chiefJustice = new Agent<DebateContext, typeof ConsensusVerdictSchema>({
  name: "Chief Justice",
  instructions: () =>
    "You are an impartial chief justice synthesizing a multi-round debate. " +
    "Identify agreements and disagreements, weigh argument quality, flag likely hallucinations, " +
    "and return a concise consensus verdict with agreement and confidence scores.",
  model: MODEL,
  modelSettings: modelSettingsFor(MODEL, 0.2),
  outputType: ConsensusVerdictSchema,
});

export const evaluatorAgent = new Agent<DebateContext, typeof EvaluationSchema>({
  name: "Evaluator",
  instructions: () =>
    "You are a strict evaluator scoring baseline vs jury answers. " +
    "Score each on consistency, specificity, reasoning transparency, and coverage (0-10). " +
    "Provide overall scores, pick a winner, and give concise notes and rationale.",
  model: MODEL,
  modelSettings: modelSettingsFor(MODEL, 0.2),
  outputType: EvaluationSchema,
});

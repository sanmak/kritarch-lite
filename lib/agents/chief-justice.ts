import { Agent } from "@openai/agents";
import { BaselineSchema, ConsensusVerdictSchema } from "@/lib/agents/schemas";
import type { DebateContext } from "@/lib/agents/jurors";
import { runtimeConfig } from "@/lib/config";

const MODEL = runtimeConfig.OPENAI_MODEL;
const BASELINE_MODEL = runtimeConfig.OPENAI_BASELINE_MODEL;

export const baselineAgent = new Agent<DebateContext>({
  name: "Single Model Baseline",
  instructions: (runContext) =>
    `Answer the ${runContext.context.domain} question directly and concisely.\n` +
    "Provide a position, summary, confidence, and short reasoning. Avoid speculation.",
  model: BASELINE_MODEL,
  modelSettings: { temperature: 0.3 },
  outputType: BaselineSchema,
});

export const chiefJustice = new Agent<DebateContext>({
  name: "Chief Justice",
  instructions: () =>
    "You are an impartial chief justice synthesizing a multi-round debate. " +
    "Identify agreements and disagreements, weigh argument quality, flag likely hallucinations, " +
    "and return a concise consensus verdict with agreement and confidence scores.",
  model: MODEL,
  modelSettings: { temperature: 0.2 },
  outputType: ConsensusVerdictSchema,
});

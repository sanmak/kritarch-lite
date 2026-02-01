import { Agent } from "@openai/agents";
import {
  CritiquesOutputSchema,
  JurorPositionSchema,
  RebuttalSchema,
  RevisedPositionSchema,
} from "@/lib/agents/schemas";
import type { Domain } from "@/lib/types";
import { runtimeConfig } from "@/lib/config";
import { modelSettingsFor } from "@/lib/agents/model-settings";
import { withSafetyGuardrails } from "@/lib/agents/guardrails";
import { JUROR_TEMPERATURES } from "@/lib/agents/model-presets";

export type DebateContext = {
  query: string;
  domain: Domain;
};

const MODEL = runtimeConfig.OPENAI_MODEL;

// Reusable instruction functions that work with any output type
const cautiousAnalystInstructions = (runContext: { context: DebateContext }) =>
  withSafetyGuardrails(
    `You are a rigorous, evidence-driven analyst evaluating a ${runContext.context.domain} question.\n` +
      "You prioritize data, citations, and established research. You are skeptical of claims that lack empirical support. " +
      "Identify risks and caveats. Be concise but thorough."
  );

const devilsAdvocateInstructions = (runContext: { context: DebateContext }) =>
  withSafetyGuardrails(
    `You are a contrarian critical thinker evaluating a ${runContext.context.domain} question.\n` +
      "Challenge assumptions, surface weaknesses, and test reasoning rigorously. Be provocative but fair."
  );

const pragmaticExpertInstructions = (runContext: { context: DebateContext }) =>
  withSafetyGuardrails(
    `You are a domain-savvy pragmatist evaluating a ${runContext.context.domain} question.\n` +
      "Focus on real-world applicability, feasibility, and stakeholder impact."
  );

export const jurorA = new Agent<DebateContext, typeof JurorPositionSchema>({
  name: "Cautious Analyst",
  instructions: cautiousAnalystInstructions,
  model: MODEL,
  modelSettings: modelSettingsFor(MODEL, JUROR_TEMPERATURES.A),
  outputType: JurorPositionSchema,
});

export const jurorB = new Agent<DebateContext, typeof JurorPositionSchema>({
  name: "Devil's Advocate",
  instructions: devilsAdvocateInstructions,
  model: MODEL,
  modelSettings: modelSettingsFor(MODEL, JUROR_TEMPERATURES.B),
  outputType: JurorPositionSchema,
});

export const jurorC = new Agent<DebateContext, typeof JurorPositionSchema>({
  name: "Pragmatic Expert",
  instructions: pragmaticExpertInstructions,
  model: MODEL,
  modelSettings: modelSettingsFor(MODEL, JUROR_TEMPERATURES.C),
  outputType: JurorPositionSchema,
});

export const critiqueAgentA = new Agent<DebateContext, typeof CritiquesOutputSchema>({
  name: "Cautious Analyst (Critique)",
  instructions: cautiousAnalystInstructions,
  model: jurorA.model,
  modelSettings: jurorA.modelSettings,
  outputType: CritiquesOutputSchema,
});

export const critiqueAgentB = new Agent<DebateContext, typeof CritiquesOutputSchema>({
  name: "Devil's Advocate (Critique)",
  instructions: devilsAdvocateInstructions,
  model: jurorB.model,
  modelSettings: jurorB.modelSettings,
  outputType: CritiquesOutputSchema,
});

export const critiqueAgentC = new Agent<DebateContext, typeof CritiquesOutputSchema>({
  name: "Pragmatic Expert (Critique)",
  instructions: pragmaticExpertInstructions,
  model: jurorC.model,
  modelSettings: jurorC.modelSettings,
  outputType: CritiquesOutputSchema,
});

export const rebuttalAgentA = new Agent<DebateContext, typeof RebuttalSchema>({
  name: "Cautious Analyst (Rebuttal)",
  instructions: cautiousAnalystInstructions,
  model: jurorA.model,
  modelSettings: jurorA.modelSettings,
  outputType: RebuttalSchema,
});

export const rebuttalAgentB = new Agent<DebateContext, typeof RebuttalSchema>({
  name: "Devil's Advocate (Rebuttal)",
  instructions: devilsAdvocateInstructions,
  model: jurorB.model,
  modelSettings: jurorB.modelSettings,
  outputType: RebuttalSchema,
});

export const rebuttalAgentC = new Agent<DebateContext, typeof RebuttalSchema>({
  name: "Pragmatic Expert (Rebuttal)",
  instructions: pragmaticExpertInstructions,
  model: jurorC.model,
  modelSettings: jurorC.modelSettings,
  outputType: RebuttalSchema,
});

export const revisionAgentA = new Agent<DebateContext, typeof RevisedPositionSchema>({
  name: "Cautious Analyst (Revision)",
  instructions: cautiousAnalystInstructions,
  model: jurorA.model,
  modelSettings: jurorA.modelSettings,
  outputType: RevisedPositionSchema,
});

export const revisionAgentB = new Agent<DebateContext, typeof RevisedPositionSchema>({
  name: "Devil's Advocate (Revision)",
  instructions: devilsAdvocateInstructions,
  model: jurorB.model,
  modelSettings: jurorB.modelSettings,
  outputType: RevisedPositionSchema,
});

export const revisionAgentC = new Agent<DebateContext, typeof RevisedPositionSchema>({
  name: "Pragmatic Expert (Revision)",
  instructions: pragmaticExpertInstructions,
  model: jurorC.model,
  modelSettings: jurorC.modelSettings,
  outputType: RevisedPositionSchema,
});

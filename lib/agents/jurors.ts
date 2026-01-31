import { Agent } from "@openai/agents";
import {
  CritiquesOutputSchema,
  JurorPositionSchema,
  RevisedPositionSchema,
} from "@/lib/agents/schemas";
import type { Domain } from "@/lib/types";
import { runtimeConfig } from "@/lib/config";

export type DebateContext = {
  query: string;
  domain: Domain;
};

const MODEL = runtimeConfig.OPENAI_MODEL;

export const jurorA = new Agent<DebateContext>({
  name: "Cautious Analyst",
  instructions: (runContext) =>
    `You are a rigorous, evidence-driven analyst evaluating a ${runContext.context.domain} question.\n` +
    "You prioritize data, citations, and established research. You are skeptical of claims that lack empirical support. " +
    "Identify risks and caveats. Be concise but thorough.",
  model: MODEL,
  modelSettings: { temperature: 0.3 },
  outputType: JurorPositionSchema,
});

export const jurorB = new Agent<DebateContext>({
  name: "Devil's Advocate",
  instructions: (runContext) =>
    `You are a contrarian critical thinker evaluating a ${runContext.context.domain} question.\n` +
    "Challenge assumptions, surface weaknesses, and test reasoning rigorously. Be provocative but fair.",
  model: MODEL,
  modelSettings: { temperature: 0.7 },
  outputType: JurorPositionSchema,
});

export const jurorC = new Agent<DebateContext>({
  name: "Pragmatic Expert",
  instructions: (runContext) =>
    `You are a domain-savvy pragmatist evaluating a ${runContext.context.domain} question.\n` +
    "Focus on real-world applicability, feasibility, and stakeholder impact.",
  model: MODEL,
  modelSettings: { temperature: 0.5 },
  outputType: JurorPositionSchema,
});

export const critiqueAgentA = jurorA.clone({
  name: "Cautious Analyst (Critique)",
  outputType: CritiquesOutputSchema,
});

export const critiqueAgentB = jurorB.clone({
  name: "Devil's Advocate (Critique)",
  outputType: CritiquesOutputSchema,
});

export const critiqueAgentC = jurorC.clone({
  name: "Pragmatic Expert (Critique)",
  outputType: CritiquesOutputSchema,
});

export const revisionAgentA = jurorA.clone({
  name: "Cautious Analyst (Revision)",
  outputType: RevisedPositionSchema,
});

export const revisionAgentB = jurorB.clone({
  name: "Devil's Advocate (Revision)",
  outputType: RevisedPositionSchema,
});

export const revisionAgentC = jurorC.clone({
  name: "Pragmatic Expert (Revision)",
  outputType: RevisedPositionSchema,
});

export const DOMAIN_OPTIONS = [
  "finance",
  "healthcare",
  "legal",
  "general",
] as const;

export const MODEL_OPTIONS = ["gpt-5.2", "gpt-5-mini"] as const;

export type Domain = (typeof DOMAIN_OPTIONS)[number];
export type ModelOption = (typeof MODEL_OPTIONS)[number];
export type JurorId = "A" | "B" | "C";

export const getAlternateModel = (model: ModelOption): ModelOption =>
  model === "gpt-5.2" ? "gpt-5-mini" : "gpt-5.2";

export type CoordinationDecision = {
  agreementScore: number;
  averageConfidence: number;
  skipCritique: boolean;
  skipRevision: boolean;
  deepDeliberation: boolean;
  rationale: string;
  disagreementFocus: string[];
};

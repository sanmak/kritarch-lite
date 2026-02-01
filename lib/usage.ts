export const USAGE_SCOPES = [
  "baselineFair",
  "baselineMini",
  "jurorA",
  "jurorB",
  "jurorC",
  "critiqueA",
  "critiqueB",
  "critiqueC",
  "rebuttalA",
  "rebuttalB",
  "rebuttalC",
  "revisionA",
  "revisionB",
  "revisionC",
  "verdict",
  "evaluator",
] as const;

export type UsageScope = (typeof USAGE_SCOPES)[number];

export type UsageSnapshot = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number | null;
};

export type UsageEvent = {
  type: "usage";
  scope: UsageScope;
  data: UsageSnapshot;
};

export const formatCostUsd = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
};

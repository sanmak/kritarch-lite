export const DOMAIN_OPTIONS = [
  "finance",
  "healthcare",
  "legal",
  "general",
] as const;

export type Domain = (typeof DOMAIN_OPTIONS)[number];
export type JurorId = "A" | "B" | "C";

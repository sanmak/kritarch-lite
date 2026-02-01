const INJECTION_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  {
    id: "ignore_instructions",
    regex: /ignore (all|previous|above) (instructions|rules|directions|messages)/i,
  },
  {
    id: "reveal_system",
    regex: /(reveal|show|expose|leak) (the )?(system|developer) (prompt|message|instructions)/i,
  },
  {
    id: "system_prompt",
    regex: /(system prompt|developer message|hidden prompt|hidden instructions)/i,
  },
  {
    id: "override_policy",
    regex: /(override|bypass) (safety|policy|guardrails|filters)/i,
  },
  {
    id: "prompt_injection",
    regex: /(prompt injection|jailbreak|DAN|do anything now)/i,
  },
];

export type InjectionDetection = {
  flagged: boolean;
  matches: string[];
};

export const detectPromptInjection = (text: string): InjectionDetection => {
  if (!text) return { flagged: false, matches: [] };
  const matches = INJECTION_PATTERNS.filter((pattern) => pattern.regex.test(text)).map(
    (pattern) => pattern.id
  );
  return { flagged: matches.length > 0, matches };
};

export const promptInjectionPatterns = INJECTION_PATTERNS.map(
  (pattern) => pattern.id
);

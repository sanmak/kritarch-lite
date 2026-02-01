import type { Model, Usage } from "@openai/agents-core";
import type { UsageSnapshot } from "@/lib/usage";
import { runtimeConfig } from "@/lib/config";

type Pricing = {
  inputUsdPer1M: number;
  outputUsdPer1M: number;
};

type PricingRule = {
  match: (model: string) => boolean;
  pricing: Pricing;
};

// Pricing snapshot from OpenAI API pricing (USD per 1M tokens) on 2026-02-01.
const PRICING_RULES: PricingRule[] = [
  {
    match: (model) => model.startsWith("gpt-5.2"),
    pricing: { inputUsdPer1M: 1.75, outputUsdPer1M: 14 },
  },
  {
    match: (model) => model.startsWith("gpt-5-mini"),
    pricing: { inputUsdPer1M: 0.25, outputUsdPer1M: 2 },
  },
];

const resolvePricing = (model: string) => {
  const overrides = runtimeConfig.OPENAI_PRICING_OVERRIDES ?? {};
  const overrideKey = Object.keys(overrides).find(
    (key) => model === key || model.startsWith(key)
  );
  if (overrideKey) return overrides[overrideKey];
  return PRICING_RULES.find((rule) => rule.match(model))?.pricing ?? null;
};

type ModelLike = { model?: string; name?: string; id?: string };

const normalizeModelName = (model: string | Model) => {
  if (typeof model === "string") return model;
  const typed = model as ModelLike;
  const candidate = typed.model ?? typed.name ?? typed.id;
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : "custom-model";
};

export const buildUsageSnapshot = (
  model: string | Model,
  usage: Usage
): UsageSnapshot => {
  const modelName = normalizeModelName(model);
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const totalTokens = usage.totalTokens ?? inputTokens + outputTokens;
  const pricing = resolvePricing(modelName);
  const costUsd = pricing
    ? (inputTokens / 1_000_000) * pricing.inputUsdPer1M +
      (outputTokens / 1_000_000) * pricing.outputUsdPer1M
    : null;

  return {
    model: modelName,
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd,
  };
};

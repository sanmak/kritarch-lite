import { describe, expect, it, vi } from "vitest";
import { Usage } from "@openai/agents-core";

const buildUsage = (inputTokens: number, outputTokens: number) =>
  new Usage({
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  });

describe("buildUsageSnapshot", () => {
  it("uses default pricing for known models", async () => {
    vi.resetModules();
    process.env.OPENAI_PRICING_OVERRIDES = "";
    const { buildUsageSnapshot } = await import("@/lib/agents/cost");
    const usage = buildUsage(1000, 2000);
    const snapshot = buildUsageSnapshot("gpt-5.2", usage);

    expect(snapshot.model).toBe("gpt-5.2");
    expect(snapshot.totalTokens).toBe(3000);
    expect(snapshot.costUsd).toBeCloseTo(0.02975, 6);
  });

  it("respects pricing overrides", async () => {
    vi.resetModules();
    process.env.OPENAI_PRICING_OVERRIDES = JSON.stringify({
      "gpt-5.2": { inputUsdPer1M: 2, outputUsdPer1M: 20 },
    });
    const { buildUsageSnapshot } = await import("@/lib/agents/cost");
    const usage = buildUsage(1000, 2000);
    const snapshot = buildUsageSnapshot("gpt-5.2", usage);

    expect(snapshot.costUsd).toBeCloseTo(0.042, 6);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/safety/moderation", () => ({
  moderateText: async () => ({ flagged: false, unavailable: true }),
  moderationModel: "omni-moderation-latest",
  moderationMaxChars: 4000,
}));

import { checkInputSafety, sanitizeDebateEvent } from "@/lib/safety/guardrails";
import type { DebateEvent } from "@/lib/debate-engine";

describe("safety guardrails", () => {
  it("fails closed when moderation is unavailable", async () => {
    const decision = await checkInputSafety("Safe prompt");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("moderation_unavailable");
  });

  it("redacts structured outputs when moderation is unavailable", async () => {
    const event: DebateEvent = {
      type: "positions_complete",
      positions: {
        A: {
          position: "support",
          summary: "Summary",
          confidence: 0.5,
          reasoning: "Reasoning",
          evidence: [{ claim: "Claim", basis: "Basis" }],
          risks: ["Risk"],
        },
        B: {
          position: "support",
          summary: "Summary",
          confidence: 0.5,
          reasoning: "Reasoning",
          evidence: [{ claim: "Claim", basis: "Basis" }],
          risks: ["Risk"],
        },
        C: {
          position: "support",
          summary: "Summary",
          confidence: 0.5,
          reasoning: "Reasoning",
          evidence: [{ claim: "Claim", basis: "Basis" }],
          risks: ["Risk"],
        },
      },
    };

    const sanitized = await sanitizeDebateEvent(event);
    if (sanitized.type !== "positions_complete") {
      throw new Error("Expected positions_complete event.");
    }
    expect(sanitized.positions.A.summary).toMatch(/withheld/i);
    expect(sanitized.positions.A.evidence.length).toBe(0);
  });
});

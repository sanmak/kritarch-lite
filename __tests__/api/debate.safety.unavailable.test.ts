import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/safety/guardrails", () => ({
  checkInputSafety: async () => ({
    allowed: false,
    reason: "moderation_unavailable",
    message: "Safety check is temporarily unavailable. Please try again shortly.",
  }),
  sanitizeDebateEvent: async (event: unknown) => event,
}));

describe("POST /api/debate safety guardrails", () => {
  it("fails closed when moderation is unavailable", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const req = new NextRequest("http://localhost/api/debate", {
      method: "POST",
      body: JSON.stringify({ query: "Test prompt", domain: "finance" }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "test-ip-4",
      },
      duplex: "half",
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/safety check/i);
  });
});

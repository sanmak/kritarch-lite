import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { debateEvents } from "@/__tests__/api/fixtures/debate-events";

vi.mock("@/lib/debate-engine", () => ({
  runDebate: async function* () {
    for (const event of debateEvents) {
      yield event;
    }
  },
}));
vi.mock("@/lib/safety/guardrails", () => ({
  checkInputSafety: async () => ({ allowed: true }),
  sanitizeDebateEvent: async (event: unknown) => event,
}));

describe("POST /api/debate", () => {
  it("streams SSE events for valid requests", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const req = new NextRequest("http://localhost/api/debate", {
      method: "POST",
      body: JSON.stringify({
        query: "Test prompt",
        domain: "finance",
        model: "gpt-5.2",
      }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "test-ip-1",
      },
      duplex: "half",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const text = await res.text();
    expect(text).toContain("data: {\"type\":\"phase\"");
    expect(text).toContain("\"type\":\"baseline_mini\"");
    expect(text).toContain("\"type\":\"baseline_fair\"");
    expect(text).toContain("\"type\":\"usage\"");
  });

  it("rejects invalid payloads", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const req = new NextRequest("http://localhost/api/debate", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "test-ip-2",
      },
      duplex: "half",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

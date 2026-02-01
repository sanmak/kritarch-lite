import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/samples/route";

describe("GET /api/samples", () => {
  it("returns sample payload with counts", async () => {
    const req = new NextRequest("http://localhost/api/samples");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.count).toBeGreaterThan(0);
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.byDomain).toBeDefined();
  });
});

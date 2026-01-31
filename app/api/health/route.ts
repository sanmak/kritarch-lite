import { NextRequest } from "next/server";
import { withSecurityHeaders } from "@/lib/security/headers";
import { createRequestLogger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { requestId, requestStart, logger } = createRequestLogger(
    req,
    "/api/health"
  );
  logger.debug("health.check");
  return Response.json(
    { status: "ok" },
    {
      headers: withSecurityHeaders({
        "X-Request-Id": requestId,
        "Server-Timing": `app;dur=${Date.now() - requestStart}`,
      }),
    }
  );
}

import { NextRequest } from "next/server";
import { withSecurityHeaders } from "@/lib/security/headers";
import { SAMPLE_QUESTIONS, SAMPLE_QUESTIONS_BY_DOMAIN } from "@/lib/samples";
import { createRequestLogger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { requestId, requestStart, logger } = createRequestLogger(
    req,
    "/api/samples"
  );
  logger.debug("samples.list", { count: SAMPLE_QUESTIONS.length });
  return Response.json(
    {
      count: SAMPLE_QUESTIONS.length,
      items: SAMPLE_QUESTIONS,
      byDomain: SAMPLE_QUESTIONS_BY_DOMAIN,
    },
    {
      headers: withSecurityHeaders({
        "X-Request-Id": requestId,
        "Server-Timing": `app;dur=${Date.now() - requestStart}`,
      }),
    }
  );
}

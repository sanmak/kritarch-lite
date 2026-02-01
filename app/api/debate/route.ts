import { NextRequest } from "next/server";
import { runDebate } from "@/lib/debate-engine";
import { DebateRequestSchema } from "@/lib/agents/schemas";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { withSecurityHeaders } from "@/lib/security/headers";
import { createRequestLogger } from "@/lib/logging/logger";
import { runtimeConfig } from "@/lib/config";
import { checkInputSafety, sanitizeDebateEvent } from "@/lib/safety/guardrails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { requestId, requestStart, logger } = createRequestLogger(
    req,
    "/api/debate"
  );
  const body = await req.json().catch(() => null);
  const parsed = DebateRequestSchema.safeParse(body);

  if (!parsed.success) {
    logger.warn("request.validation_failed", { issues: parsed.error.issues });
    return new Response(
      JSON.stringify({ error: "Invalid request payload." }),
      {
        status: 400,
        headers: withSecurityHeaders({
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        }),
      }
    );
  }

  if (!runtimeConfig.OPENAI_API_KEY) {
    logger.error("config.invalid", { message: "OPENAI_API_KEY missing" });
    return new Response(
      JSON.stringify({ error: "Server is not configured." }),
      {
        status: 500,
        headers: withSecurityHeaders({
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        }),
      }
    );
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(ip, { windowMs: 60_000, max: 10 });

  if (!limit.allowed) {
    logger.warn("rate_limit.exceeded", { ip });
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded." }),
      {
        status: 429,
        headers: withSecurityHeaders({
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": String(limit.remaining),
          "X-RateLimit-Reset": String(limit.reset),
        }),
      }
    );
  }

  const encoder = new TextEncoder();
  const { query, domain, model } = parsed.data;
  logger.info("request.accepted", { domain, model });

  const safetyDecision = await checkInputSafety(query, logger);
  if (!safetyDecision.allowed) {
    logger.warn("request.blocked", { reason: safetyDecision.reason });
    const status =
      safetyDecision.reason === "moderation_unavailable" ? 503 : 403;
    return new Response(
      JSON.stringify({ error: safetyDecision.message ?? "Request blocked." }),
      {
        status,
        headers: withSecurityHeaders({
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        }),
      }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        for await (const event of runDebate(query, domain, model, logger)) {
          const safeEvent = await sanitizeDebateEvent(event, logger);
          send(safeEvent);
        }
        controller.close();
        logger.info("request.completed", {
          durationMs: Date.now() - requestStart,
        });
      } catch (error) {
        logger.error("request.failed", {
          message: error instanceof Error ? error.message : "Debate failed",
        });
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Debate failed",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: withSecurityHeaders({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Request-Id": requestId,
      "X-RateLimit-Limit": String(limit.limit),
      "X-RateLimit-Remaining": String(limit.remaining),
      "X-RateLimit-Reset": String(limit.reset),
    }),
  });
}

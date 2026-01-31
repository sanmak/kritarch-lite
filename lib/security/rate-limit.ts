import type { NextRequest } from "next/server";

const store = new Map<string, { count: number; reset: number }>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
  limit: number;
};

export const getClientIp = (req: NextRequest) => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return req.headers.get("x-real-ip") ?? "unknown";
};

export const checkRateLimit = (
  key: string,
  options: { windowMs: number; max: number }
): RateLimitResult => {
  const now = Date.now();
  const windowMs = options.windowMs;
  const limit = options.max;
  const entry = store.get(key);

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1, reset: now + windowMs, limit };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, reset: entry.reset, limit };
  }

  entry.count += 1;
  store.set(key, entry);

  return {
    allowed: true,
    remaining: Math.max(limit - entry.count, 0),
    reset: entry.reset,
    limit,
  };
};

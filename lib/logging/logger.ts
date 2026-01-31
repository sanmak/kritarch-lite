import type { NextRequest } from "next/server";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? "info" : "debug";

const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel | undefined) ?? DEFAULT_LEVEL;
const LOG_SAMPLE_RATE = (() => {
  const raw = process.env.LOG_SAMPLE_RATE;
  if (!raw) return 1;
  const value = Number(raw);
  if (Number.isNaN(value)) return 1;
  return Math.min(Math.max(value, 0), 1);
})();

const LOG_TRUNCATE_LENGTH = (() => {
  const raw = process.env.LOG_TRUNCATE_LENGTH;
  if (!raw) return 200;
  const value = Number(raw);
  if (Number.isNaN(value)) return 200;
  return Math.min(Math.max(Math.trunc(value), 50), 1000);
})();

const shouldLog = (level: LogLevel) => {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[LOG_LEVEL]) return false;
  if (level === "error") return true;
  return Math.random() <= LOG_SAMPLE_RATE;
};

export const truncate = (value: string, max = LOG_TRUNCATE_LENGTH) =>
  value.length > max ? `${value.slice(0, max)}…` : value;

const toLogEntry = (
  level: LogLevel,
  message: string,
  base: LogFields,
  fields?: LogFields
) => ({
  ts: new Date().toISOString(),
  level,
  message,
  ...base,
  ...(fields ?? {}),
});

export const createLogger = (base: LogFields = {}) => {
  const log = (level: LogLevel, message: string, fields?: LogFields) => {
    if (!shouldLog(level)) return;
    const entry = toLogEntry(level, message, base, fields);
    const payload = JSON.stringify(entry);
    if (level === "error") {
      console.error(payload);
    } else {
      console.log(payload);
    }
  };

  return {
    debug: (message: string, fields?: LogFields) => log("debug", message, fields),
    info: (message: string, fields?: LogFields) => log("info", message, fields),
    warn: (message: string, fields?: LogFields) => log("warn", message, fields),
    error: (message: string, fields?: LogFields) => log("error", message, fields),
    with: (extra: LogFields) => createLogger({ ...base, ...extra }),
  };
};

export const getRequestId = (req: NextRequest) =>
  req.headers.get("x-request-id") ?? crypto.randomUUID();

export const createRequestLogger = (req: NextRequest, route: string) => {
  const requestId = getRequestId(req);
  const requestStartHeader = req.headers.get("x-request-start");
  const requestStart = requestStartHeader
    ? Number(requestStartHeader)
    : Date.now();
  const base = {
    requestId,
    route,
    method: req.method,
  };

  return {
    requestId,
    requestStart,
    logger: createLogger(base),
  };
};

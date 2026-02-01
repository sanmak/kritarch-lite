import "server-only";
import { z } from "zod";

const EnvSchema = z
  .object({
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
    OPENAI_MODEL: z.string().min(1).default("gpt-5.2"),
    OPENAI_BASELINE_MODEL: z.string().min(1).default("gpt-5-mini"),
    OPENAI_PRICING_OVERRIDES: z.string().optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
    LOG_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
    LOG_TRUNCATE_LENGTH: z.coerce.number().int().min(50).max(1000).optional(),
    FEATURE_FLAGS: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    PORT: z.coerce.number().int().min(1).max(65535).optional(),
  })
  .transform((env) => {
    const pricingSchema = z.record(
      z.string(),
      z.object({
        inputUsdPer1M: z.number().min(0),
        outputUsdPer1M: z.number().min(0),
      })
    );
    let pricingOverrides: Record<
      string,
      { inputUsdPer1M: number; outputUsdPer1M: number }
    > = {};

    if (env.OPENAI_PRICING_OVERRIDES) {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(env.OPENAI_PRICING_OVERRIDES);
      } catch {
        throw new Error("OPENAI_PRICING_OVERRIDES must be valid JSON.");
      }
      const parsed = pricingSchema.safeParse(parsedValue);
      if (!parsed.success) {
        throw new Error(
          "OPENAI_PRICING_OVERRIDES must map model keys to inputUsdPer1M/outputUsdPer1M."
        );
      }
      pricingOverrides = parsed.data;
    }

    return {
      ...env,
      OPENAI_BASELINE_MODEL: env.OPENAI_BASELINE_MODEL ?? env.OPENAI_MODEL,
      OPENAI_PRICING_OVERRIDES: pricingOverrides,
      FEATURE_FLAGS: env.FEATURE_FLAGS
        ? env.FEATURE_FLAGS.split(",").map((flag) => flag.trim()).filter(Boolean)
        : [],
    };
  });

export type RuntimeConfig = z.infer<typeof EnvSchema>;

let cached: RuntimeConfig | null = null;

export const getRuntimeConfig = (): RuntimeConfig => {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join(", ");
    throw new Error(`Invalid environment variables: ${issues}`);
  }
  cached = parsed.data;
  return cached;
};

export const runtimeConfig = getRuntimeConfig();

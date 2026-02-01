import "server-only";
import OpenAI from "openai";
import type { Moderation } from "openai/resources/moderations";
import { runtimeConfig } from "@/lib/config";
import type { LogFields } from "@/lib/logging/logger";

const MODERATION_MODEL = "omni-moderation-latest";
const MAX_MODERATION_CHARS = 4000;

export type ModerationVerdict = {
  flagged: boolean;
  categories?: Moderation["categories"];
  unavailable?: boolean;
};

type Logger = {
  warn: (message: string, fields?: LogFields) => void;
};

let client: OpenAI | null = null;

const getClient = () => {
  if (!client) {
    client = new OpenAI({ apiKey: runtimeConfig.OPENAI_API_KEY });
  }
  return client;
};

const clampModerationInput = (text: string) =>
  text.length > MAX_MODERATION_CHARS ? text.slice(0, MAX_MODERATION_CHARS) : text;

export const moderateText = async (
  text: string,
  logger?: Logger,
  label?: string
): Promise<ModerationVerdict> => {
  const trimmed = text.trim();
  if (!trimmed) return { flagged: false };

  try {
    const response = await getClient().moderations.create({
      model: MODERATION_MODEL,
      input: clampModerationInput(trimmed),
    });
    const flagged = response.results?.some((result) => result.flagged) ?? false;
    const categories = response.results?.[0]?.categories;
    if (flagged) {
      logger?.warn("safety.moderation_flagged", {
        label,
        categories,
      });
    }
    return { flagged, categories };
  } catch (error) {
    logger?.warn("safety.moderation_failed", {
      label,
      message: error instanceof Error ? error.message : "Moderation failed",
    });
    return { flagged: false, unavailable: true };
  }
};

export const moderationModel = MODERATION_MODEL;
export const moderationMaxChars = MAX_MODERATION_CHARS;

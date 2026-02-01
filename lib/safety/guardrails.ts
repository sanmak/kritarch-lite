import "server-only";
import type { DebateEvent } from "@/lib/debate-engine";
import type {
  Critique,
  JurorPosition,
  RebuttalOutput,
  RevisedPosition,
} from "@/lib/agents/schemas";
import type { LogFields } from "@/lib/logging/logger";
import { detectPromptInjection } from "@/lib/safety/jailbreak";
import { moderateText } from "@/lib/safety/moderation";

const REDACTED_TEXT = "Content withheld due to safety policy.";
const REDACTED_DELTA = "[redacted for safety]";

export type SafetyDecision = {
  allowed: boolean;
  reason?: "prompt_injection" | "unsafe_content" | "moderation_unavailable";
  message?: string;
};

type Logger = {
  warn: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
};

const blockForInjection = (text: string, logger?: Logger, label?: string) => {
  const detection = detectPromptInjection(text);
  if (!detection.flagged) return { blocked: false };
  logger?.warn("safety.prompt_injection_detected", {
    label,
    matches: detection.matches,
  });
  return { blocked: true, matches: detection.matches };
};

const screenOutput = async (text: string, logger?: Logger, label?: string) => {
  const injection = blockForInjection(text, logger, label);
  if (injection.blocked) {
    return { allowed: false, reason: "prompt_injection" as const };
  }
  const moderation = await moderateText(text, logger, label);
  if (moderation.flagged) {
    return { allowed: false, reason: "unsafe_content" as const };
  }
  if (moderation.unavailable) {
    logger?.warn("safety.moderation_unavailable", { label });
    return { allowed: false, reason: "moderation_unavailable" as const };
  }
  return { allowed: true };
};

export const checkInputSafety = async (
  text: string,
  logger?: Logger
): Promise<SafetyDecision> => {
  const injection = blockForInjection(text, logger, "input");
  if (injection.blocked) {
    return {
      allowed: false,
      reason: "prompt_injection",
      message:
        "Request looks like a prompt-injection attempt. Please rephrase the question without meta-instructions.",
    };
  }

  const moderation = await moderateText(text, logger, "input");
  if (moderation.flagged) {
    return {
      allowed: false,
      reason: "unsafe_content",
      message: "Request contains unsafe content and cannot be processed.",
    };
  }

  if (moderation.unavailable) {
    logger?.warn("safety.moderation_unavailable", { label: "input" });
    return {
      allowed: false,
      reason: "moderation_unavailable",
      message:
        "Safety check is temporarily unavailable. Please try again shortly.",
    };
  }

  return { allowed: true };
};

const sanitizeJurorPosition = async (
  position: JurorPosition,
  logger?: Logger
) => {
  const combined = [
    position.summary,
    position.reasoning,
    ...position.evidence.map((item) => `${item.claim} ${item.basis}`),
    ...position.risks,
  ].join("\n");

  const safety = await screenOutput(combined, logger, "positions");
  if (safety.allowed) return position;

  return {
    ...position,
    summary: REDACTED_TEXT,
    reasoning: REDACTED_TEXT,
    evidence: [],
    risks: [],
  };
};

const sanitizeCritique = async (
  critique: Critique,
  logger?: Logger
): Promise<Critique> => {
  const combined = [
    critique.targetJuror,
    ...critique.agreements,
    ...critique.challenges.map((item) => `${item.point} ${item.counterargument}`),
    ...critique.missingPerspectives,
    critique.overallAssessment,
  ].join("\n");

  const safety = await screenOutput(combined, logger, "critiques");
  if (safety.allowed) return critique;

  return {
    ...critique,
    agreements: [],
    challenges: [],
    missingPerspectives: [],
  };
};

const sanitizeRebuttal = async (
  rebuttal: RebuttalOutput,
  logger?: Logger
): Promise<RebuttalOutput> => {
  const combined = [
    ...rebuttal.concessions,
    ...rebuttal.defenses,
    rebuttal.refinedSummary,
  ].join("\n");

  const safety = await screenOutput(combined, logger, "rebuttals");
  if (safety.allowed) return rebuttal;

  return {
    ...rebuttal,
    concessions: [],
    defenses: [],
    refinedSummary: REDACTED_TEXT,
  };
};

const sanitizeRevision = async (
  revision: RevisedPosition,
  logger?: Logger
): Promise<RevisedPosition> => {
  const combined = [
    revision.summary,
    revision.reasoning,
    ...revision.concessions,
    ...revision.rebuttals,
  ].join("\n");

  const safety = await screenOutput(combined, logger, "revisions");
  if (safety.allowed) return revision;

  return {
    ...revision,
    summary: REDACTED_TEXT,
    reasoning: REDACTED_TEXT,
    concessions: [],
    rebuttals: [],
  };
};

export const sanitizeDebateEvent = async (
  event: DebateEvent,
  logger?: Logger
): Promise<DebateEvent> => {
  switch (event.type) {
    case "baseline_fair":
    case "baseline_mini": {
      const combined = `${event.data.summary}\n${event.data.reasoning}`;
      const safety = await screenOutput(combined, logger, event.type);
      if (safety.allowed) return event;
      return {
        ...event,
        data: {
          ...event.data,
          summary: REDACTED_TEXT,
          reasoning: REDACTED_TEXT,
        },
      };
    }
    case "juror_delta": {
      const injection = blockForInjection(event.delta, logger, "juror_delta");
      if (!injection.blocked) return event;
      return { ...event, delta: REDACTED_DELTA };
    }
    case "positions_complete": {
      return {
        ...event,
        positions: {
          A: await sanitizeJurorPosition(event.positions.A, logger),
          B: await sanitizeJurorPosition(event.positions.B, logger),
          C: await sanitizeJurorPosition(event.positions.C, logger),
        },
      };
    }
    case "critiques_complete": {
      if (!event.critiques) return event;
      return {
        ...event,
        critiques: {
          A: await Promise.all(
            event.critiques.A.map((critique) =>
              sanitizeCritique(critique, logger)
            )
          ),
          B: await Promise.all(
            event.critiques.B.map((critique) =>
              sanitizeCritique(critique, logger)
            )
          ),
          C: await Promise.all(
            event.critiques.C.map((critique) =>
              sanitizeCritique(critique, logger)
            )
          ),
        },
      };
    }
    case "rebuttals_complete": {
      if (!event.rebuttals) return event;
      return {
        ...event,
        rebuttals: {
          A: await sanitizeRebuttal(event.rebuttals.A, logger),
          B: await sanitizeRebuttal(event.rebuttals.B, logger),
          C: await sanitizeRebuttal(event.rebuttals.C, logger),
        },
      };
    }
    case "revisions_complete": {
      if (!event.revisions) return event;
      return {
        ...event,
        revisions: {
          A: await sanitizeRevision(event.revisions.A, logger),
          B: await sanitizeRevision(event.revisions.B, logger),
          C: await sanitizeRevision(event.revisions.C, logger),
        },
      };
    }
    case "verdict": {
      const combined = [
        event.data.verdict,
        event.data.finalReasoning,
        ...event.data.keyAgreements,
        ...event.data.keyDisagreements,
        ...event.data.keyEvidence,
        ...event.data.nextActions,
      ].join("\n");
      const safety = await screenOutput(combined, logger, "verdict");
      if (safety.allowed) return event;
      return {
        ...event,
        data: {
          ...event.data,
          verdict: REDACTED_TEXT,
          finalReasoning: REDACTED_TEXT,
          keyAgreements: [],
          keyDisagreements: [],
          keyEvidence: [],
          nextActions: [],
          hallucinationFlags: [],
        },
      };
    }
    case "evaluation": {
      const combined = [
        event.data.baseline.notes,
        event.data.jury.notes,
        event.data.rationale,
      ].join("\n");
      const safety = await screenOutput(combined, logger, "evaluation");
      if (safety.allowed) return event;
      return {
        ...event,
        data: {
          ...event.data,
          baseline: { ...event.data.baseline, notes: REDACTED_TEXT },
          jury: { ...event.data.jury, notes: REDACTED_TEXT },
          rationale: REDACTED_TEXT,
        },
      };
    }
    default:
      return event;
  }
};

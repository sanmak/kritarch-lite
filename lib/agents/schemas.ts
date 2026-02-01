import { z } from "zod";
import { DOMAIN_OPTIONS, MODEL_OPTIONS } from "@/lib/types";

export const DebateRequestSchema = z.object({
  query: z.string().min(1).max(2000),
  domain: z.enum(DOMAIN_OPTIONS),
  model: z.enum(MODEL_OPTIONS).default(MODEL_OPTIONS[0]),
});

export const BaselineSchema = z.object({
  position: z.enum(["support", "oppose", "nuanced"]),
  summary: z.string().describe("1-2 sentence summary"),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().describe("Short explanation"),
});

export const JurorPositionSchema = z.object({
  position: z.enum(["support", "oppose", "nuanced"]),
  summary: z.string().describe("1-2 sentence position statement"),
  confidence: z.number().min(0).max(1).describe("Confidence in this position"),
  reasoning: z.string().describe("Detailed reasoning"),
  evidence: z
    .array(
      z.object({
        claim: z.string(),
        basis: z.string().describe("Source, data, or logic"),
      })
    )
    .describe("Supporting evidence points"),
  risks: z.array(z.string()).describe("Key risks or caveats"),
});

export const CritiqueSchema = z.object({
  targetJuror: z.string().describe("Which juror is being critiqued"),
  agreements: z.array(z.string()).describe("Points of agreement"),
  challenges: z.array(
    z.object({
      point: z.string().describe("Claim being challenged"),
      counterargument: z.string().describe("Why it's wrong or incomplete"),
      severity: z.enum(["minor", "moderate", "major"]),
    })
  ),
  missingPerspectives: z.array(z.string()).describe("What was overlooked"),
  overallAssessment: z.enum(["strong", "moderate", "weak"]),
});

export const CritiquesOutputSchema = z.object({
  critiques: z.array(CritiqueSchema).describe("List of critiques authored by this juror"),
});

export const RevisedPositionSchema = z.object({
  originalPosition: z.enum(["support", "oppose", "nuanced"]),
  revisedPosition: z.enum(["support", "oppose", "nuanced"]),
  positionChanged: z.boolean(),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  reasoning: z.string(),
  concessions: z.array(z.string()),
  rebuttals: z.array(z.string()),
});

export const RebuttalSchema = z.object({
  concessions: z.array(z.string()).describe("Points conceded after reading critiques"),
  defenses: z.array(z.string()).describe("Points defended against critiques"),
  refinedPosition: z.enum(["support", "oppose", "nuanced"]),
  refinedSummary: z.string().describe("Updated summary after rebuttal"),
});

export const ConsensusVerdictSchema = z.object({
  verdict: z.string().describe("Consensus verdict in 1-2 sentences"),
  agreementScore: z.number().min(0).max(1),
  confidenceScore: z.number().min(0).max(1),
  positionBreakdown: z.object({
    support: z.number(),
    oppose: z.number(),
    nuanced: z.number(),
  }),
  keyAgreements: z.array(z.string()),
  keyDisagreements: z.array(z.string()),
  keyEvidence: z
    .array(z.string())
    .default([])
    .describe("Key evidence supporting the verdict"),
  nextActions: z
    .array(z.string())
    .default([])
    .describe("Recommended next actions tied to the verdict"),
  reasoningQuality: z.object({
    jurorA: z.number().min(0).max(10),
    jurorB: z.number().min(0).max(10),
    jurorC: z.number().min(0).max(10),
  }),
  hallucinationFlags: z.array(
    z.object({
      juror: z.string(),
      claim: z.string(),
      reason: z.string(),
    })
  ),
  finalReasoning: z.string(),
});

export const EvaluationSchema = z.object({
  baseline: z.object({
    overall: z.number().min(0).max(10),
    consistency: z.number().min(0).max(10),
    specificity: z.number().min(0).max(10),
    reasoning: z.number().min(0).max(10),
    coverage: z.number().min(0).max(10),
    notes: z.string().describe("Short notes on baseline quality"),
  }),
  jury: z.object({
    overall: z.number().min(0).max(10),
    consistency: z.number().min(0).max(10),
    specificity: z.number().min(0).max(10),
    reasoning: z.number().min(0).max(10),
    coverage: z.number().min(0).max(10),
    notes: z.string().describe("Short notes on jury quality"),
  }),
  winner: z.enum(["baseline", "jury", "tie"]),
  rationale: z.string().describe("1-2 sentence comparison rationale"),
});

export type RebuttalOutput = z.infer<typeof RebuttalSchema>;
export type BaselineOutput = z.infer<typeof BaselineSchema>;
export type JurorPosition = z.infer<typeof JurorPositionSchema>;
export type Critique = z.infer<typeof CritiqueSchema>;
export type CritiquesOutput = z.infer<typeof CritiquesOutputSchema>;
export type RevisedPosition = z.infer<typeof RevisedPositionSchema>;
export type ConsensusVerdict = z.infer<typeof ConsensusVerdictSchema>;
export type EvaluationOutput = z.infer<typeof EvaluationSchema>;

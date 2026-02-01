export const debateEvents = [
  { type: "phase", phase: "baseline" },
  {
    type: "baseline_mini",
    data: {
      position: "nuanced",
      summary: "Mini baseline summary",
      confidence: 0.6,
      reasoning: "Mini baseline reasoning",
    },
  },
  {
    type: "baseline_fair",
    data: {
      position: "nuanced",
      summary: "Same-model baseline summary",
      confidence: 0.6,
      reasoning: "Same-model baseline reasoning",
    },
  },
  {
    type: "usage",
    scope: "baselineMini",
    data: {
      model: "gpt-5-mini",
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      costUsd: 0.0001,
    },
  },
  {
    type: "usage",
    scope: "baselineFair",
    data: {
      model: "gpt-5.2",
      inputTokens: 12,
      outputTokens: 6,
      totalTokens: 18,
      costUsd: 0.0004,
    },
  },
  { type: "phase", phase: "positions" },
  {
    type: "juror_delta",
    juror: "A",
    delta: "Juror A streaming output...",
  },
  {
    type: "coordination",
    data: {
      agreementScore: 0.55,
      averageConfidence: 0.62,
      skipCritique: false,
      skipRevision: false,
      rationale: "Disagreement detected; running critique and revision rounds.",
      disagreementFocus: ["Dispute over evidence strength."],
    },
  },
  {
    type: "positions_complete",
    positions: {
      A: {
        position: "support",
        summary: "Juror A summary",
        confidence: 0.62,
        reasoning: "Juror A reasoning",
        evidence: [{ claim: "Claim A", basis: "Study A" }],
        risks: ["Risk A"],
      },
      B: {
        position: "oppose",
        summary: "Juror B summary",
        confidence: 0.58,
        reasoning: "Juror B reasoning",
        evidence: [{ claim: "Claim B", basis: "Study B" }],
        risks: ["Risk B"],
      },
      C: {
        position: "nuanced",
        summary: "Juror C summary",
        confidence: 0.66,
        reasoning: "Juror C reasoning",
        evidence: [{ claim: "Claim C", basis: "Study C" }],
        risks: ["Risk C"],
      },
    },
  },
  {
    type: "critiques_complete",
    critiques: {
      A: [
        {
          targetJuror: "B",
          agreements: ["Agreement A"],
          challenges: [
            {
              point: "Point A",
              counterargument: "Counter A",
              severity: "moderate",
            },
          ],
          missingPerspectives: ["Perspective A"],
          overallAssessment: "moderate",
        },
      ],
      B: [],
      C: [],
    },
  },
  {
    type: "rebuttals_complete",
    rebuttals: {
      A: {
        concessions: ["Concession A"],
        defenses: ["Defense A"],
        refinedPosition: "nuanced",
        refinedSummary: "Refined A summary",
      },
      B: {
        concessions: ["Concession B"],
        defenses: ["Defense B"],
        refinedPosition: "oppose",
        refinedSummary: "Refined B summary",
      },
      C: {
        concessions: ["Concession C"],
        defenses: ["Defense C"],
        refinedPosition: "support",
        refinedSummary: "Refined C summary",
      },
    },
  },
  {
    type: "revisions_complete",
    revisions: {
      A: {
        originalPosition: "support",
        revisedPosition: "nuanced",
        positionChanged: true,
        confidence: 0.55,
        summary: "Revised A summary",
        reasoning: "Revised A reasoning",
        concessions: ["Concession A"],
        rebuttals: ["Rebuttal A"],
      },
      B: {
        originalPosition: "oppose",
        revisedPosition: "oppose",
        positionChanged: false,
        confidence: 0.57,
        summary: "Revised B summary",
        reasoning: "Revised B reasoning",
        concessions: ["Concession B"],
        rebuttals: ["Rebuttal B"],
      },
      C: {
        originalPosition: "nuanced",
        revisedPosition: "nuanced",
        positionChanged: false,
        confidence: 0.66,
        summary: "Revised C summary",
        reasoning: "Revised C reasoning",
        concessions: ["Concession C"],
        rebuttals: ["Rebuttal C"],
      },
    },
  },
  {
    type: "verdict",
    data: {
      verdict: "Consensus verdict",
      agreementScore: 0.62,
      confidenceScore: 0.64,
      positionBreakdown: { support: 1, oppose: 1, nuanced: 1 },
      keyAgreements: ["Agreement"],
      keyDisagreements: ["Disagreement"],
      reasoningQuality: { jurorA: 7, jurorB: 6, jurorC: 7 },
      hallucinationFlags: [
        { juror: "A", claim: "Claim", reason: "Reason" },
      ],
      finalReasoning: "Final reasoning",
    },
  },
  {
    type: "evaluation",
    data: {
      baseline: {
        overall: 5,
        consistency: 5,
        specificity: 5,
        reasoning: 5,
        coverage: 5,
        notes: "Baseline notes",
      },
      jury: {
        overall: 6,
        consistency: 6,
        specificity: 6,
        reasoning: 6,
        coverage: 6,
        notes: "Jury notes",
      },
      winner: "jury",
      rationale: "Jury is stronger",
    },
  },
  { type: "complete" },
] as const;

export const errorEvent = {
  type: "error",
  message: "Debate failed",
} as const;

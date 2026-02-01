"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BaselineOutput,
  ConsensusVerdict,
  Critique,
  EvaluationOutput,
  JurorPosition,
  RebuttalOutput,
  RevisedPosition,
} from "@/lib/agents/schemas";
import type {
  CoordinationDecision,
  Domain,
  JurorId,
  ModelOption,
} from "@/lib/types";
import { getAlternateModel, MODEL_OPTIONS } from "@/lib/types";
import type { UsageScope, UsageSnapshot } from "@/lib/usage";
import { RoundProgress } from "@/components/round-progress";
import { JurorPanel } from "@/components/juror-panel";
import { VerdictPanel } from "@/components/verdict-panel";
import { CritiqueList } from "@/components/critique-list";
import { RebuttalPanel } from "@/components/rebuttal-panel";
import { RevisionPanel } from "@/components/revision-panel";
import { ComparisonPanel } from "@/components/comparison-panel";

const DOMAINS: { id: Domain; label: string }[] = [
  { id: "finance", label: "Finance" },
  { id: "healthcare", label: "Healthcare" },
  { id: "legal", label: "Legal" },
  { id: "general", label: "General" },
];

type GlossaryTerm = {
  id: string;
  term: string;
  description: string;
  emphasis?: "primary" | "default";
};

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: "baseline",
    term: "Baseline",
    description:
      "Two single-model baselines: one using your selected model (fairness) and one using the alternate model (cost/quality contrast).",
  },
  {
    id: "jurors",
    term: "Jurors",
    description: "Three agents with distinct reasoning styles.",
  },
  {
    id: "chief-justice",
    term: "Chief Justice",
    description: "Aggregates juror outputs into the final verdict.",
  },
  {
    id: "rounds",
    term: "Rounds",
    description:
      "Pipeline steps: baselines, positions, critique, rebuttal (deep deliberation only), revision, verdict.",
  },
  {
    id: "critique",
    term: "Critique",
    description: "Round 2 where jurors challenge each other's positions.",
  },
  {
    id: "revision",
    term: "Revision",
    description: "Round 3 updates after critiques (sometimes skipped).",
  },
  {
    id: "verdict",
    term: "Verdict",
    description: "The Chief Justice's consensus synthesis.",
  },
  {
    id: "evaluation",
    term: "Evaluation",
    description:
      "Independent scoring that compares the jury output against the selected-model baseline.",
  },
  {
    id: "safety-guardrails",
    term: "Safety guardrails",
    description:
      "Preflight prompt-injection heuristics + moderation checks; unsafe requests are blocked (fail-closed if moderation is unavailable).",
  },
  {
    id: "prompt-injection",
    term: "Prompt injection",
    description:
      "Attempts to override instructions or reveal hidden prompts; detected and blocked.",
  },
  {
    id: "redaction",
    term: "Redaction",
    description:
      "If unsafe output is detected, responses are masked before streaming to the UI.",
  },
  {
    id: "cost-estimates",
    term: "Cost estimates",
    description:
      "Costs depend on the selected model. gpt-5.2 (~$1.75 in / $14 out per 1M tokens) vs gpt-5-mini (~$0.25 in / $2 out). Jurors/Verdict/Evaluator use the selected model; the alternate baseline uses the other. Estimates are approximate and can be overridden.",
  },
  {
    id: "coordination",
    term: "Coordination",
    description: "Agreement-based control that can deepen or skip rounds.",
  },
  {
    id: "agreement-score",
    term: "Agreement score",
    description:
      "How aligned the jurors are; higher scores can fast-track the flow.",
  },
  {
    id: "average-confidence",
    term: "Average confidence",
    description:
      "Mean juror confidence used alongside agreement to skip rounds.",
  },
  {
    id: "disagreement-focus",
    term: "Disagreement focus",
    description: "Key conflicts extracted to guide the critique prompts.",
  },
  {
    id: "skip-logic",
    term: "Skip logic",
    description:
      "Three modes: fast-track (high agreement), standard, or deep deliberation (low agreement adds rebuttal round).",
  },
  {
    id: "deep-deliberation",
    term: "Deep deliberation",
    description:
      "Activated when agreement < 40%. Adds a rebuttal round between critique and revision so jurors respond to challenges before revising.",
  },
  {
    id: "rebuttal",
    term: "Rebuttal",
    description:
      "Extra round in deep deliberation where jurors concede valid critique points, defend strong arguments, and refine their positions.",
  },
];

type AgentProfile = {
  id: string;
  unit: string;
  name: string;
  role: string;
  callSign: string;
  status: string;
  tagline: string;
  details: string[];
  metadata: { label: string; value: string }[];
  stats: { label: string; value: number }[];
  portraitClass: string;
  accentClass: string;
  barClass: string;
  badgeClass: string;
};

const AGENT_PROFILES: AgentProfile[] = [
  {
    id: "cautious-analyst",
    unit: "Juror 1",
    name: "Cautious Analyst",
    role: "Risk & compliance control",
    callSign: "CA",
    status: "Operational",
    tagline:
      "Stabilizes the debate with rigorous checks and uncertainty flags.",
    details: [
      "Validates assumptions and flags unknowns.",
      "Surfaces edge cases and regulatory risk triggers.",
      "Recommends guardrails and fallback paths.",
    ],
    metadata: [
      { label: "Bias", value: "Risk-averse" },
      { label: "Lens", value: "Evidence-first" },
      { label: "Output", value: "Safety notes" },
    ],
    stats: [
      { label: "Evidence", value: 92 },
      { label: "Risk", value: 96 },
      { label: "Speed", value: 62 },
    ],
    portraitClass: "from-sky-500/40 via-sky-400/10 to-transparent",
    accentClass: "bg-sky-400",
    barClass: "bg-gradient-to-r from-sky-400 to-cyan-300",
    badgeClass: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  },
  {
    id: "devils-advocate",
    unit: "Juror 2",
    name: "Devil's Advocate",
    role: "Counterfactual pressure tests",
    callSign: "DA",
    status: "Operational",
    tagline: "Challenges consensus to prevent blind spots and groupthink.",
    details: [
      "Introduces counterexamples and hard constraints.",
      "Stress-tests weak logic and shaky evidence.",
      "Reframes the prompt from adversarial angles.",
    ],
    metadata: [
      { label: "Bias", value: "Contrarian" },
      { label: "Lens", value: "Red-team" },
      { label: "Output", value: "Gaps found" },
    ],
    stats: [
      { label: "Evidence", value: 78 },
      { label: "Risk", value: 84 },
      { label: "Speed", value: 82 },
    ],
    portraitClass: "from-rose-500/40 via-orange-400/10 to-transparent",
    accentClass: "bg-rose-400",
    barClass: "bg-gradient-to-r from-rose-400 to-amber-300",
    badgeClass: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  },
  {
    id: "pragmatic-expert",
    unit: "Juror 3",
    name: "Pragmatic Expert",
    role: "Decision-ready synthesis",
    callSign: "PE",
    status: "Operational",
    tagline: "Turns the debate into an actionable plan with clear tradeoffs.",
    details: [
      "Balances risks with execution realities.",
      "Prioritizes next steps and owners.",
      "Delivers concise, decision-ready guidance.",
    ],
    metadata: [
      { label: "Bias", value: "Execution-focused" },
      { label: "Lens", value: "Tradeoff-aware" },
      { label: "Output", value: "Action plan" },
    ],
    stats: [
      { label: "Evidence", value: 86 },
      { label: "Risk", value: 74 },
      { label: "Speed", value: 90 },
    ],
    portraitClass: "from-emerald-500/40 via-lime-400/10 to-transparent",
    accentClass: "bg-emerald-400",
    barClass: "bg-gradient-to-r from-emerald-400 to-lime-300",
    badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  },
];

const JURY_PROTOCOLS = [
  "Consensus synthesis with dissent flags.",
  "Confidence-weighted verdict framing.",
  "Actionable next steps with tradeoffs.",
];

const JURY_DELIVERABLES = [
  { label: "Verdict", description: "Final decision with rationale." },
  { label: "Key evidence", description: "Most persuasive facts or signals." },
  { label: "Risk flags", description: "Open questions and failure modes." },
  { label: "Next actions", description: "Practical steps to move forward." },
];

type SampleQuestion = {
  id: string;
  domain: Domain;
  prompt: string;
};

type DomainSuggestion = {
  domain: Domain;
  score: number;
  evidence: string[];
};

const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  finance: [
    "loan",
    "lending",
    "credit",
    "risk",
    "portfolio",
    "investment",
    "interest",
    "rate",
    "default",
    "underwriting",
    "cash flow",
    "revenue",
    "margin",
    "profit",
    "balance sheet",
    "compliance",
    "fraud",
    "kyc",
    "aml",
    "collateral",
  ],
  healthcare: [
    "patient",
    "diagnosis",
    "clinical",
    "treatment",
    "symptom",
    "triage",
    "guideline",
    "icd",
    "medication",
    "drug",
    "dosage",
    "hospital",
    "care plan",
    "screening",
    "outcome",
    "therapy",
    "lab",
  ],
  legal: [
    "contract",
    "policy",
    "liability",
    "regulation",
    "compliance",
    "lawsuit",
    "legal",
    "jurisdiction",
    "clause",
    "statute",
    "precedent",
    "nda",
    "ip",
    "terms",
    "privacy",
    "gdpr",
    "hipaa",
  ],
  general: [
    "agi",
    "ai",
    "model",
    "models",
    "llm",
    "alignment",
    "scaling",
    "compute",
    "inference",
    "safety",
    "product",
    "strategy",
    "roadmap",
    "market",
    "startup",
    "forecast",
    "trend",
    "trends",
  ],
};

const detectDomainSuggestion = (text: string): DomainSuggestion | null => {
  const normalized = text.toLowerCase();
  const words = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return null;

  const scores = (Object.keys(DOMAIN_KEYWORDS) as Domain[]).map((domain) => {
    const keywords = DOMAIN_KEYWORDS[domain];
    let score = 0;
    const evidence: string[] = [];
    keywords.forEach((keyword) => {
      const isPhrase = keyword.includes(" ");
      const matches = words.filter((word) => word === keyword);
      if (matches.length) {
        score += matches.length * 1.5;
        if (!evidence.includes(keyword)) {
          evidence.push(keyword);
        }
      } else if (normalized.includes(keyword)) {
        score += isPhrase ? 1 : 0.5;
        if (!evidence.includes(keyword)) {
          evidence.push(keyword);
        }
      }
    });
    return { domain, score, evidence };
  });

  const sorted = scores.sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const runnerUp = sorted[1];
  if (!best || best.score <= 0) return null;

  const confidence = Math.min(1, best.score / 3.5);
  const hasGap = runnerUp ? best.score - runnerUp.score >= 0.75 : true;

  const generalScore =
    scores.find((item) => item.domain === "general")?.score ?? 0;
  const bestNonGeneral = sorted.find((item) => item.domain !== "general");
  if (
    bestNonGeneral &&
    bestNonGeneral.score < 1.5 &&
    generalScore >= 1 &&
    best.domain !== "general"
  ) {
    const generalEvidence =
      scores.find((item) => item.domain === "general")?.evidence ?? [];
    return { domain: "general", score: generalScore, evidence: generalEvidence };
  }

  if (best.domain === "general") {
    return confidence >= 0.5 ? best : null;
  }

  if (confidence < 0.6 || !hasGap) return null;

  return best;
};

type DebatePhase =
  | "idle"
  | "baseline"
  | "positions"
  | "critique"
  | "rebuttal"
  | "revision"
  | "verdict"
  | "complete"
  | "error";

type DebateState = {
  phase: DebatePhase;
  jurorStreams: Record<JurorId, string>;
  baselineFair: BaselineOutput | null;
  baselineMini: BaselineOutput | null;
  positions: Record<JurorId, JurorPosition> | null;
  critiques: Record<JurorId, Critique[]> | null;
  rebuttals: Record<JurorId, RebuttalOutput> | null;
  revisions: Record<JurorId, RevisedPosition> | null;
  verdict: ConsensusVerdict | null;
  evaluation: EvaluationOutput | null;
  coordination: CoordinationDecision | null;
  usage: Partial<Record<UsageScope, UsageSnapshot>>;
  startTime: number | null;
};

type DebateHistoryItem = {
  id: string;
  createdAt: string;
  startedAt?: number | null;
  durationMs?: number | null;
  domain: Domain;
  primaryModel?: ModelOption;
  query: string;
  baselineFair: BaselineOutput | null;
  baselineMini: BaselineOutput | null;
  baseline?: BaselineOutput | null;
  positions: Record<JurorId, JurorPosition> | null;
  critiques: Record<JurorId, Critique[]> | null;
  rebuttals: Record<JurorId, RebuttalOutput> | null;
  revisions: Record<JurorId, RevisedPosition> | null;
  verdict: ConsensusVerdict | null;
  evaluation: EvaluationOutput | null;
  coordination: CoordinationDecision | null;
  usage?: Partial<Record<UsageScope, UsageSnapshot>>;
};

type SafetyNotice = {
  title: string;
  message: string;
  suggestion: string;
};

type HistoryModelFilter = "all" | ModelOption;

const initialState: DebateState = {
  phase: "idle",
  jurorStreams: { A: "", B: "", C: "" },
  baselineFair: null,
  baselineMini: null,
  positions: null,
  critiques: null,
  rebuttals: null,
  revisions: null,
  verdict: null,
  evaluation: null,
  coordination: null,
  usage: {},
  startTime: null,
};

export default function Home() {
  const [domain, setDomain] = useState<Domain>("finance");
  const [query, setQuery] = useState("");
  const [primaryModel, setPrimaryModel] = useState<ModelOption>(
    MODEL_OPTIONS[0],
  );
  const [state, setState] = useState<DebateState>(initialState);
  const [samples, setSamples] = useState<SampleQuestion[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [history, setHistory] = useState<DebateHistoryItem[]>([]);
  const [historyModelFilter, setHistoryModelFilter] =
    useState<HistoryModelFilter>("all");
  const [suggestedDomain, setSuggestedDomain] = useState<Domain | null>(null);
  const [suggestedDomainEvidence, setSuggestedDomainEvidence] = useState<
    string[]
  >([]);
  const [suggestedDomainActive, setSuggestedDomainActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safetyNotice, setSafetyNotice] = useState<SafetyNotice | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finalElapsed, setFinalElapsed] = useState<number | null>(null);
  const lastSavedId = useRef<string | null>(null);
  const skipNextSaveRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const HISTORY_KEY = "kritarch-lite:history";
  const HISTORY_LIMIT = 10;
  const MODEL_STORAGE_KEY = "kritarch-lite:primary-model";

  useEffect(() => {
    const loadSamples = async () => {
      setSamplesLoading(true);
      try {
        const res = await fetch("/api/samples");
        if (!res.ok) return;
        const payload = (await res.json()) as {
          items: SampleQuestion[];
        };
        setSamples(payload.items ?? []);
      } catch {
        // ignore for demo
      } finally {
        setSamplesLoading(false);
      }
    };

    loadSamples();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestedDomain(null);
      setSuggestedDomainEvidence([]);
      setSuggestedDomainActive(false);
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
      }
      return;
    }

    if (suggestionTimer.current) {
      clearTimeout(suggestionTimer.current);
    }

    suggestionTimer.current = setTimeout(() => {
      const suggestion = detectDomainSuggestion(query);
      if (!suggestion) {
        setSuggestedDomain(null);
        setSuggestedDomainEvidence([]);
        setSuggestedDomainActive(false);
        return;
      }

      const shouldActivate = suggestion.domain !== domain;
      setSuggestedDomain(suggestion.domain);
      setSuggestedDomainEvidence(suggestion.evidence);
      setSuggestedDomainActive(shouldActivate);
    }, 600);

    return () => {
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
      }
    };
  }, [query, domain]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODEL_STORAGE_KEY);
      if (!stored) return;
      if (MODEL_OPTIONS.includes(stored as ModelOption)) {
        setPrimaryModel(stored as ModelOption);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DebateHistoryItem[];
      setHistory(parsed);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, primaryModel);
    } catch {
      // ignore storage errors
    }
  }, [primaryModel]);

  useEffect(() => {
    if (!state.startTime) return;
    const id = setInterval(() => {
      setElapsed(Date.now() - state.startTime!);
    }, 500);
    return () => clearInterval(id);
  }, [state.startTime]);

  const elapsedLabel = useMemo(() => {
    const totalSeconds = Math.floor((finalElapsed ?? elapsed) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [elapsed, finalElapsed]);

  const domainSamples = samples
    .filter((sample) => sample.domain === domain)
    .slice(0, 4);
  const alternateModel = getAlternateModel(primaryModel);
  const normalizedHistoryModel = (model?: ModelOption) =>
    model && MODEL_OPTIONS.includes(model) ? model : MODEL_OPTIONS[0];
  const filteredHistory =
    historyModelFilter === "all"
      ? history
      : history.filter(
          (entry) =>
            normalizedHistoryModel(entry.primaryModel) === historyModelFilter,
        );

  useEffect(() => {
    if (!state.verdict || !state.positions) return;
    if (!state.critiques && !state.coordination?.skipCritique) return;
    if (!state.revisions && !state.coordination?.skipRevision) return;
    if (state.startTime === null) return;
    if (!state.evaluation && state.phase !== "complete") return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const id = `${state.startTime ?? Date.now()}`;
    if (lastSavedId.current === id) return;
    if (history.some((entry) => entry.id === id)) {
      lastSavedId.current = id;
      return;
    }

    const entry: DebateHistoryItem = {
      id,
      createdAt: new Date().toISOString(),
      startedAt: state.startTime,
      durationMs: state.startTime ? Date.now() - state.startTime : null,
      domain,
      primaryModel,
      query,
      baselineFair: state.baselineFair,
      baselineMini: state.baselineMini,
      positions: state.positions,
      critiques: state.critiques,
      rebuttals: state.rebuttals,
      revisions: state.revisions,
      verdict: state.verdict,
      evaluation: state.evaluation,
      coordination: state.coordination,
      usage: state.usage,
    };

    const nextHistory = [entry, ...history].slice(0, HISTORY_LIMIT);
    setHistory(nextHistory);
    lastSavedId.current = id;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    } catch {
      // ignore storage errors
    }
  }, [
    state.verdict,
    state.positions,
    state.critiques,
    state.rebuttals,
    state.revisions,
    state.baselineFair,
    state.baselineMini,
    state.evaluation,
    state.phase,
    state.coordination,
    state.usage,
    state.startTime,
    domain,
    primaryModel,
    query,
    history,
  ]);

  const loadHistoryEntry = (entry: DebateHistoryItem) => {
    skipNextSaveRef.current = true;
    lastSavedId.current = entry.id;
    startTimeRef.current = null;
    const createdAtMs = entry.createdAt
      ? new Date(entry.createdAt).getTime()
      : NaN;
    const fallbackStart = entry.startedAt ?? Number(entry.id);
    const durationMs =
      entry.durationMs ??
      (Number.isFinite(fallbackStart) && Number.isFinite(createdAtMs)
        ? createdAtMs - fallbackStart
        : 0);
    setElapsed(Math.max(0, durationMs));
    setFinalElapsed(durationMs);
    setDomain(entry.domain);
    if (entry.primaryModel && MODEL_OPTIONS.includes(entry.primaryModel)) {
      setPrimaryModel(entry.primaryModel);
    }
    setQuery(entry.query);
    setState({
      phase: "complete",
      jurorStreams: { A: "", B: "", C: "" },
      baselineFair: entry.baselineFair ?? null,
      baselineMini: entry.baselineMini ?? entry.baseline ?? null,
      positions: entry.positions,
      critiques: entry.critiques,
      rebuttals: entry.rebuttals ?? null,
      revisions: entry.revisions,
      verdict: entry.verdict,
      evaluation: entry.evaluation ?? null,
      coordination: entry.coordination ?? null,
      usage: entry.usage ?? {},
      startTime: null,
    });
    setError(null);
  };

  const startDebate = async () => {
    setError(null);
    setSafetyNotice(null);
    setElapsed(0);
    setFinalElapsed(null);
    skipNextSaveRef.current = false;
    const startedAt = Date.now();
    startTimeRef.current = startedAt;
    setState({ ...initialState, phase: "baseline", startTime: startedAt });
    requestAnimationFrame(() => {
      progressRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, domain, model: primaryModel }),
      });

      if (!res.ok || !res.body) {
        let message = "Failed to start debate.";
        let payloadError: string | null = null;
        try {
          const data = await res.json();
          if (data?.error) {
            payloadError = data.error as string;
            message = payloadError;
          }
        } catch {
          // Ignore JSON parse errors and fall back to default message.
        }

        if (res.status === 403 || res.status === 503) {
          const lower = message.toLowerCase();
          const title =
            res.status === 503
              ? "Safety check temporarily unavailable"
              : lower.includes("prompt-injection")
                ? "Request blocked: prompt-injection detected"
                : "Request blocked by safety guardrails";
          const suggestion =
            res.status === 503
              ? "Please try again in a moment, or shorten the request."
              : lower.includes("prompt-injection")
                ? 'Remove meta-instructions like "ignore previous instructions" and ask the domain question directly.'
                : "Ask the question at a high level without unsafe content or requests to bypass rules.";

          setSafetyNotice({
            title,
            message: payloadError ?? message,
            suggestion,
          });
          setError(null);
          setState((prev) => ({ ...prev, phase: "error" }));
          return;
        }

        throw new Error(message);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const payload = line.replace(/^data: /, "");
          const event = JSON.parse(payload) as
            | { type: "phase"; phase: DebatePhase }
            | { type: "baseline_fair"; data: BaselineOutput }
            | { type: "baseline_mini"; data: BaselineOutput }
            | { type: "juror_delta"; juror: JurorId; delta: string }
            | { type: "coordination"; data: CoordinationDecision }
            | {
                type: "positions_complete";
                positions: Record<JurorId, JurorPosition>;
              }
            | {
                type: "critiques_complete";
                critiques: Record<JurorId, Critique[]> | null;
              }
            | {
                type: "rebuttals_complete";
                rebuttals: Record<JurorId, RebuttalOutput> | null;
              }
            | {
                type: "revisions_complete";
                revisions: Record<JurorId, RevisedPosition> | null;
              }
            | { type: "verdict"; data: ConsensusVerdict }
            | { type: "evaluation"; data: EvaluationOutput }
            | { type: "usage"; scope: UsageScope; data: UsageSnapshot }
            | { type: "complete" }
            | { type: "error"; message: string };

          setState((prev) => {
            switch (event.type) {
              case "phase":
                return { ...prev, phase: event.phase };
              case "baseline_fair":
                return { ...prev, baselineFair: event.data };
              case "baseline_mini":
                return { ...prev, baselineMini: event.data };
              case "juror_delta":
                return {
                  ...prev,
                  jurorStreams: {
                    ...prev.jurorStreams,
                    [event.juror]: prev.jurorStreams[event.juror] + event.delta,
                  },
                };
              case "positions_complete":
                return { ...prev, positions: event.positions };
              case "coordination":
                return { ...prev, coordination: event.data };
              case "critiques_complete":
                return { ...prev, critiques: event.critiques };
              case "rebuttals_complete":
                return { ...prev, rebuttals: event.rebuttals };
              case "revisions_complete":
                return { ...prev, revisions: event.revisions };
              case "verdict":
                return { ...prev, verdict: event.data };
              case "evaluation":
                return { ...prev, evaluation: event.data };
              case "usage":
                return {
                  ...prev,
                  usage: { ...prev.usage, [event.scope]: event.data },
                };
              case "complete":
                return { ...prev, phase: "complete" };
              default:
                return prev;
            }
          });

          if (event.type === "verdict") {
            const startedAt = startTimeRef.current;
            if (startedAt) {
              setFinalElapsed(Date.now() - startedAt);
            }
          }

          if (event.type === "error") {
            setError(event.message);
            setState((prev) => ({ ...prev, phase: "error" }));
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState((prev) => ({ ...prev, phase: "error" }));
    }
  };

  const debateRunning = [
    "baseline",
    "positions",
    "critique",
    "rebuttal",
    "revision",
    "verdict",
  ].includes(state.phase);
  const agreementLabel = state.coordination
    ? `${Math.round(state.coordination.agreementScore * 100)}%`
    : null;
  const critiqueSkipMessage = state.coordination?.skipCritique
    ? `Round 2 skipped (${agreementLabel} agreement).`
    : undefined;
  const revisionSkipMessage = state.coordination?.skipRevision
    ? state.coordination.skipCritique
      ? "Round 3 skipped due to high agreement."
      : "Round 3 skipped due to low-severity critiques."
    : undefined;
  const baselineFairLoading = state.phase === "baseline" && !state.baselineFair;
  const baselineMiniLoading = state.phase === "baseline" && !state.baselineMini;
  const positionsLoading = state.phase === "positions" && !state.positions;
  const critiquesLoading =
    state.phase === "critique" &&
    !state.coordination?.skipCritique &&
    !state.critiques;
  const rebuttalsLoading = state.phase === "rebuttal" && !state.rebuttals;
  const revisionsLoading =
    state.phase === "revision" &&
    !state.coordination?.skipRevision &&
    !state.revisions;
  const verdictLoading = state.phase === "verdict" && !state.verdict;
  const usageByScope = state.usage;

  const summarizeCost = (scopes: UsageScope[]) => {
    let total = 0;
    let hasUsage = false;
    let hasUnknown = false;
    for (const scope of scopes) {
      const entry = usageByScope[scope];
      if (!entry) continue;
      hasUsage = true;
      if (entry.costUsd === null || entry.costUsd === undefined) {
        hasUnknown = true;
        continue;
      }
      total += entry.costUsd;
    }

    if (!hasUsage) return { costUsd: null, hasUsage: false };
    if (hasUnknown) return { costUsd: null, hasUsage: true };
    return { costUsd: total, hasUsage: true };
  };

  const getUsageMeta = (scope: UsageScope) => {
    const entry = usageByScope[scope];
    if (!entry) return null;
    return {
      model: entry.model,
      costUsd: entry.costUsd,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      totalTokens: entry.totalTokens,
    };
  };

  const baselineFairMeta = getUsageMeta("baselineFair");
  const baselineMiniMeta = getUsageMeta("baselineMini");
  const jurorAMeta = getUsageMeta("jurorA");
  const jurorBMeta = getUsageMeta("jurorB");
  const jurorCMeta = getUsageMeta("jurorC");
  const verdictMeta = getUsageMeta("verdict");
  const evaluatorMeta = getUsageMeta("evaluator");

  const costSummaryItems = [
    {
      label: "Baseline (selected model)",
      scopes: ["baselineFair"] as UsageScope[],
    },
    {
      label: "Baseline (alternate model)",
      scopes: ["baselineMini"] as UsageScope[],
    },
    {
      label: "Juror positions",
      scopes: ["jurorA", "jurorB", "jurorC"] as UsageScope[],
    },
    {
      label: "Critiques",
      scopes: ["critiqueA", "critiqueB", "critiqueC"] as UsageScope[],
    },
    {
      label: "Rebuttals",
      scopes: ["rebuttalA", "rebuttalB", "rebuttalC"] as UsageScope[],
    },
    {
      label: "Revisions",
      scopes: ["revisionA", "revisionB", "revisionC"] as UsageScope[],
    },
    { label: "Verdict synthesis", scopes: ["verdict"] as UsageScope[] },
    { label: "Evaluator", scopes: ["evaluator"] as UsageScope[] },
  ]
    .map((item) => {
      const summary = summarizeCost(item.scopes);
      if (!summary.hasUsage) return null;
      return { label: item.label, costUsd: summary.costUsd };
    })
    .filter(
      (item): item is { label: string; costUsd: number | null } =>
        item !== null,
    );

  const totalCostSummary = summarizeCost([
    "baselineFair",
    "baselineMini",
    "jurorA",
    "jurorB",
    "jurorC",
    "critiqueA",
    "critiqueB",
    "critiqueC",
    "rebuttalA",
    "rebuttalB",
    "rebuttalC",
    "revisionA",
    "revisionB",
    "revisionC",
    "verdict",
    "evaluator",
  ]);
  const costSummary =
    costSummaryItems.length > 0
      ? {
          items: costSummaryItems,
          totalCost: totalCostSummary.hasUsage
            ? totalCostSummary.costUsd
            : null,
        }
      : null;
  const statusCopy = (() => {
    switch (state.phase) {
      case "idle":
        return "Ready when you are — enter a question to start the debate.";
      case "baseline":
        return "Baselines in progress: generating selected-model and alternate-model answers before the jury debates.";
      case "positions":
        return "Round 1: Jurors A, B, and C are drafting independent positions.";
      case "critique":
        return state.coordination?.skipCritique
          ? "Round 2 skipped — high agreement in Round 1. Advancing toward the verdict."
          : "Round 2: Jurors are critiquing each other's positions and surfacing gaps.";
      case "rebuttal":
        return "Deep deliberation: Jurors are writing rebuttals — conceding, defending, and refining positions.";
      case "revision":
        return state.coordination?.skipRevision
          ? state.coordination.skipCritique
            ? "Round 3 skipped — strong alignment kept revisions unnecessary."
            : "Round 3 skipped — critiques were low severity. Advancing toward the verdict."
          : "Round 3: Jurors are revising positions based on critiques.";
      case "verdict":
        return "Verdict synthesis: the Chief Justice is producing the consensus verdict and flags.";
      case "complete":
        return `Debate complete in ${elapsedLabel}. Review the verdict, evaluator scorecard, and costs.`;
      case "error":
        return "Debate failed. Try a shorter prompt or check your API key.";
      default:
        return "Preparing debate…";
    }
  })();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight">
              Kritarch Lite — AI Jury
            </h1>
            <div className="text-xs text-zinc-100">Elapsed: {elapsedLabel}</div>
          </div>
          <p className="text-zinc-100">
            Hard questions deserve more than one perspective. Kritarch Lite puts
            three AI agents on your problem — each analyzes independently,
            critiques the others, and they converge on a verdict. You get
            structured reasoning, not a single guess.
          </p>
          <div className="flex flex-wrap gap-3 text-sm font-semibold text-blue-200">
            <a
              href="#debate-entry"
              className="underline decoration-blue-400/50 underline-offset-4 hover:text-blue-100"
            >
              Jump to debate
            </a>
            <a
              href="#glossary-heading"
              className="underline decoration-blue-400/50 underline-offset-4 hover:text-blue-100"
            >
              Jump to glossary
            </a>
          </div>
        </header>

        <section
          aria-labelledby="agent-roster-heading"
          className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70 p-6"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_55%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60"
          />
          <div className="relative">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
                Command center
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id="agent-roster-heading"
                  className="text-lg font-semibold text-white"
                >
                  Agent roster
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-1 font-mono uppercase tracking-[0.25em] text-zinc-300">
                    Evidence
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-1 font-mono uppercase tracking-[0.25em] text-zinc-300">
                    Risk
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-1 font-mono uppercase tracking-[0.25em] text-zinc-300">
                    Speed
                  </span>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-zinc-200">
                Three specialists debate every prompt. Together they deliver a
                verdict that is safer, sharper, and ready for action.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {AGENT_PROFILES.map((agent) => (
                <article
                  key={agent.id}
                  className="flex h-full flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-[0_0_30px_rgba(6,10,20,0.45)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`relative h-12 w-12 rounded-lg border border-zinc-700 bg-gradient-to-br ${agent.portraitClass}`}
                        aria-hidden="true"
                      >
                        <div className="absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_65%)]" />
                        <div className="relative flex h-full w-full items-center justify-center rounded-lg bg-zinc-950/80 text-xs font-semibold text-white">
                          {agent.callSign}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-100">
                          {agent.unit}
                        </p>
                        <h3 className="text-base font-semibold text-white">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-zinc-100">{agent.role}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${agent.badgeClass}`}
                    >
                      {agent.status}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-200">{agent.tagline}</p>

                  <ul className="grid gap-2 text-xs text-zinc-200">
                    {agent.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2">
                        <span
                          className={`mt-1 h-1.5 w-1.5 rounded-full ${agent.accentClass}`}
                          aria-hidden="true"
                        />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {agent.metadata.map((item) => (
                        <span
                          key={item.label}
                          className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-[11px] text-zinc-100"
                        >
                          <span className="text-zinc-100">{item.label}:</span>{" "}
                          {item.value}
                        </span>
                      ))}
                    </div>
                    <div className="grid gap-2">
                      {agent.stats.map((stat) => (
                        <div
                          key={stat.label}
                          className="flex items-center gap-3 text-[11px] text-zinc-100"
                        >
                          <span className="w-20 font-mono uppercase tracking-[0.25em] text-zinc-100">
                            {stat.label}
                          </span>
                          <div className="h-1.5 flex-1 rounded-full bg-zinc-800">
                            <div
                              className={`h-full rounded-full ${agent.barClass}`}
                              style={{ width: `${stat.value}%` }}
                            />
                          </div>
                          <span className="w-6 text-right text-zinc-100">
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="jury-chamber-heading"
          className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70 p-6"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.22),transparent_58%)]"
          />
          <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-200">
                Jury chamber
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h2
                  id="jury-chamber-heading"
                  className="text-lg font-semibold text-white"
                >
                  The jury issues the final verdict
                </h2>
                <span className="rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-200">
                  Chief Justice
                </span>
              </div>
              <p className="max-w-xl text-sm text-zinc-200">
                After the three agents debate, the Chief Justice synthesizes
                their positions into one decision-ready verdict. If there is
                disagreement, it is called out explicitly — no silent averages.
              </p>
              <ul className="grid gap-2 text-sm text-zinc-200">
                {JURY_PROTOCOLS.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-300"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1 font-mono uppercase tracking-[0.25em] text-zinc-300">
                    Juror A
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1 font-mono uppercase tracking-[0.25em] text-zinc-300">
                    Juror B
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1 font-mono uppercase tracking-[0.25em] text-zinc-300">
                    Juror C
                  </span>
                  <span aria-hidden="true" className="text-xs text-zinc-500">
                    →
                  </span>
                  <span className="rounded-full border border-teal-500/50 bg-teal-500/10 px-2 py-1 font-mono uppercase tracking-[0.25em] text-teal-200">
                    Chief Justice
                  </span>
                  <span aria-hidden="true" className="text-xs text-zinc-500">
                    →
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1 font-mono uppercase tracking-[0.25em] text-zinc-300">
                    Verdict
                  </span>
                </div>
                <div className="mt-3 rounded-lg border border-teal-500/30 bg-teal-500/5 px-3 py-2">
                  <p className="text-[12px] uppercase tracking-[0.3em] text-teal-100">
                    Verdict payload
                  </p>
                  <ul className="mt-2 grid gap-2 text-sm text-zinc-200">
                    {JURY_DELIVERABLES.map((item) => (
                      <li key={item.label} className="flex gap-2">
                        <span className="text-teal-200">{item.label}:</span>
                        <span className="text-zinc-100">
                          {item.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-100">
                  Jury charter
                </p>
                <div className="mt-3 grid gap-2 text-sm text-zinc-200">
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-500"
                      aria-hidden="true"
                    />
                    <span>Balanced: evidence, risk, and actionability.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-500"
                      aria-hidden="true"
                    />
                    <span>
                      Transparent: dissent and low-confidence points are
                      highlighted.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-500"
                      aria-hidden="true"
                    />
                    <span>
                      Decision-ready: outputs are scoped for real-world
                      approval.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="use-cases-heading"
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <div className="flex items-center justify-between">
            <h2
              id="use-cases-heading"
              className="text-sm font-semibold text-white"
            >
              Use cases
            </h2>
            <span className="text-xs text-zinc-100">High-stakes domains</span>
          </div>
          <ul className="mt-3 grid gap-3 md:grid-cols-3">
            <li className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs font-semibold uppercase text-zinc-100">
                Finance
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Credit, risk, and compliance decisions.
              </p>
            </li>
            <li className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs font-semibold uppercase text-zinc-100">
                Healthcare
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Guideline comparisons and triage framing.
              </p>
            </li>
            <li className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs font-semibold uppercase text-zinc-100">
                Legal
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Policy compliance and argument mapping.
              </p>
            </li>
          </ul>
          <p className="mt-3 text-sm text-zinc-100">
            Finance lending example: Go / No-Go lending decisions that enforce
            government SOPs and company SOPs.
          </p>
        </section>

        <section
          aria-labelledby="team-analogy-heading"
          className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
        >
          <h2
            id="team-analogy-heading"
            className="text-sm font-semibold uppercase tracking-wide text-zinc-200"
          >
            Human team analogy
          </h2>
          <p className="mt-2 text-sm text-zinc-100">
            Teams delegate research to members and seniors, regroup to compare
            findings, and stakeholders make the final call. Kritarch Lite
            mirrors that flow with AI agents — faster, broader in scope, 24/7 —
            while keeping a human in the loop.
          </p>
        </section>

        <section
          id="debate-entry"
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <div className="flex flex-wrap gap-3">
            {DOMAINS.map((item) => {
              const isSuggested =
                suggestedDomainActive && suggestedDomain === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDomain(item.id)}
                  className={`rounded-lg border px-4 py-2 text-base transition ${
                    domain === item.id
                      ? "border-blue-400 bg-blue-500/10 text-blue-200"
                      : isSuggested
                        ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                        : "border-zinc-700 text-zinc-100"
                  }`}
                  aria-pressed={domain === item.id}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {isSuggested ? (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                        Suggested
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          {suggestedDomainActive && suggestedDomain ? (
            <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                    Domain suggestion
                  </p>
                  <p className="mt-1">
                    Looks like a{" "}
                    <span className="font-semibold">
                      {
                        DOMAINS.find((entry) => entry.id === suggestedDomain)
                          ?.label
                      }
                    </span>{" "}
                    question.
                  </p>
                  {suggestedDomainEvidence.length ? (
                    <p className="mt-1 text-xs text-emerald-200/80">
                      Signals: {suggestedDomainEvidence.slice(0, 4).join(", ")}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDomain(suggestedDomain);
                    setSuggestedDomainActive(false);
                  }}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100"
                >
                  Apply
                </button>
              </div>
            </div>
          ) : null}

          {samplesLoading ? (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100">
              Loading samples…
            </div>
          ) : domainSamples.length ? (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-sm uppercase text-zinc-100">Sample prompts</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {domainSamples.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => setQuery(sample.prompt)}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-100 hover:border-blue-400 hover:text-blue-200"
                  >
                    {sample.prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3">
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-base text-zinc-100"
              placeholder="Enter your question or claim..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={2000}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="model-select"
                className="text-sm font-semibold text-zinc-100"
              >
                Model
              </label>
              <select
                id="model-select"
                value={primaryModel}
                onChange={(event) =>
                  setPrimaryModel(event.target.value as ModelOption)
                }
                disabled={debateRunning}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {MODEL_OPTIONS.map((model) => (
                  <option key={model} value={model}>
                    {model === "gpt-5.2"
                      ? "gpt-5.2 (quality)"
                      : "gpt-5-mini (fast + lower cost)"}
                  </option>
                ))}
              </select>
              <span className="text-sm text-zinc-100">
                Alternate baseline: {alternateModel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startDebate}
                disabled={!query || debateRunning}
                className="rounded-lg bg-blue-500 px-4 py-2 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Debate
              </button>
              <span className="text-sm text-zinc-100">
                Status: {state.phase}
              </span>
            </div>
            {safetyNotice ? (
              <div
                role="alert"
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100"
              >
                <p className="font-semibold">{safetyNotice.title}</p>
                <p className="mt-1 text-amber-200">{safetyNotice.message}</p>
                <p className="mt-2 text-amber-200">
                  Try rephrasing:{" "}
                  <span className="font-semibold text-amber-100">
                    {safetyNotice.suggestion}
                  </span>
                </p>
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        </section>

        <section
          ref={progressRef}
          id="debate-progress"
          className={`scroll-mt-24 transition-opacity duration-500 ${
            state.phase === "idle" ? "opacity-0" : "opacity-100"
          }`}
        >
          <RoundProgress
            phase={state.phase}
            deepDeliberation={state.coordination?.deepDeliberation}
          />
          <div className="mt-2 flex items-center justify-between text-sm text-zinc-200">
            <span>{statusCopy}</span>
            <span>Elapsed: {elapsedLabel}</span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-4">
            <div className="transition-all duration-500 ease-out">
              <JurorPanel
                title="Juror A"
                subtitle="Cautious Analyst"
                accentClass="bg-blue-400"
                streamText={state.jurorStreams.A}
                position={state.positions?.A.position}
                confidence={state.positions?.A.confidence}
                model={jurorAMeta?.model}
                costUsd={jurorAMeta?.costUsd}
                inputTokens={jurorAMeta?.inputTokens}
                outputTokens={jurorAMeta?.outputTokens}
                totalTokens={jurorAMeta?.totalTokens}
                loading={positionsLoading}
                loadingLabel="Round 1 in progress"
              />
            </div>
            <div className="transition-all duration-500 ease-out">
              <CritiqueList
                critiques={state.critiques?.A}
                skipped={state.coordination?.skipCritique}
                skipMessage={critiqueSkipMessage}
                loading={critiquesLoading}
              />
            </div>
            {state.coordination?.deepDeliberation ? (
              <div className="transition-all duration-500 ease-out">
                <RebuttalPanel
                  rebuttal={state.rebuttals?.A}
                  loading={rebuttalsLoading}
                />
              </div>
            ) : null}
            <div className="transition-all duration-500 ease-out">
              <RevisionPanel
                revision={state.revisions?.A}
                skipped={state.coordination?.skipRevision}
                skipMessage={revisionSkipMessage}
                loading={revisionsLoading}
              />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="transition-all duration-500 ease-out">
              <JurorPanel
                title="Juror B"
                subtitle="Devil's Advocate"
                accentClass="bg-red-400"
                streamText={state.jurorStreams.B}
                position={state.positions?.B.position}
                confidence={state.positions?.B.confidence}
                model={jurorBMeta?.model}
                costUsd={jurorBMeta?.costUsd}
                inputTokens={jurorBMeta?.inputTokens}
                outputTokens={jurorBMeta?.outputTokens}
                totalTokens={jurorBMeta?.totalTokens}
                loading={positionsLoading}
                loadingLabel="Round 1 in progress"
              />
            </div>
            <div className="transition-all duration-500 ease-out">
              <CritiqueList
                critiques={state.critiques?.B}
                skipped={state.coordination?.skipCritique}
                skipMessage={critiqueSkipMessage}
                loading={critiquesLoading}
              />
            </div>
            {state.coordination?.deepDeliberation ? (
              <div className="transition-all duration-500 ease-out">
                <RebuttalPanel
                  rebuttal={state.rebuttals?.B}
                  loading={rebuttalsLoading}
                />
              </div>
            ) : null}
            <div className="transition-all duration-500 ease-out">
              <RevisionPanel
                revision={state.revisions?.B}
                skipped={state.coordination?.skipRevision}
                skipMessage={revisionSkipMessage}
                loading={revisionsLoading}
              />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="transition-all duration-500 ease-out">
              <JurorPanel
                title="Juror C"
                subtitle="Pragmatic Expert"
                accentClass="bg-emerald-400"
                streamText={state.jurorStreams.C}
                position={state.positions?.C.position}
                confidence={state.positions?.C.confidence}
                model={jurorCMeta?.model}
                costUsd={jurorCMeta?.costUsd}
                inputTokens={jurorCMeta?.inputTokens}
                outputTokens={jurorCMeta?.outputTokens}
                totalTokens={jurorCMeta?.totalTokens}
                loading={positionsLoading}
                loadingLabel="Round 1 in progress"
              />
            </div>
            <div className="transition-all duration-500 ease-out">
              <CritiqueList
                critiques={state.critiques?.C}
                skipped={state.coordination?.skipCritique}
                skipMessage={critiqueSkipMessage}
                loading={critiquesLoading}
              />
            </div>
            {state.coordination?.deepDeliberation ? (
              <div className="transition-all duration-500 ease-out">
                <RebuttalPanel
                  rebuttal={state.rebuttals?.C}
                  loading={rebuttalsLoading}
                />
              </div>
            ) : null}
            <div className="transition-all duration-500 ease-out">
              <RevisionPanel
                revision={state.revisions?.C}
                skipped={state.coordination?.skipRevision}
                skipMessage={revisionSkipMessage}
                loading={revisionsLoading}
              />
            </div>
          </div>
        </section>

        <div
          className={`transition-opacity duration-500 ${
            ["verdict", "complete"].includes(state.phase)
              ? "opacity-100"
              : "opacity-0"
          }`}
        >
          <div className="mb-3 rounded-lg border border-sky-500/40 bg-sky-500/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-200">
              Why this wins
            </p>
            <p className="mt-1 text-sm text-sky-100">
              Multi-agent consensus keeps dissent visible and delivers
              decision-ready outputs.
            </p>
          </div>
          <VerdictPanel
            verdict={state.verdict}
            model={verdictMeta?.model}
            costUsd={verdictMeta?.costUsd}
            inputTokens={verdictMeta?.inputTokens}
            outputTokens={verdictMeta?.outputTokens}
            totalTokens={verdictMeta?.totalTokens}
            loading={verdictLoading}
          />
        </div>

        <div
          className={`transition-opacity duration-500 ${
            state.verdict ? "opacity-100" : "opacity-0"
          }`}
        >
          <ComparisonPanel
            baselineFair={state.baselineFair}
            baselineMini={state.baselineMini}
            verdict={state.verdict}
            evaluation={state.evaluation}
            loadingBaselineFair={baselineFairLoading}
            loadingBaselineMini={baselineMiniLoading}
            baselineFairMeta={baselineFairMeta}
            baselineMiniMeta={baselineMiniMeta}
            evaluatorMeta={evaluatorMeta}
            costSummary={costSummary}
          />
        </div>

        {history.length ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-base font-semibold text-white">
                  Debate History
                </h2>
                <div className="flex items-center gap-2 text-xs uppercase text-zinc-100">
                  <span>Filter</span>
                  <div className="flex items-center gap-2">
                    {(["all", ...MODEL_OPTIONS] as const).map((option) => {
                      const isActive = historyModelFilter === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setHistoryModelFilter(option)}
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${
                            isActive
                              ? "border-blue-400 bg-blue-500/10 text-blue-200"
                              : "border-zinc-800 text-zinc-100"
                          }`}
                        >
                          {option === "all" ? "All" : option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <span className="text-sm text-zinc-500">
                {filteredHistory.length} / {history.length}
              </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {filteredHistory.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => loadHistoryEntry(entry)}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left text-sm text-zinc-100 hover:border-blue-400"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase text-zinc-200">
                    <div className="flex items-center gap-2">
                      <span>{entry.domain}</span>
                      <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-200">
                        Model: {normalizedHistoryModel(entry.primaryModel)}
                      </span>
                    </div>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-200">{entry.query}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section
          aria-labelledby="glossary-heading"
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <div className="flex items-center justify-between">
            <h2
              id="glossary-heading"
              className="text-sm font-semibold text-white"
            >
              Glossary
            </h2>
            <span className="text-xs text-zinc-100">Key terms</span>
          </div>
          <dl className="mt-3 grid gap-3 md:grid-cols-2">
            {GLOSSARY_TERMS.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
              >
                <dt
                  className={`text-[12px] font-semibold uppercase text-zinc-100`}
                >
                  {item.term}
                </dt>
                <dd className="mt-1 text-sm text-zinc-300">
                  {item.description}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}

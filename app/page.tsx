"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BaselineOutput,
  ConsensusVerdict,
  Critique,
  EvaluationOutput,
  JurorPosition,
  RevisedPosition,
} from "@/lib/agents/schemas";
import type { CoordinationDecision, Domain, JurorId } from "@/lib/types";
import { RoundProgress } from "@/components/round-progress";
import { JurorPanel } from "@/components/juror-panel";
import { VerdictPanel } from "@/components/verdict-panel";
import { CritiqueList } from "@/components/critique-list";
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
    description: "Single-model answer before the jury debates.",
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
      "Pipeline steps: baseline, positions, critique, revision, verdict.",
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
    description: "Independent scoring that compares baseline vs jury output.",
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
      "Fast-tracks when agreement is high or critiques are low severity.",
  },
];

type SampleQuestion = {
  id: string;
  domain: Domain;
  prompt: string;
};

type DebatePhase =
  | "idle"
  | "baseline"
  | "positions"
  | "critique"
  | "revision"
  | "verdict"
  | "complete"
  | "error";

type DebateState = {
  phase: DebatePhase;
  jurorStreams: Record<JurorId, string>;
  baseline: BaselineOutput | null;
  positions: Record<JurorId, JurorPosition> | null;
  critiques: Record<JurorId, Critique[]> | null;
  revisions: Record<JurorId, RevisedPosition> | null;
  verdict: ConsensusVerdict | null;
  evaluation: EvaluationOutput | null;
  coordination: CoordinationDecision | null;
  startTime: number | null;
};

type DebateHistoryItem = {
  id: string;
  createdAt: string;
  startedAt?: number | null;
  durationMs?: number | null;
  domain: Domain;
  query: string;
  baseline: BaselineOutput | null;
  positions: Record<JurorId, JurorPosition> | null;
  critiques: Record<JurorId, Critique[]> | null;
  revisions: Record<JurorId, RevisedPosition> | null;
  verdict: ConsensusVerdict | null;
  evaluation: EvaluationOutput | null;
  coordination: CoordinationDecision | null;
};

const initialState: DebateState = {
  phase: "idle",
  jurorStreams: { A: "", B: "", C: "" },
  baseline: null,
  positions: null,
  critiques: null,
  revisions: null,
  verdict: null,
  evaluation: null,
  coordination: null,
  startTime: null,
};

export default function Home() {
  const [domain, setDomain] = useState<Domain>("finance");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<DebateState>(initialState);
  const [samples, setSamples] = useState<SampleQuestion[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [history, setHistory] = useState<DebateHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finalElapsed, setFinalElapsed] = useState<number | null>(null);
  const lastSavedId = useRef<string | null>(null);
  const skipNextSaveRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const HISTORY_KEY = "kritarch-lite:history";
  const HISTORY_LIMIT = 10;

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
      query,
      baseline: state.baseline,
      positions: state.positions,
      critiques: state.critiques,
      revisions: state.revisions,
      verdict: state.verdict,
      evaluation: state.evaluation,
      coordination: state.coordination,
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
    state.revisions,
    state.baseline,
    state.evaluation,
    state.phase,
    state.coordination,
    state.startTime,
    domain,
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
    setQuery(entry.query);
    setState({
      phase: "complete",
      jurorStreams: { A: "", B: "", C: "" },
      baseline: entry.baseline,
      positions: entry.positions,
      critiques: entry.critiques,
      revisions: entry.revisions,
      verdict: entry.verdict,
      evaluation: entry.evaluation ?? null,
      coordination: entry.coordination ?? null,
      startTime: null,
    });
    setError(null);
  };

  const startDebate = async () => {
    setError(null);
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
        body: JSON.stringify({ query, domain }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to start debate.");
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
            | { type: "baseline"; data: BaselineOutput }
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
                type: "revisions_complete";
                revisions: Record<JurorId, RevisedPosition> | null;
              }
            | { type: "verdict"; data: ConsensusVerdict }
            | { type: "evaluation"; data: EvaluationOutput }
            | { type: "complete" }
            | { type: "error"; message: string };

          setState((prev) => {
            switch (event.type) {
              case "phase":
                return { ...prev, phase: event.phase };
              case "baseline":
                return { ...prev, baseline: event.data };
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
              case "revisions_complete":
                return { ...prev, revisions: event.revisions };
              case "verdict":
                return { ...prev, verdict: event.data };
              case "evaluation":
                return { ...prev, evaluation: event.data };
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
  const baselineLoading = state.phase === "baseline" && !state.baseline;
  const positionsLoading = state.phase === "positions" && !state.positions;
  const critiquesLoading =
    state.phase === "critique" &&
    !state.coordination?.skipCritique &&
    !state.critiques;
  const revisionsLoading =
    state.phase === "revision" &&
    !state.coordination?.skipRevision &&
    !state.revisions;
  const verdictLoading = state.phase === "verdict" && !state.verdict;

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
            Watch jurors debate, critique, and converge on a consensus verdict
            in real time.
          </p>
          <a
            href="#glossary-heading"
            className="text-sm font-semibold text-blue-200 underline decoration-blue-400/50 underline-offset-4 hover:text-blue-100"
          >
            Jump to glossary
          </a>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-wrap gap-3">
            {DOMAINS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDomain(item.id)}
                className={`rounded-lg border px-4 py-2 text-base ${
                  domain === item.id
                    ? "border-blue-400 bg-blue-500/10 text-blue-200"
                    : "border-zinc-700 text-zinc-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

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
            />
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
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        </section>

        {history.length ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                Debate History
              </h2>
              <span className="text-sm text-zinc-500">
                Last {HISTORY_LIMIT}
              </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => loadHistoryEntry(entry)}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left text-sm text-zinc-100 hover:border-blue-400"
                >
                  <div className="flex items-center justify-between text-xs uppercase text-zinc-500">
                    <span>{entry.domain}</span>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-200">{entry.query}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section
          ref={progressRef}
          id="debate-progress"
          className={`scroll-mt-24 transition-opacity duration-500 ${
            state.phase === "idle" ? "opacity-0" : "opacity-100"
          }`}
        >
          <RoundProgress phase={state.phase} />
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
            <span>
              {state.phase === "complete"
                ? `Completed in ${elapsedLabel}`
                : debateRunning
                  ? "Debate in progress…"
                  : state.phase === "error"
                    ? "Debate failed."
                    : "Preparing debate…"}
            </span>
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
          <VerdictPanel verdict={state.verdict} loading={verdictLoading} />
        </div>

        <div
          className={`transition-opacity duration-500 ${
            state.verdict ? "opacity-100" : "opacity-0"
          }`}
        >
          <ComparisonPanel
            baseline={state.baseline}
            verdict={state.verdict}
            evaluation={state.evaluation}
            loadingBaseline={baselineLoading}
          />
        </div>

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
                  className={`text-[11px] font-semibold uppercase text-zinc-100`}
                >
                  {item.term}
                </dt>
                <dd className="mt-1 text-xs text-zinc-300">
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

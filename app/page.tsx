"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  BaselineOutput,
  ConsensusVerdict,
  Critique,
  JurorPosition,
  RevisedPosition,
} from "@/lib/agents/schemas";
import type { Domain, JurorId } from "@/lib/types";
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
  startTime: number | null;
};

const initialState: DebateState = {
  phase: "idle",
  jurorStreams: { A: "", B: "", C: "" },
  baseline: null,
  positions: null,
  critiques: null,
  revisions: null,
  verdict: null,
  startTime: null,
};

export default function Home() {
  const [domain, setDomain] = useState<Domain>("finance");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<DebateState>(initialState);
  const [samples, setSamples] = useState<SampleQuestion[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

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
    if (!state.startTime) return;
    const id = setInterval(() => {
      setElapsed(Date.now() - state.startTime!);
    }, 500);
    return () => clearInterval(id);
  }, [state.startTime]);

  const elapsedLabel = useMemo(() => {
    const totalSeconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [elapsed]);

  const domainSamples = samples.filter((sample) => sample.domain === domain).slice(0, 4);

  const startDebate = async () => {
    setError(null);
    setElapsed(0);
    setState({ ...initialState, phase: "baseline", startTime: Date.now() });

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
            | { type: "positions_complete"; positions: Record<JurorId, JurorPosition> }
            | { type: "critiques_complete"; critiques: Record<JurorId, Critique[]> }
            | { type: "revisions_complete"; revisions: Record<JurorId, RevisedPosition> }
            | { type: "verdict"; data: ConsensusVerdict }
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
              case "critiques_complete":
                return { ...prev, critiques: event.critiques };
              case "revisions_complete":
                return { ...prev, revisions: event.revisions };
              case "verdict":
                return { ...prev, verdict: event.data };
              case "complete":
                return { ...prev, phase: "complete" };
              default:
                return prev;
            }
          });

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

  const debateRunning = ["baseline", "positions", "critique", "revision", "verdict"].includes(
    state.phase
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight">Kritarch Lite — AI Jury</h1>
            <div className="text-xs text-zinc-400">Elapsed: {elapsedLabel}</div>
          </div>
          <p className="text-zinc-400">
            Watch jurors debate, critique, and converge on a consensus verdict in real time.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-wrap gap-3">
            {DOMAINS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDomain(item.id)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  domain === item.id
                    ? "border-blue-400 bg-blue-500/10 text-blue-200"
                    : "border-zinc-700 text-zinc-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {samplesLoading ? (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500">
              Loading samples…
            </div>
          ) : domainSamples.length ? (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase text-zinc-500">Sample prompts</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {domainSamples.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => setQuery(sample.prompt)}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-blue-400 hover:text-blue-200"
                  >
                    {sample.prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3">
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100"
              placeholder="Enter your question or claim..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startDebate}
                disabled={!query || debateRunning}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Debate
              </button>
              <span className="text-xs text-zinc-400">Status: {state.phase}</span>
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        </section>

        <div
          className={`transition-opacity duration-500 ${
            state.phase === "idle" ? "opacity-0" : "opacity-100"
          }`}
        >
          <RoundProgress phase={state.phase} />
        </div>

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
              />
            </div>
            <div className="transition-all duration-500 ease-out">
              <CritiqueList critiques={state.critiques?.A} />
            </div>
            <div className="transition-all duration-500 ease-out">
              <RevisionPanel revision={state.revisions?.A} />
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
              />
            </div>
            <div className="transition-all duration-500 ease-out">
              <CritiqueList critiques={state.critiques?.B} />
            </div>
            <div className="transition-all duration-500 ease-out">
              <RevisionPanel revision={state.revisions?.B} />
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
              />
            </div>
            <div className="transition-all duration-500 ease-out">
              <CritiqueList critiques={state.critiques?.C} />
            </div>
            <div className="transition-all duration-500 ease-out">
              <RevisionPanel revision={state.revisions?.C} />
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
          <VerdictPanel verdict={state.verdict} />
        </div>

        <div
          className={`transition-opacity duration-500 ${
            state.verdict ? "opacity-100" : "opacity-0"
          }`}
        >
          <ComparisonPanel baseline={state.baseline} verdict={state.verdict} />
        </div>
      </main>
    </div>
  );
}

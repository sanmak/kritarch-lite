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

type PhaseEntry = { id: Exclude<DebatePhase, "idle" | "error">; label: string };

const ALL_PHASES: PhaseEntry[] = [
  { id: "baseline", label: "Baselines" },
  { id: "positions", label: "Round 1" },
  { id: "critique", label: "Round 2" },
  { id: "rebuttal", label: "Rebuttal" },
  { id: "revision", label: "Round 3" },
  { id: "verdict", label: "Verdict" },
  { id: "complete", label: "Complete" },
];

const isActiveOrComplete = (
  current: DebatePhase,
  phase: DebatePhase,
  phases: PhaseEntry[]
) => {
  const order = phases.map((item) => item.id);
  const currentIndex = order.indexOf(current as PhaseEntry["id"]);
  const phaseIndex = order.indexOf(phase as PhaseEntry["id"]);
  return phaseIndex <= currentIndex;
};

export type RoundProgressProps = {
  phase: DebatePhase;
  deepDeliberation?: boolean;
};

export function RoundProgress({ phase, deepDeliberation }: RoundProgressProps) {
  const phases = deepDeliberation
    ? ALL_PHASES
    : ALL_PHASES.filter((p) => p.id !== "rebuttal");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
        {phases.map((item) => {
          const active = isActiveOrComplete(phase, item.id, phases);
          const isCurrent = phase === item.id && phase !== "complete";
          return (
            <div key={item.id} className="flex items-center gap-2">
              {isCurrent ? (
                <span
                  className="inline-flex h-2.5 w-2.5 animate-spin rounded-full border border-blue-400 border-t-transparent"
                  aria-hidden="true"
                />
              ) : (
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    active ? "bg-blue-400" : "bg-zinc-700"
                  }`}
                />
              )}
              <span className={active ? "text-zinc-100" : "text-zinc-500"}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

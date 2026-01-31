type DebatePhase =
  | "idle"
  | "baseline"
  | "positions"
  | "critique"
  | "revision"
  | "verdict"
  | "complete"
  | "error";

const PHASES: { id: Exclude<DebatePhase, "idle" | "error">; label: string }[] = [
  { id: "baseline", label: "Baseline" },
  { id: "positions", label: "Round 1" },
  { id: "critique", label: "Round 2" },
  { id: "revision", label: "Round 3" },
  { id: "verdict", label: "Verdict" },
  { id: "complete", label: "Complete" },
];

const isActiveOrComplete = (current: DebatePhase, phase: DebatePhase) => {
  const order = PHASES.map((item) => item.id);
  const currentIndex = order.indexOf(current as (typeof PHASES)[number]["id"]);
  const phaseIndex = order.indexOf(phase as (typeof PHASES)[number]["id"]);
  return phaseIndex <= currentIndex;
};

export type RoundProgressProps = {
  phase: DebatePhase;
};

export function RoundProgress({ phase }: RoundProgressProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
        {PHASES.map((item) => {
          const active = isActiveOrComplete(phase, item.id);
          return (
            <div key={item.id} className="flex items-center gap-2">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  active ? "bg-blue-400" : "bg-zinc-700"
                }`}
              />
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

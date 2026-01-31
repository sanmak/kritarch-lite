type Critique = {
  targetJuror: string;
  agreements: string[];
  challenges: { point: string; counterargument: string; severity: string }[];
  missingPerspectives: string[];
  overallAssessment: string;
};

type CritiqueListProps = {
  critiques?: Critique[] | null;
  skipped?: boolean;
  skipMessage?: string;
};

const severityClasses: Record<string, string> = {
  minor: "border-blue-500/40 text-blue-200",
  moderate: "border-amber-500/40 text-amber-200",
  major: "border-red-500/40 text-red-200",
};

export function CritiqueList({ critiques, skipped, skipMessage }: CritiqueListProps) {
  if (skipped) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500">
        {skipMessage ?? "Round 2 skipped due to high agreement."}
      </div>
    );
  }
  if (!critiques || critiques.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500">
        Critiques will appear here after Round 2.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {critiques.map((critique, index) => (
        <div
          key={`${critique.targetJuror}-${index}`}
          className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="uppercase text-[10px] tracking-wide text-zinc-500">
              Critique on {critique.targetJuror}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${
                severityClasses[critique.overallAssessment] ??
                "border-zinc-700 text-zinc-300"
              }`}
            >
              {critique.overallAssessment}
            </span>
          </div>
          <div className="mt-2 space-y-2 text-xs text-zinc-300">
            {critique.challenges.map((challenge, idx) => (
              <div key={`${challenge.point}-${idx}`}>
                <p className="text-zinc-200">• {challenge.point}</p>
                <p className="text-zinc-500">{challenge.counterargument}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

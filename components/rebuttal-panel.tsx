import { LoadingIndicator } from "@/components/loading-indicator";

type RebuttalOutput = {
  concessions: string[];
  defenses: string[];
  refinedPosition: string;
  refinedSummary: string;
};

type RebuttalPanelProps = {
  rebuttal?: RebuttalOutput | null;
  loading?: boolean;
};

export function RebuttalPanel({ rebuttal, loading }: RebuttalPanelProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
        <LoadingIndicator label="Rebuttal in progress" />
      </div>
    );
  }
  if (!rebuttal) {
    return null;
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase text-zinc-500">Refined position</span>
        <span className="text-zinc-200">{rebuttal.refinedPosition}</span>
      </div>
      <p className="mt-2 text-zinc-200">{rebuttal.refinedSummary}</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-zinc-500">Concessions</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {rebuttal.concessions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Defenses</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {rebuttal.defenses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

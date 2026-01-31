import { LoadingIndicator } from "@/components/loading-indicator";

type RevisedPosition = {
  originalPosition: string;
  revisedPosition: string;
  positionChanged: boolean;
  confidence: number;
  summary: string;
  concessions: string[];
  rebuttals: string[];
};

type RevisionPanelProps = {
  revision?: RevisedPosition | null;
  skipped?: boolean;
  skipMessage?: string;
  loading?: boolean;
};

export function RevisionPanel({
  revision,
  skipped,
  skipMessage,
  loading,
}: RevisionPanelProps) {
  if (skipped) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100">
        {skipMessage ?? "Round 3 skipped due to high agreement."}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
        <LoadingIndicator label="Round 3 in progress" />
      </div>
    );
  }
  if (!revision) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100">
        Revisions will appear here after Round 3.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase text-zinc-500">Original</span>
        <span className="text-zinc-200">{revision.originalPosition}</span>
        <span className="text-xs uppercase text-zinc-500">Revised</span>
        <span className="text-zinc-200">{revision.revisedPosition}</span>
      </div>
      <p className="mt-2 text-zinc-200">{revision.summary}</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-zinc-500">Concessions</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {revision.concessions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Rebuttals</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {revision.rebuttals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-2 text-xs uppercase text-zinc-500">
        Confidence: {(revision.confidence * 100).toFixed(0)}%
      </p>
    </div>
  );
}

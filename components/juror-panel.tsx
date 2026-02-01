import { LoadingIndicator } from "@/components/loading-indicator";
import { UsageMeta } from "@/components/usage-meta";

type Position = "support" | "oppose" | "nuanced";

type JurorPanelProps = {
  title: string;
  subtitle: string;
  accentClass: string;
  streamText: string;
  position?: Position;
  confidence?: number;
  model?: string | null;
  costUsd?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  loading?: boolean;
  loadingLabel?: string;
};

const positionStyles: Record<Position, string> = {
  support: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  oppose: "bg-red-500/15 text-red-300 border-red-500/30",
  nuanced: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export function JurorPanel({
  title,
  subtitle,
  accentClass,
  streamText,
  position,
  confidence,
  model,
  costUsd,
  inputTokens,
  outputTokens,
  totalTokens,
  loading,
  loadingLabel,
}: JurorPanelProps) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="text-sm text-zinc-100">{subtitle}</p>
          <UsageMeta
            model={model}
            costUsd={costUsd}
            inputTokens={inputTokens}
            outputTokens={outputTokens}
            totalTokens={totalTokens}
            className="mt-1"
          />
        </div>
        <span className={`h-2 w-2 rounded-full ${accentClass}`} />
      </div>

      {loading ? (
        <LoadingIndicator label={loadingLabel ?? "Round 1 in progress"} />
      ) : null}

      {position ? (
        <span
          className={`inline-flex w-fit rounded-full border px-2 py-1 text-xs uppercase tracking-wide ${
            positionStyles[position]
          }`}
        >
          {position}
        </span>
      ) : (
        <span className="text-sm text-zinc-100">Awaiting position...</span>
      )}

      <div className="min-h-[160px] rounded-lg bg-zinc-950 p-3 text-sm text-zinc-200">
        {streamText ? streamText : "Streaming response..."}
      </div>

      {typeof confidence === "number" ? (
        <div className="text-sm text-zinc-100">
          Confidence:{" "}
          <span className="text-zinc-100">{confidence.toFixed(2)}</span>
        </div>
      ) : null}
    </div>
  );
}

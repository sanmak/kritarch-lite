import { formatCostUsd } from "@/lib/usage";

type UsageMetaProps = {
  model?: string | null;
  costUsd?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  className?: string;
};

const formatTokens = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString();
};

export function UsageMeta({
  model,
  costUsd,
  inputTokens,
  outputTokens,
  totalTokens,
  className,
}: UsageMetaProps) {
  const hasMeta =
    model ||
    (costUsd !== null && costUsd !== undefined) ||
    (inputTokens !== null && inputTokens !== undefined) ||
    (outputTokens !== null && outputTokens !== undefined) ||
    (totalTokens !== null && totalTokens !== undefined);
  if (!hasMeta) return null;

  return (
    <div className={`text-sm text-zinc-200 ${className ?? ""}`}>
      <div>
        <span>Model: {model ?? "—"}</span>
        <span className="mx-2 text-zinc-200">·</span>
        <span>Est. cost: {formatCostUsd(costUsd)}</span>
      </div>
      <div className="mt-0.5">
        Tokens: {formatTokens(inputTokens)} in · {formatTokens(outputTokens)}{" "}
        out · {formatTokens(totalTokens)} total
      </div>
    </div>
  );
}

import { LoadingIndicator } from "@/components/loading-indicator";
import type { EvaluationOutput } from "@/lib/agents/schemas";

type Baseline = {
  position: string;
  summary: string;
  confidence: number;
  reasoning: string;
};

type Verdict = {
  verdict: string;
  agreementScore: number;
  confidenceScore: number;
  hallucinationFlags?: { juror: string; claim: string; reason: string }[];
};

type ComparisonPanelProps = {
  baseline?: Baseline | null;
  verdict?: Verdict | null;
  evaluation?: EvaluationOutput | null;
  loadingBaseline?: boolean;
};

export function ComparisonPanel({
  baseline,
  verdict,
  evaluation,
  loadingBaseline,
}: ComparisonPanelProps) {
  const flags = verdict?.hallucinationFlags ?? [];
  const evaluationDelta = evaluation
    ? evaluation.jury.overall - evaluation.baseline.overall
    : null;
  const dimensionScores = evaluation
    ? [
        {
          key: "consistency",
          label: "Consistency",
          baseline: evaluation.baseline.consistency,
          jury: evaluation.jury.consistency,
        },
        {
          key: "specificity",
          label: "Specificity",
          baseline: evaluation.baseline.specificity,
          jury: evaluation.jury.specificity,
        },
        {
          key: "reasoning",
          label: "Reasoning",
          baseline: evaluation.baseline.reasoning,
          jury: evaluation.jury.reasoning,
        },
        {
          key: "coverage",
          label: "Coverage",
          baseline: evaluation.baseline.coverage,
          jury: evaluation.jury.coverage,
        },
      ]
    : [];

  const formatDelta = (delta: number) =>
    `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`;
  const deltaClassName = (delta: number) =>
    delta > 0
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
      : delta < 0
        ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
        : "border-amber-500/40 bg-amber-500/15 text-amber-200";
  const winnerBanner =
    evaluation?.winner === "jury"
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
      : evaluation?.winner === "baseline"
        ? "border-rose-500/40 bg-rose-500/15 text-rose-100"
        : "border-amber-500/40 bg-amber-500/15 text-amber-100";
  const winnerLabel =
    evaluation?.winner === "jury"
      ? "Jury wins"
      : evaluation?.winner === "baseline"
        ? "Baseline wins"
        : "Tie";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-lg font-semibold text-white">Single Model vs Jury</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm uppercase text-zinc-100">Single Model</p>
          {baseline ? (
            <div className="mt-2 space-y-2 text-base text-zinc-200">
              <p>{baseline.summary}</p>
              <p className="text-sm text-zinc-100">
                Position: {baseline.position} · Conf:{" "}
                {baseline.confidence.toFixed(2)}
              </p>
            </div>
          ) : loadingBaseline ? (
            <div className="mt-2">
              <LoadingIndicator label="Baseline in progress" />
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-100">
              Baseline will appear once the debate starts.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm uppercase text-zinc-100">AI Jury</p>
          {verdict ? (
            <div className="mt-2 space-y-2 text-base text-zinc-200">
              <p>{verdict.verdict}</p>
              <p className="text-sm text-zinc-100">
                Agreement: {(verdict.agreementScore * 100).toFixed(0)}% · Conf:{" "}
                {(verdict.confidenceScore * 100).toFixed(0)}%
              </p>
              {flags.length ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                  <p className="font-semibold">Hallucination Flags</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {flags.map((flag, index) => (
                      <li key={`${flag.juror}-${index}`}>
                        <span className="font-semibold">{flag.juror}:</span>{" "}
                        {flag.claim}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-zinc-100">
                  No hallucinations flagged.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-100">
              Verdict will appear after Round 3.
            </p>
          )}
        </div>
      </div>
      {evaluation ? (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xl uppercase text-zinc-100">Evaluator scorecard</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <p className="text-[12px] uppercase text-zinc-100">Baseline</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-semibold text-zinc-100">
                  {evaluation.baseline.overall.toFixed(1)}
                </span>
                <span className="text-2xl text-zinc-100">/10</span>
              </div>
              <p className="mt-1 text-[14px] text-zinc-100">
                {evaluation.baseline.notes}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <span
                className={`rounded-full border px-3 py-1 text-[20px] font-semibold ${deltaClassName(
                  evaluationDelta ?? 0,
                )}`}
              >
                {formatDelta(evaluationDelta ?? 0)}
              </span>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-[12px] uppercase text-emerald-200/80">Jury</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-semibold text-emerald-100">
                  {evaluation.jury.overall.toFixed(1)}
                </span>
                <span className="text-2xl text-emerald-200/70">/10</span>
              </div>
              <p className="mt-1 text-[14px] text-emerald-200/70">
                {evaluation.jury.notes}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {dimensionScores.map((dimension) => {
              const delta = dimension.jury - dimension.baseline;
              return (
                <div
                  key={dimension.key}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-200">
                      {dimension.label}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${deltaClassName(
                        delta,
                      )}`}
                    >
                      {formatDelta(delta)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between text-[12px] text-zinc-100">
                        <span>Baseline</span>
                        <span>{dimension.baseline.toFixed(1)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-zinc-800">
                        <div
                          className="h-2 rounded-full bg-zinc-500"
                          style={{
                            width: `${Math.min(100, dimension.baseline * 10)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[12px] text-emerald-200/80">
                        <span>Jury</span>
                        <span>{dimension.jury.toFixed(1)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-emerald-900/50">
                        <div
                          className="h-2 rounded-full bg-emerald-400"
                          style={{
                            width: `${Math.min(100, dimension.jury * 10)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-xl font-semibold ${winnerBanner}`}
          >
            {winnerLabel}
            {evaluationDelta !== null
              ? ` (${formatDelta(evaluationDelta)} overall)`
              : null}
          </div>
          <p className="mt-2 text-[16px] text-zinc-100">
            {evaluation.rationale}
          </p>
        </div>
      ) : null}
    </div>
  );
}

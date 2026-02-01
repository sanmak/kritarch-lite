import { LoadingIndicator } from "@/components/loading-indicator";
import { UsageMeta } from "@/components/usage-meta";
import type { EvaluationOutput } from "@/lib/agents/schemas";
import { formatCostUsd } from "@/lib/usage";

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
  keyAgreements?: string[];
  keyDisagreements?: string[];
  keyEvidence?: string[];
  nextActions?: string[];
};

type UsageMetaData = {
  model?: string | null;
  costUsd?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
};

type CostSummaryItem = {
  label: string;
  costUsd: number | null;
};

type CostSummary = {
  items: CostSummaryItem[];
  totalCost: number | null;
};

type ComparisonPanelProps = {
  baselineFair?: Baseline | null;
  baselineMini?: Baseline | null;
  verdict?: Verdict | null;
  evaluation?: EvaluationOutput | null;
  loadingBaselineFair?: boolean;
  loadingBaselineMini?: boolean;
  baselineFairMeta?: UsageMetaData | null;
  baselineMiniMeta?: UsageMetaData | null;
  evaluatorMeta?: UsageMetaData | null;
  costSummary?: CostSummary | null;
};

export function ComparisonPanel({
  baselineFair,
  baselineMini,
  verdict,
  evaluation,
  loadingBaselineFair,
  loadingBaselineMini,
  baselineFairMeta,
  baselineMiniMeta,
  evaluatorMeta,
  costSummary,
}: ComparisonPanelProps) {
  const flags = verdict?.hallucinationFlags ?? [];
  const evaluationDelta = evaluation
    ? evaluation.jury.overall - evaluation.baseline.overall
    : null;
  const evaluationDeltaPercent =
    evaluation && evaluation.baseline.overall > 0
      ? ((evaluationDelta ?? 0) / evaluation.baseline.overall) * 100
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
  const toPercent = (value: number) => Math.round(value * 100);
  const baselineFairConfidence = baselineFair
    ? toPercent(baselineFair.confidence)
    : null;
  const baselineMiniConfidence = baselineMini
    ? toPercent(baselineMini.confidence)
    : null;
  const juryAgreement = verdict ? toPercent(verdict.agreementScore) : null;
  const juryConfidence = verdict ? toPercent(verdict.confidenceScore) : null;
  const juryEvidence =
    verdict?.keyEvidence && verdict.keyEvidence.length
      ? verdict.keyEvidence
      : verdict?.keyAgreements ?? [];
  const juryDisagreements = verdict?.keyDisagreements ?? [];
  const juryActions = verdict?.nextActions ?? [];

  const formatDelta = (delta: number) =>
    `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`;
  const formatPercent = (delta: number) =>
    `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
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
        ? "Baseline (selected model) wins"
        : "Tie";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Baselines vs Jury</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Compare single-model baselines to the multi-agent verdict.
          </p>
        </div>
        <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-300">
          Side-by-side
        </span>
      </div>
      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 border-l-2 border-l-blue-400/60 bg-zinc-950 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <p className="text-sm uppercase text-zinc-100">
                Baseline (selected model)
              </p>
            </div>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] uppercase text-blue-200">
              Primary
            </span>
          </div>
          <UsageMeta
            model={baselineFairMeta?.model}
            costUsd={baselineFairMeta?.costUsd}
            inputTokens={baselineFairMeta?.inputTokens}
            outputTokens={baselineFairMeta?.outputTokens}
            totalTokens={baselineFairMeta?.totalTokens}
            className="mt-1"
          />
          {baselineFair ? (
            <div className="mt-3 space-y-3 text-base text-zinc-200">
              <p>{baselineFair.summary}</p>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-200">
                <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1">
                  Position: {baselineFair.position}
                </span>
                {baselineFairConfidence !== null ? (
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1">
                    Confidence {baselineFairConfidence}%
                  </span>
                ) : null}
              </div>
              {baselineFairConfidence !== null ? (
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                    <span>Confidence</span>
                    <span>{baselineFairConfidence}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                    <div
                      className="h-1.5 rounded-full bg-zinc-500"
                      style={{ width: `${baselineFairConfidence}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : loadingBaselineFair ? (
            <div className="mt-2">
              <LoadingIndicator label="Selected-model baseline in progress" />
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-100">
              Selected-model baseline will appear once the debate starts.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-zinc-800 border-l-2 border-l-amber-400/60 bg-zinc-950 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <p className="text-sm uppercase text-zinc-100">
                Baseline (alternate model)
              </p>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase text-amber-200">
              Alternate
            </span>
          </div>
          <UsageMeta
            model={baselineMiniMeta?.model}
            costUsd={baselineMiniMeta?.costUsd}
            inputTokens={baselineMiniMeta?.inputTokens}
            outputTokens={baselineMiniMeta?.outputTokens}
            totalTokens={baselineMiniMeta?.totalTokens}
            className="mt-1"
          />
          {baselineMini ? (
            <div className="mt-3 space-y-3 text-base text-zinc-200">
              <p>{baselineMini.summary}</p>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-200">
                <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1">
                  Position: {baselineMini.position}
                </span>
                {baselineMiniConfidence !== null ? (
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1">
                    Confidence {baselineMiniConfidence}%
                  </span>
                ) : null}
              </div>
              {baselineMiniConfidence !== null ? (
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                    <span>Confidence</span>
                    <span>{baselineMiniConfidence}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                    <div
                      className="h-1.5 rounded-full bg-zinc-500"
                      style={{ width: `${baselineMiniConfidence}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : loadingBaselineMini ? (
            <div className="mt-2">
              <LoadingIndicator label="Alternate baseline in progress" />
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-100">
              Alternate baseline will appear once the debate starts.
            </p>
          )}
        </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-sm uppercase text-zinc-100">AI Jury</p>
            </div>
            <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-0.5 text-[10px] uppercase text-zinc-300">
              Multi-agent
            </span>
          </div>
          {verdict ? (
            <div className="mt-3 space-y-3 text-base text-zinc-200">
              <p>{verdict.verdict}</p>
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-300">
                {juryAgreement !== null ? (
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1">
                    Agreement {juryAgreement}%
                  </span>
                ) : null}
                {juryConfidence !== null ? (
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1">
                    Confidence {juryConfidence}%
                  </span>
                ) : null}
              </div>
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-300">
                      Key evidence
                    </p>
                    {juryEvidence.length ? (
                      <ul className="mt-2 grid gap-2 text-xs text-zinc-200">
                        {juryEvidence.slice(0, 2).map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span
                              className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300"
                              aria-hidden="true"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-500">
                        No key evidence captured.
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-300">
                        Risk flags
                      </p>
                      <div className="flex flex-wrap gap-2 text-[10px] uppercase text-zinc-500">
                        <span>Disagreements {juryDisagreements.length}</span>
                        <span>Hallucinations {flags.length}</span>
                      </div>
                    </div>
                    {juryDisagreements.length || flags.length ? (
                      <ul className="mt-2 grid gap-2 text-xs text-zinc-200">
                        {juryDisagreements.slice(0, 2).map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span
                              className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300"
                              aria-hidden="true"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                        {flags.slice(0, 1).map((flag, index) => (
                          <li
                            key={`${flag.juror}-${index}`}
                            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px]"
                          >
                            <span className="font-semibold">
                              {flag.juror}:
                            </span>{" "}
                            {flag.claim}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-500">
                        No risk flags surfaced.
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-300">
                    Next actions
                  </p>
                  {juryActions.length ? (
                    <ul className="mt-2 grid gap-2 text-xs text-zinc-200">
                      {juryActions.slice(0, 2).map((action) => (
                        <li key={action} className="flex items-start gap-2">
                          <span
                            className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-300"
                            aria-hidden="true"
                          />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">
                      No next actions provided.
                    </p>
                  )}
                </div>
              </div>
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
          <UsageMeta
            model={evaluatorMeta?.model}
            costUsd={evaluatorMeta?.costUsd}
            inputTokens={evaluatorMeta?.inputTokens}
            outputTokens={evaluatorMeta?.outputTokens}
            totalTokens={evaluatorMeta?.totalTokens}
            className="mt-2"
          />
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <p className="text-[12px] uppercase text-zinc-100">
                Baseline (selected model)
              </p>
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
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`rounded-full border px-3 py-1 text-[20px] font-semibold ${deltaClassName(
                    evaluationDelta ?? 0,
                  )}`}
                >
                  {evaluationDeltaPercent === null
                    ? formatDelta(evaluationDelta ?? 0)
                    : formatPercent(evaluationDeltaPercent)}
                </span>
                <span className="text-[12px] text-zinc-200">
                  Net change vs baseline
                </span>
              </div>
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
      {costSummary?.items.length ? (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm uppercase text-zinc-100">
            Cost summary (estimated)
          </p>
          <div className="mt-3 grid gap-2 text-sm text-zinc-200">
            {costSummary.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <span>{item.label}</span>
                <span>{formatCostUsd(item.costUsd)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-2 text-base font-semibold text-white">
              <span>Total</span>
              <span>{formatCostUsd(costSummary.totalCost)}</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-zinc-200">
            Estimates use public per-token pricing and exclude caching or volume
            discounts.
          </p>
        </div>
      ) : null}
    </div>
  );
}

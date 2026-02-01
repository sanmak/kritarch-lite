import { LoadingIndicator } from "@/components/loading-indicator";
import { UsageMeta } from "@/components/usage-meta";

type Verdict = {
  verdict: string;
  agreementScore: number;
  confidenceScore: number;
  keyAgreements?: string[];
  keyDisagreements?: string[];
  keyEvidence?: string[];
  nextActions?: string[];
  finalReasoning?: string;
  hallucinationFlags?: { juror: string; claim: string; reason: string }[];
};

export type VerdictPanelProps = {
  verdict?: Verdict | null;
  model?: string | null;
  costUsd?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  loading?: boolean;
};

export function VerdictPanel({
  verdict,
  model,
  costUsd,
  inputTokens,
  outputTokens,
  totalTokens,
  loading,
}: VerdictPanelProps) {
  const agreementPercent = verdict
    ? Math.round(verdict.agreementScore * 100)
    : 0;
  const confidencePercent = verdict
    ? Math.round(verdict.confidenceScore * 100)
    : 0;
  const evidenceItems =
    verdict?.keyEvidence && verdict.keyEvidence.length
      ? verdict.keyEvidence
      : verdict?.keyAgreements ?? [];
  const riskDisagreements = verdict?.keyDisagreements ?? [];
  const riskFlags = verdict?.hallucinationFlags ?? [];
  const nextActions = verdict?.nextActions ?? [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-lg font-semibold text-white">Jury Verdict</h3>
      <UsageMeta
        model={model}
        costUsd={costUsd}
        inputTokens={inputTokens}
        outputTokens={outputTokens}
        totalTokens={totalTokens}
        className="mt-1"
      />
      {verdict ? (
        <div className="mt-4 grid gap-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/80">
                Verdict
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-emerald-200/80">
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1">
                  Agreement {agreementPercent}%
                </span>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1">
                  Confidence {confidencePercent}%
                </span>
              </div>
            </div>
            <p className="mt-3 text-base text-emerald-100">
              {verdict.verdict}
            </p>
            {verdict.finalReasoning ? (
              <p className="mt-2 text-sm text-emerald-100/80">
                {verdict.finalReasoning}
              </p>
            ) : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-emerald-200/70">
                  <span>Agreement</span>
                  <span>{agreementPercent}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-emerald-900/50">
                  <div
                    className="h-1.5 rounded-full bg-emerald-300"
                    style={{ width: `${agreementPercent}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-emerald-200/70">
                  <span>Confidence</span>
                  <span>{confidencePercent}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-emerald-900/50">
                  <div
                    className="h-1.5 rounded-full bg-emerald-200"
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-200">
                Key evidence
              </p>
              {evidenceItems.length ? (
                <ul className="mt-3 grid gap-2 text-sm text-zinc-200">
                  {evidenceItems.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span
                        className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-300"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">
                  No key evidence captured yet.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/80">
                Risk flags
              </p>
              {riskDisagreements.length || riskFlags.length ? (
                <div className="mt-3 space-y-3 text-sm text-amber-100">
                  {riskDisagreements.length ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/70">
                        Open disagreements
                      </p>
                      <ul className="mt-2 grid gap-2">
                        {riskDisagreements.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span
                              className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300"
                              aria-hidden="true"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {riskFlags.length ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/70">
                        Hallucination flags
                      </p>
                      <ul className="mt-2 grid gap-2 text-sm text-amber-100">
                        {riskFlags.map((flag, index) => (
                          <li
                            key={`${flag.juror}-${index}`}
                            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2"
                          >
                            <p className="text-xs font-semibold text-amber-200">
                              {flag.juror}: {flag.claim}
                            </p>
                            <p className="mt-1 text-xs text-amber-200/70">
                              {flag.reason}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-amber-200/70">
                  No risk flags surfaced.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/80">
              Next actions
            </p>
            {nextActions.length ? (
              <ul className="mt-3 grid gap-2 text-sm text-sky-100">
                {nextActions.map((action) => (
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
              <p className="mt-3 text-sm text-sky-200/70">
                No explicit next actions provided.
              </p>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="mt-3">
          <LoadingIndicator label="Verdict in progress" />
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          Verdict will appear after Round 3.
        </p>
      )}
    </div>
  );
}

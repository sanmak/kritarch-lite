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
};

export function ComparisonPanel({ baseline, verdict, evaluation }: ComparisonPanelProps) {
  const flags = verdict?.hallucinationFlags ?? [];
  const evaluationDelta = evaluation
    ? evaluation.jury.overall - evaluation.baseline.overall
    : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold text-white">Single Model vs Jury</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase text-zinc-500">Single Model</p>
          {baseline ? (
            <div className="mt-2 space-y-2 text-sm text-zinc-200">
              <p>{baseline.summary}</p>
              <p className="text-xs text-zinc-400">
                Position: {baseline.position} · Conf: {baseline.confidence.toFixed(2)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">Baseline will appear after Round 1.</p>
          )}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase text-zinc-500">AI Jury</p>
          {verdict ? (
            <div className="mt-2 space-y-2 text-sm text-zinc-200">
              <p>{verdict.verdict}</p>
              <p className="text-xs text-zinc-400">
                Agreement: {(verdict.agreementScore * 100).toFixed(0)}% · Conf:{" "}
                {(verdict.confidenceScore * 100).toFixed(0)}%
              </p>
              {flags.length ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <p className="font-semibold">Hallucination Flags</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {flags.map((flag, index) => (
                      <li key={`${flag.juror}-${index}`}>
                        <span className="font-semibold">{flag.juror}:</span> {flag.claim}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No hallucinations flagged.</p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">Verdict will appear after Round 3.</p>
          )}
        </div>
      </div>
      {evaluation ? (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase text-zinc-500">Evaluator scorecard</p>
          <div className="mt-3 grid gap-3 text-xs text-zinc-300 md:grid-cols-2">
            <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
              <p className="text-[10px] uppercase text-zinc-500">Baseline</p>
              <p className="mt-1 text-sm text-zinc-100">
                Overall: {evaluation.baseline.overall.toFixed(1)}/10
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">{evaluation.baseline.notes}</p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
              <p className="text-[10px] uppercase text-zinc-500">Jury</p>
              <p className="mt-1 text-sm text-zinc-100">
                Overall: {evaluation.jury.overall.toFixed(1)}/10
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">{evaluation.jury.notes}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-[11px] text-zinc-400 md:grid-cols-2">
            <div>
              Consistency: {evaluation.baseline.consistency.toFixed(1)} →{" "}
              {evaluation.jury.consistency.toFixed(1)}
            </div>
            <div>
              Specificity: {evaluation.baseline.specificity.toFixed(1)} →{" "}
              {evaluation.jury.specificity.toFixed(1)}
            </div>
            <div>
              Reasoning: {evaluation.baseline.reasoning.toFixed(1)} →{" "}
              {evaluation.jury.reasoning.toFixed(1)}
            </div>
            <div>
              Coverage: {evaluation.baseline.coverage.toFixed(1)} →{" "}
              {evaluation.jury.coverage.toFixed(1)}
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-300">
            Winner: <span className="font-semibold">{evaluation.winner}</span>{" "}
            {evaluationDelta !== null
              ? `(${evaluationDelta >= 0 ? "+" : ""}${evaluationDelta.toFixed(1)})`
              : null}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">{evaluation.rationale}</p>
        </div>
      ) : null}
    </div>
  );
}

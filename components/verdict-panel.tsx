type Verdict = {
  verdict: string;
  agreementScore: number;
  confidenceScore: number;
  keyAgreements?: string[];
  keyDisagreements?: string[];
};

export type VerdictPanelProps = {
  verdict?: Verdict | null;
};

export function VerdictPanel({ verdict }: VerdictPanelProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold text-white">Jury Verdict</h3>
      {verdict ? (
        <div className="mt-3 space-y-3 text-sm text-zinc-200">
          <p>{verdict.verdict}</p>
          <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
            <span>
              Agreement: {Math.round(verdict.agreementScore * 100)}%
            </span>
            <span>
              Confidence: {Math.round(verdict.confidenceScore * 100)}%
            </span>
          </div>
          {verdict.keyAgreements?.length ? (
            <div>
              <p className="text-xs uppercase text-zinc-500">Key Agreements</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                {verdict.keyAgreements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {verdict.keyDisagreements?.length ? (
            <div>
              <p className="text-xs uppercase text-zinc-500">Open Disagreements</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                {verdict.keyDisagreements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">Verdict will appear after Round 3.</p>
      )}
    </div>
  );
}

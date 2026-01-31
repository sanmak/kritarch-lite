type LoadingIndicatorProps = {
  label?: string;
  className?: string;
};

export function LoadingIndicator({
  label = "In progress",
  className,
}: LoadingIndicatorProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 text-xs text-zinc-400 ${
        className ?? ""
      }`}
      role="status"
      aria-live="polite"
    >
      <span
        className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-400"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}

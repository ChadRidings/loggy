type BadgeState = {
  className: string;
  label?: string;
};

type StatusBadgeProps = {
  status: string;
  states?: Record<string, BadgeState>;
  fallback?: BadgeState;
  baseClassName?: string;
};

const defaultUploadStatusStates: Record<string, BadgeState> = {
  completed: { className: "bg-lime-300 text-slate-900" },
  partial_success: { className: "bg-amber-100 text-slate-900" },
  failed: { className: "bg-red-100 text-slate-900" },
  processing: { className: "bg-blue-100 text-slate-900" },
  queued: { className: "bg-slate-100 text-slate-900" }
};

const defaultFallback: BadgeState = {
  className: "bg-slate-100 text-slate-900"
};

export function StatusBadge({
  status,
  states = defaultUploadStatusStates,
  fallback = defaultFallback,
  baseClassName
}: StatusBadgeProps) {
  const resolved = states[status] ?? fallback;
  const rootClassName = baseClassName ?? "rounded-full px-3 py-1 text-xs font-semibold";

  return <span className={`${rootClassName} ${resolved.className}`}>{resolved.label ?? status}</span>;
}

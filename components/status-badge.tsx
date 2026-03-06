type BadgeState = {
  className: string;
  label?: string;
};

type StatusBadgeProps = {
  status: string;
  states: Record<string, BadgeState>;
  fallback?: BadgeState;
  baseClassName?: string;
};

const defaultFallback: BadgeState = {
  className: "bg-slate-100 text-slate-900"
};

export function StatusBadge({ status, states, fallback = defaultFallback, baseClassName }: StatusBadgeProps) {
  const resolved = states[status] ?? fallback;
  const rootClassName = baseClassName ?? "rounded-full px-3 py-1 text-xs font-semibold";

  return <span className={`${rootClassName} ${resolved.className}`}>{resolved.label ?? status}</span>;
}

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  high_deny_ratio: "High Deny Ratio",
  ip_volume_spike: "IP Volume Spike",
  rare_domain_surge: "Rare Domain Surge",
};

export function formatAnomalyType(type: string): string {
  const mapped = ANOMALY_TYPE_LABELS[type];
  if (mapped) {
    return mapped;
  }

  return type
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

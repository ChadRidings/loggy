import { describe, expect, it } from "vitest";
import { detectAnomalies } from "@/lib/anomaly";
import type { ParsedEventInput } from "@/lib/parser/log-parser";

function makeEvent(overrides: Partial<ParsedEventInput>): ParsedEventInput {
  return {
    lineNumber: overrides.lineNumber ?? 1,
    timestamp: overrides.timestamp ?? "2026-03-05T10:00:00Z",
    srcIp: overrides.srcIp ?? "10.0.0.1",
    userIdentifier: overrides.userIdentifier ?? "alice",
    url: overrides.url ?? "https://example.com",
    domain: overrides.domain ?? "example.com",
    httpMethod: overrides.httpMethod ?? "GET",
    action: overrides.action ?? "ALLOW",
    statusCode: overrides.statusCode ?? 200,
    bytesOut: overrides.bytesOut ?? 120,
    userAgent: overrides.userAgent ?? "Mozilla",
    severity: overrides.severity ?? "low",
    rawLine: overrides.rawLine ?? "line",
    parseWarning: overrides.parseWarning ?? null
  };
}

describe("detectAnomalies", () => {
  it("detects deny ratio anomalies", async () => {
    const events = Array.from({ length: 20 }).map((_, index) =>
      makeEvent({ action: index < 14 ? "DENY" : "ALLOW", statusCode: index < 14 ? 403 : 200, srcIp: `10.0.0.${index % 4}` })
    );

    const anomalies = await detectAnomalies(events);

    expect(anomalies.some((anomaly) => anomaly.type === "high_deny_ratio")).toBe(true);
    expect(anomalies.every((anomaly) => anomaly.detectionSource === "heuristic")).toBe(true);
  });

  it("handles empty events", async () => {
    const anomalies = await detectAnomalies([]);
    expect(anomalies).toHaveLength(0);
  });
});

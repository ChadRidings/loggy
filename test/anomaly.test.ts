import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  const originalEnableLlm = process.env.ENABLE_LLM_ANOMALY;
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.ENABLE_LLM_ANOMALY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  afterEach(() => {
    process.env.ENABLE_LLM_ANOMALY = originalEnableLlm;
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.OPENAI_MODEL = originalModel;
    global.fetch = originalFetch;
  });

  // Ensures the high_deny_ratio heuristic is emitted at the exact 0.60 threshold.
  it("detects high_deny_ratio at boundary ratio 0.60", async () => {
    const events = Array.from({ length: 20 }).map((_, index) =>
      makeEvent({
        action: index < 12 ? "DENY" : "ALLOW",
        statusCode: index < 12 ? 403 : 200,
        srcIp: `10.0.0.${index}`,
        domain: "stable.example.com"
      })
    );

    const anomalies = await detectAnomalies(events);

    expect(anomalies.some((anomaly) => anomaly.type === "high_deny_ratio")).toBe(true);
  });

  // Ensures the high_deny_ratio heuristic is not emitted below the 0.60 threshold.
  it("does not detect high_deny_ratio below boundary ratio 0.60", async () => {
    const events = Array.from({ length: 20 }).map((_, index) =>
      makeEvent({
        action: index < 11 ? "DENY" : "ALLOW",
        statusCode: index < 11 ? 403 : 200,
        srcIp: `10.0.0.${index}`,
        domain: "stable.example.com"
      })
    );

    const anomalies = await detectAnomalies(events);

    expect(anomalies.some((anomaly) => anomaly.type === "high_deny_ratio")).toBe(false);
  });

  // Validates ip_volume_spike detection when both absolute (>=20) and ratio (>=0.35) thresholds are met.
  it("detects ip_volume_spike when count and ratio thresholds are met", async () => {
    const events = [
      ...Array.from({ length: 21 }).map((_, index) =>
        makeEvent({
          srcIp: "10.0.0.99",
          domain: "stable.example.com",
          lineNumber: index + 1
        })
      ),
      ...Array.from({ length: 39 }).map((_, index) =>
        makeEvent({
          srcIp: `10.0.1.${index}`,
          domain: "stable.example.com",
          lineNumber: index + 22
        })
      )
    ];

    const anomalies = await detectAnomalies(events);

    expect(anomalies.some((anomaly) => anomaly.type === "ip_volume_spike")).toBe(true);
  });

  // Ensures ip_volume_spike is not emitted when absolute count is below 20 even if ratio is high.
  it("does not detect ip_volume_spike when top IP count is below 20", async () => {
    const events = [
      ...Array.from({ length: 19 }).map((_, index) =>
        makeEvent({
          srcIp: "10.0.0.77",
          domain: "stable.example.com",
          lineNumber: index + 1
        })
      ),
      ...Array.from({ length: 11 }).map((_, index) =>
        makeEvent({
          srcIp: `10.0.2.${index}`,
          domain: "stable.example.com",
          lineNumber: index + 20
        })
      )
    ];

    const anomalies = await detectAnomalies(events);

    expect(anomalies.some((anomaly) => anomaly.type === "ip_volume_spike")).toBe(false);
  });

  // Ensures ip_volume_spike is not emitted when ratio is below 0.35 despite count >= 20.
  it("does not detect ip_volume_spike when top IP ratio is below 0.35", async () => {
    const events = [
      ...Array.from({ length: 20 }).map((_, index) =>
        makeEvent({
          srcIp: "10.0.0.88",
          domain: "stable.example.com",
          lineNumber: index + 1
        })
      ),
      ...Array.from({ length: 40 }).map((_, index) =>
        makeEvent({
          srcIp: `10.0.3.${index}`,
          domain: "stable.example.com",
          lineNumber: index + 21
        })
      )
    ];

    const anomalies = await detectAnomalies(events);

    expect(anomalies.some((anomaly) => anomaly.type === "ip_volume_spike")).toBe(false);
  });

  // Validates rare_domain_surge detection when strictly more than 25 domains appear exactly once.
  it("detects rare_domain_surge when rare-domain count is above 25", async () => {
    const events = Array.from({ length: 26 }).map((_, index) =>
      makeEvent({
        srcIp: `10.0.4.${index}`,
        domain: `unique-${index}.example.com`,
        lineNumber: index + 1
      })
    );

    const anomalies = await detectAnomalies(events);

    expect(anomalies.some((anomaly) => anomaly.type === "rare_domain_surge")).toBe(true);
  });

  // Ensures rare_domain_surge is not emitted at the boundary of exactly 25 rare domains.
  it("does not detect rare_domain_surge at boundary of 25 rare domains", async () => {
    const events = Array.from({ length: 25 }).map((_, index) =>
      makeEvent({
        srcIp: `10.0.5.${index}`,
        domain: `unique-${index}.example.com`,
        lineNumber: index + 1
      })
    );

    const anomalies = await detectAnomalies(events);

    expect(anomalies.some((anomaly) => anomaly.type === "rare_domain_surge")).toBe(false);
  });

  // Confirms LLM enrichment branch updates anomaly confidence/source/summary when patch response is valid.
  it("applies llm_hybrid enrichment patches when LLM is enabled and returns valid output", async () => {
    process.env.ENABLE_LLM_ANOMALY = "true";
    process.env.OPENAI_API_KEY = "test-api-key";
    process.env.OPENAI_MODEL = "gpt-4.1-mini";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          anomalies: [
            {
              type: "high_deny_ratio",
              confidenceScore: 12.4,
              llmReasoningSummary: "Model found sustained deny pressure from multiple sources."
            }
          ]
        })
      })
    }) as unknown as typeof fetch;

    const events = Array.from({ length: 20 }).map((_, index) =>
      makeEvent({
        action: index < 14 ? "DENY" : "ALLOW",
        statusCode: index < 14 ? 403 : 200,
        srcIp: `10.0.0.${index}`,
        domain: "stable.example.com"
      })
    );

    const anomalies = await detectAnomalies(events);
    const denyAnomaly = anomalies.find((anomaly) => anomaly.type === "high_deny_ratio");

    expect(denyAnomaly).toBeDefined();
    expect(denyAnomaly?.detectionSource).toBe("llm_hybrid");
    expect(denyAnomaly?.confidenceScore).toBe(10);
    expect(denyAnomaly?.llmReasoningSummary).toContain("deny pressure");
  });

  // Confirms heuristic fallback behavior when LLM request fails while enabled.
  it("falls back to heuristic anomalies when LLM request fails", async () => {
    process.env.ENABLE_LLM_ANOMALY = "true";
    process.env.OPENAI_API_KEY = "test-api-key";

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({})
    }) as unknown as typeof fetch;

    const events = Array.from({ length: 20 }).map((_, index) =>
      makeEvent({
        action: index < 14 ? "DENY" : "ALLOW",
        statusCode: index < 14 ? 403 : 200,
        srcIp: `10.0.0.${index}`,
        domain: "stable.example.com"
      })
    );

    const anomalies = await detectAnomalies(events);
    const denyAnomaly = anomalies.find((anomaly) => anomaly.type === "high_deny_ratio");

    expect(denyAnomaly).toBeDefined();
    expect(denyAnomaly?.detectionSource).toBe("heuristic");
    expect(denyAnomaly?.llmReasoningSummary).toBeNull();
  });

  // Ensures no LLM call is attempted when feature flag/API key preconditions are not met.
  it("keeps heuristic-only output when LLM is disabled or API key is missing", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const events = Array.from({ length: 20 }).map((_, index) =>
      makeEvent({
        action: index < 14 ? "DENY" : "ALLOW",
        statusCode: index < 14 ? 403 : 200,
        srcIp: `10.0.0.${index}`,
        domain: "stable.example.com"
      })
    );

    const anomalies = await detectAnomalies(events);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(anomalies.some((anomaly) => anomaly.type === "high_deny_ratio")).toBe(true);
    expect(anomalies.every((anomaly) => anomaly.detectionSource === "heuristic")).toBe(true);
  });
});

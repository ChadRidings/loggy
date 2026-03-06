import type { ParsedEventInput } from "@/lib/parser/log-parser";

export type DetectedAnomaly = {
  eventId: string | null;
  type: string;
  confidenceScore: number;
  explanation: string;
  detectionSource: "heuristic" | "llm_hybrid";
  llmReasoningSummary: string | null;
};

type LlmAnomalyPatch = {
  type: string;
  confidenceScore?: number;
  llmReasoningSummary?: string;
};

function clampConfidence(value: number): number {
  return Number(Math.max(0, Math.min(10, value)).toFixed(2));
}

function getTopCounts(values: string[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

function buildHeuristicAnomalies(events: ParsedEventInput[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];

  if (events.length === 0) {
    return anomalies;
  }

  const ipList = events.map((event) => event.srcIp).filter((value): value is string => Boolean(value));
  const topIp = getTopCounts(ipList)[0];

  if (topIp && topIp.count >= 20 && topIp.count / events.length >= 0.35) {
    anomalies.push({
      eventId: null,
      type: "ip_volume_spike",
      confidenceScore: clampConfidence(7.4),
      explanation: `Unusual request concentration: ${topIp.count} of ${events.length} events came from ${topIp.value}.`,
      detectionSource: "heuristic",
      llmReasoningSummary: null
    });
  }

  const deniedEvents = events.filter((event) => (event.action ?? "").toLowerCase().includes("deny") || (event.action ?? "").toLowerCase().includes("block"));
  if (deniedEvents.length > 0) {
    const denyRatio = deniedEvents.length / events.length;
    if (denyRatio >= 0.6) {
      anomalies.push({
        eventId: null,
        type: "high_deny_ratio",
        confidenceScore: clampConfidence(8.1),
        explanation: `High deny ratio detected: ${(denyRatio * 100).toFixed(1)}% of events were blocked/denied.`,
        detectionSource: "heuristic",
        llmReasoningSummary: null
      });
    }
  }

  const domains = events.map((event) => event.domain).filter((value): value is string => Boolean(value));
  const domainCounts = getTopCounts(domains);
  const rareDomains = domainCounts.filter((entry) => entry.count === 1);
  if (rareDomains.length > 25) {
    anomalies.push({
      eventId: null,
      type: "rare_domain_surge",
      confidenceScore: clampConfidence(6.8),
      explanation: `Rare domain burst detected: ${rareDomains.length} unique domains were seen only once.`,
      detectionSource: "heuristic",
      llmReasoningSummary: null
    });
  }

  return anomalies;
}

async function requestLlmPatches(anomalies: DetectedAnomaly[], events: ParsedEventInput[]): Promise<LlmAnomalyPatch[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  const enableLlm = process.env.ENABLE_LLM_ANOMALY === "true";

  if (!enableLlm || !apiKey || anomalies.length === 0) {
    return [];
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const eventSample = events.slice(0, 40).map((event) => ({
    timestamp: event.timestamp,
    srcIp: event.srcIp,
    action: event.action,
    statusCode: event.statusCode,
    domain: event.domain
  }));

  const prompt = {
    instructions:
      "You are a SOC analyst assistant. For each anomaly type, provide a short reasoning summary and optional confidence calibration on 0-10 scale.",
    anomalies: anomalies.map((anomaly) => ({
      type: anomaly.type,
      confidenceScore: anomaly.confidenceScore,
      explanation: anomaly.explanation
    })),
    eventSample
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: JSON.stringify(prompt),
      text: {
        format: {
          type: "json_schema",
          name: "anomaly_enrichment",
          schema: {
            type: "object",
            properties: {
              anomalies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    confidenceScore: { type: "number" },
                    llmReasoningSummary: { type: "string" }
                  },
                  required: ["type"],
                  additionalProperties: false
                }
              }
            },
            required: ["anomalies"],
            additionalProperties: false
          },
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}`);
  }

  const json = (await response.json()) as {
    output_text?: string;
  };

  if (!json.output_text) {
    return [];
  }

  const parsed = JSON.parse(json.output_text) as { anomalies?: LlmAnomalyPatch[] };
  return parsed.anomalies ?? [];
}

export async function detectAnomalies(events: ParsedEventInput[]): Promise<DetectedAnomaly[]> {
  const heuristicAnomalies = buildHeuristicAnomalies(events);

  try {
    const patches = await requestLlmPatches(heuristicAnomalies, events);

    if (patches.length === 0) {
      return heuristicAnomalies;
    }

    return heuristicAnomalies.map((anomaly) => {
      const patch = patches.find((candidate) => candidate.type === anomaly.type);
      if (!patch) {
        return anomaly;
      }

      return {
        ...anomaly,
        confidenceScore: clampConfidence(patch.confidenceScore ?? anomaly.confidenceScore),
        detectionSource: "llm_hybrid",
        llmReasoningSummary: patch.llmReasoningSummary ?? anomaly.llmReasoningSummary
      };
    });
  } catch {
    return heuristicAnomalies;
  }
}

import { runMigrations } from "@/lib/db";
import { detectAnomalies } from "@/lib/anomaly";
import { parseLogContent, type ParsedEventInput } from "@/lib/parser/log-parser";
import {
  insertEvents,
  markUploadDone,
  markUploadFailed,
  markUploadProcessing,
  replaceAnomalies,
  replaceTimelines
} from "@/lib/uploads";

const inFlightJobs = new Set<string>();

type BucketAccumulator = {
  eventCount: number;
  blockedCount: number;
  ipCounts: Map<string, number>;
  domainCounts: Map<string, number>;
};

function getBucketStart(timestampIso: string): string {
  const date = new Date(timestampIso);
  date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 15) * 15, 0, 0);
  return date.toISOString();
}

function getTopValue(counts: Map<string, number>): string | null {
  let winner: string | null = null;
  let maxCount = 0;

  counts.forEach((count, value) => {
    if (count > maxCount) {
      maxCount = count;
      winner = value;
    }
  });

  return winner;
}

function buildTimelineBuckets(events: ParsedEventInput[]) {
  const buckets = new Map<string, BucketAccumulator>();

  for (const event of events) {
    const key = getBucketStart(event.timestamp);
    const bucket =
      buckets.get(key) ??
      {
        eventCount: 0,
        blockedCount: 0,
        ipCounts: new Map<string, number>(),
        domainCounts: new Map<string, number>()
      };

    bucket.eventCount += 1;

    if ((event.action ?? "").toLowerCase().includes("block") || (event.action ?? "").toLowerCase().includes("deny")) {
      bucket.blockedCount += 1;
    }

    if (event.srcIp) {
      bucket.ipCounts.set(event.srcIp, (bucket.ipCounts.get(event.srcIp) ?? 0) + 1);
    }

    if (event.domain) {
      bucket.domainCounts.set(event.domain, (bucket.domainCounts.get(event.domain) ?? 0) + 1);
    }

    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([bucketStart, value]) => {
      const startDate = new Date(bucketStart);
      const endDate = new Date(startDate);
      endDate.setUTCMinutes(endDate.getUTCMinutes() + 15);

      return {
        bucketStart,
        bucketEnd: endDate.toISOString(),
        eventCount: value.eventCount,
        blockedCount: value.blockedCount,
        topIp: getTopValue(value.ipCounts),
        topDomain: getTopValue(value.domainCounts)
      };
    });
}

export function enqueueUploadProcessing(uploadId: string, fileContent: string): void {
  if (inFlightJobs.has(uploadId)) {
    return;
  }

  inFlightJobs.add(uploadId);

  setTimeout(async () => {
    try {
      await runMigrations();
      await markUploadProcessing(uploadId);

      const parsed = parseLogContent(fileContent);
      await insertEvents(uploadId, parsed.events);

      const timelineBuckets = buildTimelineBuckets(parsed.events);
      await replaceTimelines(uploadId, timelineBuckets);
      const anomalies = await detectAnomalies(parsed.events);
      await replaceAnomalies(uploadId, anomalies);

      const finalStatus = parsed.warnings.length > 0 ? "partial_success" : "completed";
      await markUploadDone(uploadId, finalStatus);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown ingestion error";
      await markUploadFailed(uploadId, reason);
    } finally {
      inFlightJobs.delete(uploadId);
    }
  }, 0);
}

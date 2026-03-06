export type ParsedEventInput = {
  lineNumber: number;
  timestamp: string;
  srcIp: string | null;
  userIdentifier: string | null;
  url: string | null;
  domain: string | null;
  httpMethod: string | null;
  action: string | null;
  statusCode: number | null;
  bytesOut: number | null;
  userAgent: string | null;
  severity: "low" | "medium" | "high";
  rawLine: string;
  parseWarning: string | null;
};

export type ParseResult = {
  events: ParsedEventInput[];
  warnings: string[];
};

function parseTimestamp(value: string): string | null {
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function parseDomain(rawUrl: string | null): string | null {
  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl).hostname || null;
  } catch {
    return null;
  }
}

function deriveSeverity(action: string | null, statusCode: number | null): "low" | "medium" | "high" {
  if (!action && !statusCode) {
    return "low";
  }

  const actionLower = action?.toLowerCase() ?? "";
  if (actionLower.includes("block") || actionLower.includes("deny")) {
    return "high";
  }

  if (statusCode && statusCode >= 400) {
    return "medium";
  }

  return "low";
}

function parseCsvLine(line: string): string[] {
  return line.split(",").map((part) => part.trim());
}

function parseKeyValueLine(line: string): Record<string, string> {
  const entries = line
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part.includes("="))
    .map((part) => {
      const [key, ...rest] = part.split("=");
      return [key, rest.join("=")] as const;
    });

  return Object.fromEntries(entries);
}

function parseZscalerLike(line: string, lineNumber: number): ParsedEventInput | null {
  const fields = parseCsvLine(line);
  if (fields.length < 5) {
    return null;
  }

  const timestamp = parseTimestamp(fields[0]);
  if (!timestamp) {
    return null;
  }

  const srcIp = fields[1] || null;
  const url = fields[2] || null;
  const action = fields[3] || null;
  const statusCode = Number.parseInt(fields[4] ?? "", 10);
  const userIdentifier = fields[5] || null;
  const httpMethod = fields[6] || null;
  const bytesOut = Number.parseInt(fields[7] ?? "", 10);
  const userAgent = fields.slice(8).join(",") || null;

  return {
    lineNumber,
    timestamp,
    srcIp,
    userIdentifier,
    url,
    domain: parseDomain(url),
    httpMethod,
    action,
    statusCode: Number.isNaN(statusCode) ? null : statusCode,
    bytesOut: Number.isNaN(bytesOut) ? null : bytesOut,
    userAgent,
    severity: deriveSeverity(action, Number.isNaN(statusCode) ? null : statusCode),
    rawLine: line,
    parseWarning: null
  };
}

function parseGeneric(line: string, lineNumber: number): ParsedEventInput | null {
  const kv = parseKeyValueLine(line);
  const timestamp = parseTimestamp(kv.timestamp || kv.ts || "");

  if (!timestamp) {
    return null;
  }

  const url = kv.url || null;
  const action = kv.action || kv.result || null;
  const statusCode = Number.parseInt(kv.status || kv.status_code || "", 10);
  const bytesOut = Number.parseInt(kv.bytes || kv.bytes_out || "", 10);

  return {
    lineNumber,
    timestamp,
    srcIp: kv.src_ip || kv.ip || null,
    userIdentifier: kv.user || kv.username || null,
    url,
    domain: parseDomain(url),
    httpMethod: kv.method || null,
    action,
    statusCode: Number.isNaN(statusCode) ? null : statusCode,
    bytesOut: Number.isNaN(bytesOut) ? null : bytesOut,
    userAgent: kv.ua || kv.user_agent || null,
    severity: deriveSeverity(action, Number.isNaN(statusCode) ? null : statusCode),
    rawLine: line,
    parseWarning: null
  };
}

export function parseLogContent(content: string): ParseResult {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const events: ParsedEventInput[] = [];
  const warnings: string[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    const zscalerEvent = parseZscalerLike(line, lineNumber);
    if (zscalerEvent) {
      events.push(zscalerEvent);
      return;
    }

    const genericEvent = parseGeneric(line, lineNumber);
    if (genericEvent) {
      events.push(genericEvent);
      return;
    }

    warnings.push(`Line ${lineNumber}: unrecognized format`);
  });

  return { events, warnings };
}

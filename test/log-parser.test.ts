import { describe, expect, it } from "vitest";
import { parseLogContent } from "@/lib/parser/log-parser";

describe("parseLogContent", () => {
  it("parses zscaler-like csv lines", () => {
    const content = [
      "2026-03-05T10:00:00Z,10.0.0.1,https://example.com,ALLOW,200,alice,GET,123,Mozilla",
      "2026-03-05T10:01:00Z,10.0.0.2,https://blocked.example,DENY,403,bob,GET,44,Agent"
    ].join("\n");

    const result = parseLogContent(content);

    expect(result.events).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
    expect(result.events[1]?.severity).toBe("high");
    expect(result.events[0]?.domain).toBe("example.com");
  });

  it("returns warnings for unrecognized lines", () => {
    const content = "not parseable line";
    const result = parseLogContent(content);

    expect(result.events).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { isCurrentAnalysisEvent } from "@/lib/analysis-stream-client";
import { partCCases, sourcePageForView } from "@/lib/case-catalog";
import { analyseWithOpenAI, analyseWithOpenAIStream } from "@/lib/openai-responses";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("release hardening regressions", () => {
  it("falls back to the Part C information page for case-only citations", () => {
    const entry = partCCases.find((candidate) => !candidate.caseOnlyPage);
    expect(entry?.informationPage).toBeDefined();
    expect(entry && sourcePageForView(entry, "case-only")).toBe(entry?.informationPage);
  });

  it("ignores aborted, replaced and mismatched stream events", () => {
    const first = new AbortController();
    const second = new AbortController();
    const active = { controller: second, requestId: "second" };

    expect(isCurrentAnalysisEvent(active, first, "first", "first")).toBe(false);
    expect(isCurrentAnalysisEvent(active, second, "second", "first")).toBe(false);
    expect(isCurrentAnalysisEvent(active, second, "second", "second")).toBe(true);
    second.abort();
    expect(isCurrentAnalysisEvent(active, second, "second", "second")).toBe(false);
  });

  it("rejects incomplete non-streaming OpenAI responses", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
        }),
      ),
    );

    await expect(analyseWithOpenAI("A", "test case")).rejects.toThrow("max_output_tokens");
  });

  it("rejects response.incomplete streaming events", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const body = [
      "event: response.incomplete",
      'data: {"type":"response.incomplete","response":{"incomplete_details":{"reason":"max_output_tokens"}}}',
      "",
      "",
    ].join("\n");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
      ),
    );

    await expect(analyseWithOpenAIStream("C", "test case")).rejects.toThrow("max_output_tokens");
  });
});

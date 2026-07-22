import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("production rate limiting", () => {
  it("fails closed when Upstash is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { consumeGenerationAllowance } = await import("@/lib/rate-limit");

    const result = await consumeGenerationAllowance(
      new Request("https://example.test/api/analyse", {
        headers: { "cf-connecting-ip": "203.0.113.10" },
      }),
    );

    expect(result).toMatchObject({ allowed: false, remaining: 0, unavailable: true });
  });
});

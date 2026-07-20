type RateBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

const globalRateState = globalThis as typeof globalThis & {
  __oralExamRateBuckets?: Map<string, RateBucket>;
};

const buckets =
  globalRateState.__oralExamRateBuckets ??
  (globalRateState.__oralExamRateBuckets = new Map<string, RateBucket>());

function configuredLimit() {
  const parsed = Number.parseInt(process.env.RATE_LIMIT_PER_HOUR ?? "20", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : 20;
}

function clientIdentifier(request: Request) {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function removeExpiredBuckets(now: number) {
  if (buckets.size < 2_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function consumeGenerationAllowance(request: Request): RateLimitResult {
  const now = Date.now();
  const limit = configuredLimit();
  const identifier = clientIdentifier(request);
  const existing = buckets.get(identifier);

  removeExpiredBuckets(now);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + 60 * 60 * 1_000;
    buckets.set(identifier, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

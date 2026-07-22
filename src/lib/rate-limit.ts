import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  unavailable?: boolean;
};

const globalRateState = globalThis as typeof globalThis & {
  __oralExamRateBuckets?: Map<string, RateBucket>;
};

const buckets =
  globalRateState.__oralExamRateBuckets ??
  (globalRateState.__oralExamRateBuckets = new Map<string, RateBucket>());

let distributedLimiter: Ratelimit | null | undefined;

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

function inMemoryAllowance(identifier: string, now: number, limit: number): RateLimitResult {
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

function getDistributedLimiter(limit: number) {
  if (distributedLimiter !== undefined) return distributedLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    distributedLimiter = null;
    return distributedLimiter;
  }

  distributedLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, "1 h"),
    analytics: true,
    prefix: "oral-exam-generation",
  });
  return distributedLimiter;
}

export async function consumeGenerationAllowance(request: Request): Promise<RateLimitResult> {
  const now = Date.now();
  const limit = configuredLimit();
  const identifier = clientIdentifier(request);
  const limiter = getDistributedLimiter(limit);

  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      return { allowed: false, limit, remaining: 0, resetAt: now + 60_000, unavailable: true };
    }
    return inMemoryAllowance(identifier, now, limit);
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  } catch (error) {
    console.error("Distributed rate limit unavailable", error);
    return { allowed: false, limit, remaining: 0, resetAt: now + 60_000, unavailable: true };
  }
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(input: { key: string; limit: number; windowMs: number; now?: number }): RateLimitResult {
  const now = input.now ?? Date.now();
  const existing = buckets.get(input.key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + input.windowMs };
  bucket.count += 1;
  buckets.set(input.key, bucket);
  return {
    allowed: bucket.count <= input.limit,
    limit: input.limit,
    remaining: Math.max(0, input.limit - bucket.count),
    resetAt: bucket.resetAt
  };
}

export function resetRateLimitBuckets() {
  buckets.clear();
}

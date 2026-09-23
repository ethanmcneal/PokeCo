// A minimal in-memory fixed-window rate limiter for sensitive endpoints
// (login/register). Proportionate to this app; it is per-instance and resets on
// restart. Production would use a shared store (Redis) or an edge/gateway limit.
// See specs/07-security.md.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs: number
}

/**
 * Records a hit against `key` and reports whether it is within `limit` per
 * `windowMs`. `now` is injectable for deterministic tests.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now }
  }

  bucket.count += 1
  return { allowed: true, retryAfterMs: 0 }
}

/** Clears all buckets. Intended for tests. */
export function resetRateLimits(): void {
  buckets.clear()
}

/**
 * Simple in-memory rate limiter (Phase D).
 *
 * A per-key sliding window that records the timestamp of the last request.
 * A key is allowed if the previous request is older than `windowMs`.
 * Used to throttle password-reset requests (key = email) to prevent abuse.
 *
 * NOTE: in-memory only — not shared across serverless instances. Sufficient
 * for a single-instance deployment; a distributed store (e.g. Redis) would be
 * needed for multi-instance scale.
 */

/** Map key -> timestamp (ms) of the last recorded request. */
const lastRequestAt = new Map<string, number>();

/**
 * Check whether a request for `key` is allowed, and if so, record it.
 *
 * @param key     Identifier being throttled (e.g. lowercased email).
 * @param windowMs Minimum interval between allowed requests, in ms.
 * @returns true if allowed (and the request is now recorded),
 *          false if the key is still inside the rate-limit window.
 */
export function checkRateLimit(key: string, windowMs: number): boolean {
  const now = Date.now();
  const last = lastRequestAt.get(key);

  if (last !== undefined && now - last < windowMs) {
    return false;
  }

  lastRequestAt.set(key, now);
  return true;
}

/** Clear all rate-limit state — used by tests. */
export function resetRateLimiter(): void {
  lastRequestAt.clear();
}

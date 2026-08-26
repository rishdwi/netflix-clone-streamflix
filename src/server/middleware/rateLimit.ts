// ============================================================================
// RATE LIMITING MIDDLEWARE (sliding window, in-memory)
// ----------------------------------------------------------------------------
// Protects brute-force sensitive endpoints (login/signup). Each IP+bucket gets
// a fixed number of requests per window; extra requests get HTTP 429.
//
// VIVA NOTE: a single Node process can keep counters in memory, but with many
// server replicas behind a load balancer you must share counters in Redis
// (e.g. `INCR key; EXPIRE key window` — atomic, O(1), works across instances).
// ============================================================================

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Prevent unbounded memory growth: sweep expired buckets occasionally.
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hit] of buckets) if (hit.resetAt < now) buckets.delete(key);
}

/**
 * Check (and record) a request against a limit.
 * @returns remaining allowance info; `allowed: false` => respond 429.
 */
export function rateLimit(opts: {
  key: string; // logical bucket, e.g. "login"
  ip: string;
  limit: number; // e.g. 10
  windowMs: number; // e.g. 60_000
}): { allowed: boolean; retryAfterSec: number } {
  sweep();
  const id = `${opts.key}:${opts.ip}`;
  const now = Date.now();
  const hit = buckets.get(id);
  if (!hit || hit.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  hit.count += 1;
  if (hit.count > opts.limit) {
    return { allowed: false, retryAfterSec: Math.ceil((hit.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/** Best-effort client IP extraction (works behind a proxy too). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return (req.headers.get("x-real-ip") ?? "local").trim();
}

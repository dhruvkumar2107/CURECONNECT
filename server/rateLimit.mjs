// Small in-memory fixed-window rate limiter. Good enough for a single instance;
// counters reset when the process restarts.

export function createLimiter({ limit, windowMs, now = () => Date.now() }) {
  const buckets = new Map();

  const sweep = () => {
    const t = now();
    for (const [key, b] of buckets) if (b.resetAt <= t) buckets.delete(key);
  };
  const timer = setInterval(sweep, Math.min(windowMs, 10 * 60 * 1000));
  timer.unref?.();

  return {
    /** Records a hit. Returns { ok, remaining, retryAfterS }. */
    hit(key) {
      const t = now();
      let b = buckets.get(key);
      if (!b || b.resetAt <= t) {
        b = { count: 0, resetAt: t + windowMs };
        buckets.set(key, b);
      }
      if (b.count >= limit) {
        return { ok: false, remaining: 0, retryAfterS: Math.ceil((b.resetAt - t) / 1000) };
      }
      b.count += 1;
      return { ok: true, remaining: limit - b.count, retryAfterS: 0 };
    },
    /** Undo a hit (e.g. when a request was rejected before reaching Gemini). */
    refund(key) {
      const b = buckets.get(key);
      if (b && b.count > 0) b.count -= 1;
    },
    peek(key) {
      const b = buckets.get(key);
      return b && b.resetAt > now() ? b.count : 0;
    },
    reset(key) {
      buckets.delete(key);
    },
  };
}

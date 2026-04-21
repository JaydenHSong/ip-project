// Design Ref: products module §6.3
// Plan SC: supports SC-04 (external integration stability)
//
// Token bucket rate limiter with per-key (region) independent quotas.
// Extracted as a shared util so both ads and products can use the same pattern.
//
// Usage:
//   const limit = createRateLimiter({ requestsPerSecond: 5, burst: 5 });
//   const result = await limit.run('NA', () => fetch(url)); // key='NA' for region

export type RateLimiterConfig = {
  requestsPerSecond: number;
  burst: number;
  /** Queue capacity per key. Requests beyond this reject immediately. Default: 100 */
  maxQueue?: number;
};

export type RateLimiter = {
  run<T>(key: string, fn: () => Promise<T>): Promise<T>;
  /** Returns number of queued items per key (for observability). */
  stats(): Record<string, { queued: number; tokens: number }>;
  /** Clears in-memory state. Test helper. */
  reset(key?: string): void;
};

type Bucket = {
  tokens: number;
  lastRefillAt: number;
  queue: Array<() => void>;
};

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const { requestsPerSecond, burst, maxQueue = 100 } = config;

  if (requestsPerSecond <= 0) {
    throw new Error('requestsPerSecond must be > 0');
  }
  if (burst <= 0) {
    throw new Error('burst must be > 0');
  }

  const buckets = new Map<string, Bucket>();

  function getBucket(key: string): Bucket {
    let b = buckets.get(key);
    if (!b) {
      b = { tokens: burst, lastRefillAt: Date.now(), queue: [] };
      buckets.set(key, b);
    }
    return b;
  }

  function refill(b: Bucket): void {
    const now = Date.now();
    const elapsed = (now - b.lastRefillAt) / 1000;
    if (elapsed <= 0) return;

    const add = elapsed * requestsPerSecond;
    b.tokens = Math.min(burst, b.tokens + add);
    b.lastRefillAt = now;
  }

  function tryConsume(b: Bucket): boolean {
    refill(b);
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return true;
    }
    return false;
  }

  function acquire(key: string): Promise<void> {
    const b = getBucket(key);

    if (tryConsume(b)) {
      return Promise.resolve();
    }

    if (b.queue.length >= maxQueue) {
      return Promise.reject(
        new Error(`Rate limiter queue full for key="${key}" (max=${maxQueue})`)
      );
    }

    return new Promise<void>((resolve) => {
      b.queue.push(resolve);
      schedule(key);
    });
  }

  function schedule(key: string): void {
    const b = getBucket(key);
    refill(b);

    while (b.queue.length > 0 && b.tokens >= 1) {
      b.tokens -= 1;
      const next = b.queue.shift();
      if (next) next();
    }

    if (b.queue.length > 0) {
      // Tokens deplete — wait until next whole token is available.
      const msUntilNext = Math.max(50, Math.ceil((1 - b.tokens) * 1000 / requestsPerSecond));
      setTimeout(() => schedule(key), msUntilNext);
    }
  }

  return {
    async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
      await acquire(key);
      return fn();
    },

    stats(): Record<string, { queued: number; tokens: number }> {
      const out: Record<string, { queued: number; tokens: number }> = {};
      for (const [k, b] of buckets) {
        refill(b);
        out[k] = { queued: b.queue.length, tokens: Math.floor(b.tokens) };
      }
      return out;
    },

    reset(key?: string): void {
      if (key === undefined) {
        buckets.clear();
      } else {
        buckets.delete(key);
      }
    },
  };
}

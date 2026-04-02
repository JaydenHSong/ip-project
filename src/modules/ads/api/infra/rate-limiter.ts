// Design Ref: §6.1 — Token Bucket rate limiter (10 req/sec per profile)
// Plan SC: SC-04 Rate Limit 60% 이하

type TokenBucket = {
  tokens: number
  lastRefill: number
  totalRequests: number
  windowStart: number
}

export class RateLimiter {
  private buckets = new Map<string, TokenBucket>()
  private maxRate: number
  private burstSize: number

  constructor(maxRate = 10, burstSize = 10) {
    this.maxRate = maxRate
    this.burstSize = burstSize
  }

  async acquire(profileId: string): Promise<void> {
    const bucket = this.getBucket(profileId)
    this.refill(bucket)

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1
      bucket.totalRequests += 1
      return
    }

    // Wait for next token
    const waitMs = (1 / this.maxRate) * 1000
    await new Promise(resolve => setTimeout(resolve, waitMs))
    this.refill(bucket)
    bucket.tokens -= 1
    bucket.totalRequests += 1
  }

  getUtilization(profileId: string): number {
    const bucket = this.buckets.get(profileId)
    if (!bucket) return 0

    const elapsed = (Date.now() - bucket.windowStart) / 1000
    if (elapsed <= 0) return 0

    const rateUsed = bucket.totalRequests / elapsed
    return Math.min(rateUsed / this.maxRate, 1.0)
  }

  reset(profileId: string): void {
    this.buckets.delete(profileId)
  }

  private getBucket(profileId: string): TokenBucket {
    let bucket = this.buckets.get(profileId)
    if (!bucket) {
      bucket = {
        tokens: this.burstSize,
        lastRefill: Date.now(),
        totalRequests: 0,
        windowStart: Date.now(),
      }
      this.buckets.set(profileId, bucket)
    }
    return bucket
  }

  private refill(bucket: TokenBucket): void {
    const now = Date.now()
    const elapsed = (now - bucket.lastRefill) / 1000
    const newTokens = elapsed * this.maxRate
    bucket.tokens = Math.min(bucket.tokens + newTokens, this.burstSize)
    bucket.lastRefill = now

    // Reset window every 60s for utilization tracking
    if (now - bucket.windowStart > 60_000) {
      bucket.totalRequests = 0
      bucket.windowStart = now
    }
  }
}

// Singleton
export const rateLimiter = new RateLimiter()

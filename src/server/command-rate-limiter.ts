/**
 * O(1), in-memory token bucket for one linked WhatsApp account.
 * A full bucket allows short bursts; steady traffic refills at the configured rate.
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillAt: number;

  constructor(
    public readonly capacity = 5,
    private readonly refillPerSecond = 4,
    now = performance.now(),
  ) {
    if (!Number.isFinite(capacity) || capacity <= 0) {
      throw new RangeError('Token bucket capacity must be positive.');
    }
    if (!Number.isFinite(refillPerSecond) || refillPerSecond <= 0) {
      throw new RangeError('Token refill rate must be positive.');
    }
    this.tokens = capacity;
    this.lastRefillAt = now;
  }

  private refill(now: number): void {
    const monotonicNow = Math.max(this.lastRefillAt, now);
    const elapsedSeconds = (monotonicNow - this.lastRefillAt) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsedSeconds * this.refillPerSecond,
    );
    this.lastRefillAt = monotonicNow;
  }

  tryConsume(now = performance.now()): boolean {
    this.refill(now);
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  getAvailableTokens(now = performance.now()): number {
    this.refill(now);
    return Math.round(this.tokens * 100) / 100;
  }
}

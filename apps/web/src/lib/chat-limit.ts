// Per-process abuse backstop; the provider enforces its shared account-wide allowance.
export class ChatLimiter {
  private day = "";
  private total = 0;
  private buckets = new Map<string, { count: number; reset: number }>();
  consume(identity: string, now = Date.now()) {
    const today = new Date(now).toISOString().slice(0, 10);
    if (this.day !== today) {
      this.day = today;
      this.total = 0;
      this.buckets.clear();
    }
    if (this.total >= 40)
      return {
        allowed: false,
        retryAfter: Math.ceil((Date.parse(today + "T00:00:00Z") + 86400000 - now) / 1000),
        daily: true,
      };
    for (const [key, value] of this.buckets) if (value.reset <= now) this.buckets.delete(key);
    if (!this.buckets.has(identity) && this.buckets.size >= 10000)
      return { allowed: false, retryAfter: 60, daily: false };
    const bucket = this.buckets.get(identity) ?? { count: 0, reset: now + 60000 };
    if (bucket.count >= 5)
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((bucket.reset - now) / 1000)),
        daily: false,
      };
    bucket.count++;
    this.buckets.set(identity, bucket);
    this.total++;
    return { allowed: true, retryAfter: 0, daily: false };
  }
}
const limiter = new ChatLimiter();
export const consumeChatRequest = (identity: string) => limiter.consume(identity);

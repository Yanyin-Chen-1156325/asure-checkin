type Attempt = { failures: number[]; blockedUntil: number };

export type LoginLimit = Readonly<{ allowed: boolean; retryAfterSeconds: number }>;

export class LoginLimiter {
  private readonly attempts = new Map<string, Attempt>();

  constructor(
    private readonly maximumFailures = 5,
    private readonly windowMilliseconds = 15 * 60 * 1000,
    private readonly blockMilliseconds = 15 * 60 * 1000,
    private readonly maximumKeys = 5_000,
  ) {}

  check(key: string, now = Date.now()): LoginLimit {
    const attempt = this.attempts.get(key);
    if (!attempt || attempt.blockedUntil <= now) {
      if (attempt?.blockedUntil) this.attempts.delete(key);
      return { allowed: true, retryAfterSeconds: 0 };
    }
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((attempt.blockedUntil - now) / 1000)) };
  }

  recordFailure(key: string, now = Date.now()): LoginLimit {
    this.prune(now);
    const existing = this.attempts.get(key) ?? { failures: [], blockedUntil: 0 };
    existing.failures = existing.failures.filter((timestamp) => timestamp > now - this.windowMilliseconds);
    existing.failures.push(now);
    if (existing.failures.length >= this.maximumFailures) existing.blockedUntil = now + this.blockMilliseconds;
    this.attempts.set(key, existing);
    return this.check(key, now);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  private prune(now: number): void {
    for (const [key, attempt] of this.attempts) {
      const stale = attempt.blockedUntil <= now && attempt.failures.every((timestamp) => timestamp <= now - this.windowMilliseconds);
      if (stale) this.attempts.delete(key);
    }
    while (this.attempts.size >= this.maximumKeys) {
      const oldestKey = this.attempts.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.attempts.delete(oldestKey);
    }
  }
}

export const loginLimiter = new LoginLimiter();

export function loginClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const candidate = forwarded || realIp || "unknown";
  return /^[A-Fa-f0-9:.]{2,64}$/.test(candidate) ? candidate : "unknown";
}

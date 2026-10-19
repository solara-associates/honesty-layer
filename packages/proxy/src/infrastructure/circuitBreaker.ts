/**
 * A5.6 / A7.timeouts — every external call has a timeout and circuit breaker.
 * Minimal breaker: after `failureThreshold` consecutive failures, the breaker
 * opens for `resetAfterMs` and every call fails fast with CircuitOpenError
 * instead of hitting the provider — which is what lets the NFR's documented
 * fail-open path (requests go direct to provider) trigger promptly.
 */
export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit "${name}" is open`);
    this.name = "CircuitOpenError";
  }
}

export class TimeoutError extends Error {
  constructor(name: string, timeoutMs: number) {
    super(`Call "${name}" exceeded ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

export class CircuitBreaker {
  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly name: string,
    private readonly failureThreshold = 5,
    private readonly resetAfterMs = 30_000
  ) {}

  private isOpen(): boolean {
    if (this.openedAt === null) return false;
    if (Date.now() - this.openedAt > this.resetAfterMs) {
      this.openedAt = null;
      this.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  async call<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
    if (this.isOpen()) throw new CircuitOpenError(this.name);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await fn(controller.signal);
      this.consecutiveFailures = 0;
      return result;
    } catch (err) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.openedAt = Date.now();
      }
      if (controller.signal.aborted) {
        throw new TimeoutError(this.name, timeoutMs);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

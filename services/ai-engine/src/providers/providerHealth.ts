/**
 * Provider Health Tracking & Circuit Breaker Architecture
 *
 * Implements a 3-state circuit breaker (CLOSED, OPEN, HALF_OPEN) per provider.
 * Ensures that broken providers do not consume the inspection latency budget.
 * Emits operational health summaries safe for monitoring without credentials.
 */

import type { AIProviderName } from '@lm-vision/shared-types';
import type {
  CircuitState,
  ProviderHealthState,
  ProviderMetricSnapshot,
} from './providerTypes.js';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // default: 3 consecutive failures
  cooldownMs?: number;       // default: 30000ms
}

/**
 * Thread-safe provider-specific Circuit Breaker.
 */
export class ProviderCircuitBreaker {
  public readonly provider: AIProviderName;
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private openUntilTimestamp = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(provider: AIProviderName, options?: CircuitBreakerOptions) {
    this.provider = provider;
    this.failureThreshold = options?.failureThreshold ?? 3;
    this.cooldownMs = options?.cooldownMs ?? 30000;
  }

  /**
   * Checks whether a request can be dispatched to this provider.
   * If OPEN and cooldown has elapsed, automatically transitions to HALF_OPEN.
   */
  public canExecute(): boolean {
    const now = Date.now();

    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      if (now >= this.openUntilTimestamp) {
        // Cooldown expired: probe provider in HALF_OPEN state
        this.state = 'HALF_OPEN';
        return true;
      }
      return false; // Still within cooldown window
    }

    // HALF_OPEN: allow a single probe execution
    return true;
  }

  /**
   * Record a successful execution.
   */
  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  /**
   * Record a failed execution.
   */
  public recordFailure(): void {
    this.consecutiveFailures++;

    if (this.state === 'HALF_OPEN') {
      // Probe failed: trip circuit back to OPEN immediately with full cooldown
      this.state = 'OPEN';
      this.openUntilTimestamp = Date.now() + this.cooldownMs;
      return;
    }

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openUntilTimestamp = Date.now() + this.cooldownMs;
    }
  }

  public getState(): CircuitState {
    // If OPEN but time expired, evaluate to HALF_OPEN
    if (this.state === 'OPEN' && Date.now() >= this.openUntilTimestamp) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  public getOpenUntilTimestamp(): number {
    return this.openUntilTimestamp;
  }

  /**
   * Manually trip the circuit (e.g. for testing).
   */
  public trip(cooldownMs?: number): void {
    this.state = 'OPEN';
    this.openUntilTimestamp = Date.now() + (cooldownMs ?? this.cooldownMs);
  }

  /**
   * Reset circuit to CLOSED (e.g. for testing).
   */
  public reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.openUntilTimestamp = 0;
  }
}

/**
 * Aggregates runtime health and circuit breaker states across all active AI providers.
 */
export class ProviderHealthTracker {
  private readonly circuitBreakers = new Map<AIProviderName, ProviderCircuitBreaker>();
  private readonly metrics = new Map<AIProviderName, ProviderMetricSnapshot>();

  constructor() {
    this.initProvider('GEMINI');
    this.initProvider('GROK');
  }

  private initProvider(provider: AIProviderName): void {
    if (!this.circuitBreakers.has(provider)) {
      this.circuitBreakers.set(provider, new ProviderCircuitBreaker(provider));
    }
    if (!this.metrics.has(provider)) {
      this.metrics.set(provider, {
        provider,
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        timeoutCount: 0,
        rateLimitCount: 0,
        serverErrorCount: 0,
        authErrorCount: 0,
        schemaErrorCount: 0,
        averageLatencyMs: 0,
        circuitState: 'CLOSED',
        healthState: 'AVAILABLE',
      });
    }
  }

  public getCircuitBreaker(provider: AIProviderName): ProviderCircuitBreaker {
    this.initProvider(provider);
    return this.circuitBreakers.get(provider)!;
  }

  public recordRequest(provider: AIProviderName): void {
    this.initProvider(provider);
    const m = this.metrics.get(provider)!;
    m.requestCount++;
  }

  public recordSuccess(provider: AIProviderName, latencyMs: number): void {
    this.initProvider(provider);
    const cb = this.circuitBreakers.get(provider)!;
    cb.recordSuccess();

    const m = this.metrics.get(provider)!;
    m.successCount++;
    m.averageLatencyMs = Math.round(
      (m.averageLatencyMs * (m.successCount - 1) + latencyMs) / m.successCount
    );
    m.circuitState = cb.getState();
    m.healthState = this.computeHealth(m, cb);
    m.lastSuccessAt = new Date().toISOString();
  }

  public recordFailure(
    provider: AIProviderName,
    category: string,
    reason: string
  ): void {
    this.initProvider(provider);
    const cb = this.circuitBreakers.get(provider)!;
    cb.recordFailure();

    const m = this.metrics.get(provider)!;
    m.failureCount++;
    if (category === 'TIMEOUT') m.timeoutCount++;
    else if (category === 'RATE_LIMITED') m.rateLimitCount++;
    else if (category === 'AUTH_ERROR') m.authErrorCount++;
    else if (category === 'SCHEMA_VALIDATION_ERROR' || category === 'MALFORMED_RESPONSE') m.schemaErrorCount++;
    else if (category === 'PROVIDER_UNAVAILABLE') m.serverErrorCount++;

    m.circuitState = cb.getState();
    m.healthState = this.computeHealth(m, cb);
    m.lastFailureAt = new Date().toISOString();
    m.lastFailureReason = reason;
  }

  private computeHealth(
    m: ProviderMetricSnapshot,
    cb: ProviderCircuitBreaker
  ): ProviderHealthState {
    const circuit = cb.getState();
    if (circuit === 'OPEN') return 'UNAVAILABLE';
    if (circuit === 'HALF_OPEN') return 'DEGRADED';
    if (m.failureCount > 0 && m.successCount === 0 && m.requestCount >= 2) return 'UNAVAILABLE';
    if (m.failureCount > 0 && m.failureCount / m.requestCount > 0.3) return 'DEGRADED';
    return 'AVAILABLE';
  }

  public getSnapshot(provider: AIProviderName): ProviderMetricSnapshot {
    this.initProvider(provider);
    const cb = this.circuitBreakers.get(provider)!;
    const m = this.metrics.get(provider)!;
    m.circuitState = cb.getState();
    m.healthState = this.computeHealth(m, cb);
    return { ...m };
  }

  public getAllSnapshots(): ProviderMetricSnapshot[] {
    return Array.from(this.metrics.keys()).map((p) => this.getSnapshot(p));
  }

  /**
   * Returns operational summary for GET /health/ai endpoint.
   * Guaranteed to contain zero keys or secrets.
   */
  public getOperationalHealthSummary(): {
    status: ProviderHealthState;
    cloudOverall: ProviderHealthState;
    timestamp: string;
    providers: Record<
      string,
      {
        status: ProviderHealthState;
        circuit: CircuitState;
        latencyMs: number;
        successRate: number;
        lastSuccess?: string;
        lastFailure?: string;
      }
    >;
  } {
    const gemini = this.getSnapshot('GEMINI');
    const grok = this.getSnapshot('GROK');

    // Overall cloud availability: AVAILABLE if at least one cloud provider is healthy
    let cloudOverall: ProviderHealthState = 'UNAVAILABLE';
    if (gemini.healthState === 'AVAILABLE' || grok.healthState === 'AVAILABLE') {
      cloudOverall = 'AVAILABLE';
    } else if (gemini.healthState === 'DEGRADED' || grok.healthState === 'DEGRADED') {
      cloudOverall = 'DEGRADED';
    }

    const calcRate = (s: number, total: number) => (total > 0 ? Number((s / total).toFixed(3)) : 1.0);

    return {
      status: cloudOverall,
      cloudOverall,
      timestamp: new Date().toISOString(),
      providers: {
        GEMINI: {
          status: gemini.healthState,
          circuit: gemini.circuitState,
          latencyMs: gemini.averageLatencyMs,
          successRate: calcRate(gemini.successCount, gemini.requestCount),
          lastSuccess: gemini.lastSuccessAt,
          lastFailure: gemini.lastFailureAt,
        },
        GROK: {
          status: grok.healthState,
          circuit: grok.circuitState,
          latencyMs: grok.averageLatencyMs,
          successRate: calcRate(grok.successCount, grok.requestCount),
          lastSuccess: grok.lastSuccessAt,
          lastFailure: grok.lastFailureAt,
        },
      },
    };
  }

  public resetAll(): void {
    for (const cb of this.circuitBreakers.values()) {
      cb.reset();
    }
    for (const key of this.metrics.keys()) {
      const m = this.metrics.get(key)!;
      m.requestCount = 0;
      m.successCount = 0;
      m.failureCount = 0;
      m.timeoutCount = 0;
      m.rateLimitCount = 0;
      m.serverErrorCount = 0;
      m.authErrorCount = 0;
      m.schemaErrorCount = 0;
      m.averageLatencyMs = 0;
      m.circuitState = 'CLOSED';
      m.healthState = 'AVAILABLE';
      delete m.lastSuccessAt;
      delete m.lastFailureAt;
      delete m.lastFailureReason;
    }
  }
}

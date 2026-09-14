/**
 * Sanitized AI Provider Metrics Collector
 *
 * Tracks latency distributions, success/failure counts, and failure categories.
 * Security Invariant: Absolutely NO API keys, authorization tokens, or user credentials stored.
 */

import type { AIProviderName } from '@lm-vision/shared-types';
import type { FailureCategory, ProviderMetricSnapshot } from './providerTypes.js';

export interface RecordMetricParams {
  provider: AIProviderName;
  durationMs: number;
  success: boolean;
  failureCategory?: FailureCategory;
  errorReason?: string;
}

export class ProviderMetricsCollector {
  private readonly latencies = new Map<AIProviderName, number[]>();
  private readonly snapshots = new Map<AIProviderName, ProviderMetricSnapshot>();

  constructor() {
    this.initProvider('GEMINI');
    this.initProvider('GROK');
  }

  private initProvider(provider: AIProviderName): void {
    if (!this.latencies.has(provider)) {
      this.latencies.set(provider, []);
    }
    if (!this.snapshots.has(provider)) {
      this.snapshots.set(provider, {
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

  public record(params: RecordMetricParams): void {
    const { provider, durationMs, success, failureCategory, errorReason } = params;
    this.initProvider(provider);

    const s = this.snapshots.get(provider)!;
    const l = this.latencies.get(provider)!;

    s.requestCount++;
    l.push(durationMs);
    if (l.length > 100) l.shift(); // retain rolling 100 observations

    const sum = l.reduce((acc, v) => acc + v, 0);
    s.averageLatencyMs = Math.round(sum / l.length);

    if (success) {
      s.successCount++;
      s.lastSuccessAt = new Date().toISOString();
    } else {
      s.failureCount++;
      s.lastFailureAt = new Date().toISOString();
      if (errorReason) {
        // Sanitize errorReason: strip out any potential key patterns
        s.lastFailureReason = errorReason.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]').replace(/xai-[a-zA-Z0-9_-]+/g, '[REDACTED_KEY]');
      }

      if (failureCategory === 'TIMEOUT') s.timeoutCount++;
      else if (failureCategory === 'RATE_LIMITED') s.rateLimitCount++;
      else if (failureCategory === 'AUTH_ERROR') s.authErrorCount++;
      else if (failureCategory === 'SCHEMA_VALIDATION_ERROR' || failureCategory === 'MALFORMED_RESPONSE') s.schemaErrorCount++;
      else if (failureCategory === 'PROVIDER_UNAVAILABLE') s.serverErrorCount++;
    }
  }

  public getSnapshot(provider: AIProviderName): ProviderMetricSnapshot {
    this.initProvider(provider);
    return { ...this.snapshots.get(provider)! };
  }

  public getAllSnapshots(): ProviderMetricSnapshot[] {
    return Array.from(this.snapshots.keys()).map((p) => this.getSnapshot(p));
  }

  public reset(): void {
    this.latencies.clear();
    this.snapshots.clear();
    this.initProvider('GEMINI');
    this.initProvider('GROK');
  }
}

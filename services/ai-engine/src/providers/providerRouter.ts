/**
 * Production-Grade AI Provider Router
 *
 * Implements 3-tier sequential failover architecture:
 * GEMINI (Primary) -> xAI GROK (Secondary) -> CLOUD_AI_UNAVAILABLE (Terminal Cloud State)
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Sequential Failover: Gemini first; Grok secondary; never simultaneous redundant cloud calls.
 * 2. Immediate 503 Failover: Gemini high-demand/503 skips retries and immediately attempts Grok.
 * 3. Strict Timeout Budget: Enforces total ceiling (AI_TOTAL_TIMEOUT_MS) across all attempts.
 * 4. Circuit Breakers: Bypasses OPEN providers during cooldown to save inspection time.
 * 5. No Node Local OCR Duplication: Terminal cloud state returns CLOUD_AI_UNAVAILABLE;
 *    the mobile client continues its own on-device local perception pipeline.
 * 6. Canonical Output Contract: Both Gemini and Grok normalize to CanonicalAIObservationResult.
 * 7. Security: Zero API key leakage into logs, metrics, or client responses.
 */

import { randomUUID } from 'node:crypto';
import type {
  AIProvider,
  AIProviderName,
  PackageAnalysis,
  PackageAnalysisInput,
} from '@lm-vision/shared-types';
import type {
  AIFailoverEvent,
  CanonicalAIObservationResult,
  RouterConfig,
} from './providerTypes.js';
import { classifyProviderError, ProviderError } from './providerErrors.js';
import { ProviderHealthTracker } from './providerHealth.js';
import { ProviderMetricsCollector } from './providerMetrics.js';
import { GeminiProvider, type GeminiProviderOptions } from './gemini-provider.js';
import { GrokProvider, type GrokProviderOptions } from './grokProvider.js';

export interface ProviderRouterOptions {
  config?: Partial<RouterConfig>;
  geminiProvider?: AIProvider;
  grokProvider?: AIProvider;
  healthTracker?: ProviderHealthTracker;
  metricsCollector?: ProviderMetricsCollector;
  geminiOptions?: GeminiProviderOptions;
  grokOptions?: GrokProviderOptions;
}

export class ProviderRouter {
  private readonly config: RouterConfig;
  private readonly geminiProvider: AIProvider;
  private readonly grokProvider: AIProvider;
  private readonly healthTracker: ProviderHealthTracker;
  private readonly metricsCollector: ProviderMetricsCollector;
  private readonly failoverHistory: AIFailoverEvent[] = [];

  constructor(options?: ProviderRouterOptions) {
    const totalTimeout = Number(process.env['AI_TOTAL_TIMEOUT_MS'] || 25000);
    const geminiTimeout = Number(process.env['GEMINI_TIMEOUT_MS'] || 7000);
    const grokTimeout = Number(process.env['GROK_TIMEOUT_MS'] || 7000);

    const safeTotalTimeout = isNaN(totalTimeout) || totalTimeout < 10000 ? 25000 : totalTimeout;
    const safeGeminiTimeout = isNaN(geminiTimeout) || geminiTimeout <= 0 ? 7000 : Math.min(geminiTimeout, 10000);
    const safeGrokTimeout = isNaN(grokTimeout) || grokTimeout <= 0 ? 7000 : grokTimeout;

    this.config = {
      order: options?.config?.order || ['GEMINI', 'GROK'],
      totalTimeoutMs: options?.config?.totalTimeoutMs ?? safeTotalTimeout,
      geminiTimeoutMs: options?.config?.geminiTimeoutMs ?? safeGeminiTimeout,
      grokTimeoutMs: options?.config?.grokTimeoutMs ?? safeGrokTimeout,
      maxRetries: options?.config?.maxRetries ?? 1,
      circuitBreakerFailureThreshold: options?.config?.circuitBreakerFailureThreshold ?? 3,
      circuitBreakerCooldownMs: options?.config?.circuitBreakerCooldownMs ?? 30000,
    };

    this.healthTracker = options?.healthTracker || new ProviderHealthTracker();
    this.metricsCollector = options?.metricsCollector || new ProviderMetricsCollector();

    this.geminiProvider =
      options?.geminiProvider ||
      new GeminiProvider({
        ...options?.geminiOptions,
        timeoutMs: this.config.geminiTimeoutMs,
      });

    this.grokProvider =
      options?.grokProvider ||
      new GrokProvider({
        ...options?.grokOptions,
        timeoutMs: this.config.grokTimeoutMs,
      });
  }

  public getHealthTracker(): ProviderHealthTracker {
    return this.healthTracker;
  }

  public getMetricsCollector(): ProviderMetricsCollector {
    return this.metricsCollector;
  }

  public getFailoverHistory(): AIFailoverEvent[] {
    return [...this.failoverHistory];
  }

  public getConfig(): RouterConfig {
    return { ...this.config };
  }

  /**
   * Main router entrypoint: executes package analysis through failover hierarchy.
   */
  public async routePackageAnalysis(
    input: PackageAnalysisInput,
    preferredProvider?: AIProviderName
  ): Promise<CanonicalAIObservationResult> {
    const overallStartTime = Date.now();
    const requestId = randomUUID();
    const attemptedProviders: AIProviderName[] = [];
    let fallbackFrom: AIProviderName | undefined;

    // Determine provider sequence
    let sequence: AIProviderName[] = [...this.config.order];
    if (preferredProvider && sequence.includes(preferredProvider)) {
      sequence = [preferredProvider, ...sequence.filter((p) => p !== preferredProvider)];
    }

    for (const providerName of sequence) {
      // 1. Enforce remaining total timeout budget
      const elapsedOverall = Date.now() - overallStartTime;
      const remainingBudget = this.config.totalTimeoutMs - elapsedOverall;

      if (remainingBudget <= 500) {
        // Ceiling exhausted: terminate cloud attempts
        console.warn(`[AI Router] Total timeout budget (${this.config.totalTimeoutMs}ms) exhausted before calling ${providerName}.`);
        break;
      }

      // 2. Check Circuit Breaker for this provider
      const cb = this.healthTracker.getCircuitBreaker(providerName);
      if (!cb.canExecute()) {
        console.warn(`[AI Router] Circuit breaker for ${providerName} is OPEN. Bypassing provider to preserve latency.`);
        this.recordFailoverEvent({
          requestId,
          fromProvider: providerName,
          toProvider: sequence.find((p) => p !== providerName),
          failureCategory: 'PROVIDER_UNAVAILABLE',
          errorMessage: `Circuit breaker OPEN (cooldown active until ${new Date(cb.getOpenUntilTimestamp()).toISOString()})`,
          retryAttempt: 0,
          latencyMs: 0,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // 3. Dispatch to Provider with allocated timeout & retry policy
      attemptedProviders.push(providerName);
      this.healthTracker.recordRequest(providerName);
      const providerStartTime = Date.now();

      try {
        const analysis = await this.executeProviderWithRetry(
          providerName,
          input,
          remainingBudget
        );

        const providerLatency = Date.now() - providerStartTime;
        this.healthTracker.recordSuccess(providerName, providerLatency);
        this.metricsCollector.record({
          provider: providerName,
          durationMs: providerLatency,
          success: true,
        });

        return {
          provider: providerName,
          model: analysis.modelName || 'vision-model',
          status: 'CLOUD_AI_SUCCESS',
          observations: analysis.declarations || [],
          latencyMs: Date.now() - overallStartTime,
          requestId,
          generatedAt: new Date().toISOString(),
          fallbackFrom,
          cloudProvidersAttempted: attemptedProviders,
          packageAnalysis: analysis,
        };
      } catch (err: any) {
        const providerLatency = Date.now() - providerStartTime;
        const providerError = classifyProviderError(providerName, err);

        this.healthTracker.recordFailure(
          providerName,
          providerError.category,
          providerError.message
        );
        this.metricsCollector.record({
          provider: providerName,
          durationMs: providerLatency,
          success: false,
          failureCategory: providerError.category,
          errorReason: providerError.message,
        });

        const nextProvider = sequence.find((p) => !attemptedProviders.includes(p));
        fallbackFrom = providerName;

        this.recordFailoverEvent({
          requestId,
          fromProvider: providerName,
          toProvider: nextProvider,
          failureCategory: providerError.category,
          httpStatus: providerError.httpStatus,
          errorMessage: providerError.message,
          retryAttempt: 1,
          latencyMs: providerLatency,
          timestamp: new Date().toISOString(),
        });

        console.warn(
          `[AI Router] ${providerName} failed (${providerError.category}): ${providerError.message}. Failover to ${nextProvider || 'CLOUD_AI_UNAVAILABLE'}.`
        );
      }
    }

    // All cloud providers failed or timed out: return canonical terminal cloud state
    const totalDuration = Date.now() - overallStartTime;
    return {
      provider: 'LOCAL_OCR',
      model: 'none',
      status: 'CLOUD_AI_UNAVAILABLE',
      observations: [],
      latencyMs: totalDuration,
      requestId,
      generatedAt: new Date().toISOString(),
      fallbackFrom,
      cloudProvidersAttempted: attemptedProviders,
      error: `All cloud AI providers failed or timed out (${attemptedProviders.join(' -> ') || 'None'}).`,
      failureCategory: 'PROVIDER_UNAVAILABLE',
    };
  }

  /**
   * Executes a single provider with bounded retries and remaining budget enforcement.
   */
  private async executeProviderWithRetry(
    providerName: AIProviderName,
    input: PackageAnalysisInput,
    remainingBudgetMs: number
  ): Promise<PackageAnalysis> {
    const provider = providerName === 'GROK' ? this.grokProvider : this.geminiProvider;
    const providerTimeout =
      providerName === 'GROK' ? this.config.grokTimeoutMs : this.config.geminiTimeoutMs;
    // When executing Gemini, reserve budget for Grok so Gemini timeout never starves Grok
    const effectiveTimeout =
      providerName === 'GEMINI' && remainingBudgetMs > this.config.grokTimeoutMs
        ? Math.min(providerTimeout, Math.max(3000, remainingBudgetMs - this.config.grokTimeoutMs))
        : providerTimeout;
    const allocatedBudget = Math.min(effectiveTimeout, remainingBudgetMs);

    let attempt = 0;
    const maxAttempts = this.config.maxRetries + 1; // e.g. 1 retry = 2 attempts total

    while (attempt < maxAttempts) {
      attempt++;
      try {
        return await this.executeWithBudget(provider, input, allocatedBudget);
      } catch (err: any) {
        const classified = classifyProviderError(providerName, err);

        // Immediate failover for non-retryable errors (e.g. 503 high-demand, 401 auth, schema error, timeout)
        if (!classified.isRetryable || attempt >= maxAttempts) {
          throw classified;
        }

        // Brief delay before transient retry
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    throw new ProviderError({
      provider: providerName,
      category: 'PROVIDER_UNAVAILABLE',
      message: `${providerName} exhausted retry attempts.`,
      httpStatus: 503,
      isRetryable: false,
    });
  }

  private async executeWithBudget(
    provider: AIProvider,
    input: PackageAnalysisInput,
    timeoutMs: number
  ): Promise<PackageAnalysis> {
    return new Promise<PackageAnalysis>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(
            new ProviderError({
              provider: provider.name,
              category: 'TIMEOUT',
              message: `${provider.name} exceeded allocated timeout budget of ${timeoutMs}ms.`,
              httpStatus: 504,
              isRetryable: false,
            })
          );
        }
      }, timeoutMs);

      provider
        .analyzePackage(input)
        .then((res) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(res);
          }
        })
        .catch((err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  }

  private recordFailoverEvent(event: AIFailoverEvent): void {
    this.failoverHistory.push(event);
    if (this.failoverHistory.length > 50) {
      this.failoverHistory.shift();
    }
  }

  public reset(): void {
    this.healthTracker.resetAll();
    this.metricsCollector.reset();
    this.failoverHistory.length = 0;
  }
}

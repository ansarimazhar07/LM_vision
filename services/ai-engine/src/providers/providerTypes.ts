/**
 * Production AI Provider Router Domain Types & Schemas
 *
 * Provides canonical types for multi-provider routing (Gemini -> xAI Grok -> Cloud Unavailable),
 * health tracking, failure classification, circuit breakers, and sanitized performance metrics.
 */

import type {
  AIProviderName,
  CloudAIStatus,
  Declaration,
  PackageAnalysis,
} from '@lm-vision/shared-types';

export type { CloudAIStatus };

/**
 * Standardized categorization of provider failure modes.
 */
export type FailureCategory =
  | 'PROVIDER_UNAVAILABLE'     // HTTP 500, 502, 503, 504, high demand, capacity exhausted
  | 'RATE_LIMITED'              // HTTP 429
  | 'TIMEOUT'                   // Exceeded per-call or overall budget
  | 'MALFORMED_RESPONSE'        // Unparseable JSON or empty completion
  | 'SCHEMA_VALIDATION_ERROR'   // JSON schema mismatch against canonical domain model
  | 'NETWORK_ERROR'             // DNS failure, connection reset, socket hang up
  | 'AUTH_ERROR';               // HTTP 401, 403 invalid API key or permissions

/**
 * Circuit breaker states.
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Provider operational health states.
 */
export type ProviderHealthState = 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';

/**
 * Sanitized, thread-safe metrics snapshot for a specific provider.
 * Guaranteed never to store API keys or sensitive authorization data.
 */
export interface ProviderMetricSnapshot {
  provider: AIProviderName;
  requestCount: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  rateLimitCount: number;
  serverErrorCount: number;
  authErrorCount: number;
  schemaErrorCount: number;
  averageLatencyMs: number;
  circuitState: CircuitState;
  healthState: ProviderHealthState;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastFailureReason?: string;
}

/**
 * Canonical AI observation output contract.
 * Returned uniformly regardless of whether Gemini or Grok produced the observation.
 */
export interface CanonicalAIObservationResult {
  provider: AIProviderName;
  model: string;
  status: CloudAIStatus;
  observations: Declaration[];
  latencyMs: number;
  requestId: string;
  generatedAt: string;
  fallbackFrom?: AIProviderName;
  cloudProvidersAttempted?: AIProviderName[];
  packageAnalysis?: PackageAnalysis;
  error?: string;
  failureCategory?: FailureCategory;
}

/**
 * Router configuration parameters.
 */
export interface RouterConfig {
  /** Ordered failover sequence. Default: ['GEMINI', 'GROK'] */
  order: AIProviderName[];
  /** Overall ceiling for cloud AI enrichment in milliseconds. Default: 15000 */
  totalTimeoutMs: number;
  /** Timeout budget for Gemini in milliseconds. Default: 7000 */
  geminiTimeoutMs: number;
  /** Timeout budget for Grok in milliseconds. Default: 7000 */
  grokTimeoutMs: number;
  /** Maximum retry attempts for transient errors before failover. Default: 1 */
  maxRetries: number;
  /** Number of consecutive failures before circuit breaker OPENS. Default: 3 */
  circuitBreakerFailureThreshold: number;
  /** Cooldown window in milliseconds before half-open probe. Default: 30000 */
  circuitBreakerCooldownMs: number;
}

/**
 * Event recorded when a failover occurs between providers.
 */
export interface AIFailoverEvent {
  requestId: string;
  fromProvider: AIProviderName;
  toProvider?: AIProviderName;
  failureCategory: FailureCategory;
  httpStatus?: number;
  errorMessage: string;
  retryAttempt: number;
  latencyMs: number;
  timestamp: string;
}

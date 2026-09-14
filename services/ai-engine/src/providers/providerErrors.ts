/**
 * Provider Error Classification and Normalization
 *
 * Implements deterministic error taxonomy for multi-cloud AI routing:
 * - Differentiates transient failures (network, transient 500) from non-retryable failures (503 high demand, auth error, schema validation).
 * - Enforces immediate failover on Gemini 503 "high demand".
 * - Never logs or reveals API keys or authentication headers in error strings.
 */

import { AppError, type AIProviderName } from '@lm-vision/shared-types';
import type { FailureCategory } from './providerTypes.js';

export class ProviderError extends AppError {
  public readonly provider: AIProviderName;
  public readonly category: FailureCategory;
  public readonly httpStatus?: number;
  public readonly isRetryable: boolean;
  public readonly rawError?: unknown;

  constructor(options: {
    provider: AIProviderName;
    category: FailureCategory;
    message: string;
    httpStatus?: number;
    isRetryable?: boolean;
    rawError?: unknown;
  }) {
    const errorCode =
      options.category === 'AUTH_ERROR'
        ? 'AUTHENTICATION_ERROR'
        : options.category === 'RATE_LIMITED'
        ? 'RATE_LIMITED'
        : options.category === 'SCHEMA_VALIDATION_ERROR'
        ? 'VALIDATION_ERROR'
        : 'AI_PROVIDER_ERROR';

    super({
      code: errorCode,
      message: options.message,
      statusCode: options.httpStatus || (options.category === 'AUTH_ERROR' ? 401 : 502),
    });
    this.provider = options.provider;
    this.category = options.category;
    this.httpStatus = options.httpStatus;
    this.isRetryable = options.isRetryable ?? false;
    this.rawError = options.rawError;
  }
}

/**
 * Deterministically classifies any provider exception or response into a canonical ProviderError.
 */
export function classifyProviderError(
  provider: AIProviderName,
  error: unknown
): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }

  const err = error as Record<string, any> | undefined;
  const rawMsg = String(err?.message || err?.statusText || error || '').trim();
  const msg = rawMsg
    .replace(/Bearer\s+\S+/gi, 'Bearer ***')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]')
    .replace(/xai-[a-zA-Z0-9_-]+/g, '[REDACTED_KEY]');
  const lowerMsg = msg.toLowerCase();
  const status = Number(err?.status || err?.statusCode || err?.httpStatus || 0);

  // 1. Authentication & Authorization Errors
  if (status === 401 || status === 403 || lowerMsg.includes('unauthorized') || lowerMsg.includes('invalid api key') || lowerMsg.includes('forbidden')) {
    return new ProviderError({
      provider,
      category: 'AUTH_ERROR',
      message: `Authentication failed for ${provider}: check API key configuration.`,
      httpStatus: status || 401,
      isRetryable: false,
      rawError: error,
    });
  }

  // 2. Rate Limiting (HTTP 429)
  if (status === 429 || lowerMsg.includes('429') || lowerMsg.includes('rate limit') || lowerMsg.includes('quota')) {
    return new ProviderError({
      provider,
      category: 'RATE_LIMITED',
      message: `${provider} rate limit exceeded (HTTP 429 / Quota exhausted).`,
      httpStatus: 429,
      isRetryable: true,
      rawError: error,
    });
  }

  // 3. Schema Validation & Malformed JSON Errors
  if (
    err?.name === 'ZodError' ||
    lowerMsg.includes('schema validation') ||
    lowerMsg.includes('failed schema validation')
  ) {
    return new ProviderError({
      provider,
      category: 'SCHEMA_VALIDATION_ERROR',
      message: `${provider} response violated canonical output schema.`,
      httpStatus: 502,
      isRetryable: false,
      rawError: error,
    });
  }

  if (
    err instanceof SyntaxError ||
    lowerMsg.includes('unexpected token') ||
    lowerMsg.includes('json.parse') ||
    lowerMsg.includes('malformed') ||
    lowerMsg.includes('syntax parsing') ||
    lowerMsg.includes('unparseable')
  ) {
    return new ProviderError({
      provider,
      category: 'MALFORMED_RESPONSE',
      message: `${provider} returned malformed or unparseable JSON output.`,
      httpStatus: 502,
      isRetryable: false,
      rawError: error,
    });
  }

  // 4. Gemini High Demand / Model Overloaded (HTTP 503)
  // Per requirement: 503 / high-demand MUST trigger IMMEDIATE failover without wasteful retries!
  if (
    status === 503 ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('overloaded') ||
    lowerMsg.includes('currently experiencing high demand') ||
    lowerMsg.includes('model is overloaded')
  ) {
    return new ProviderError({
      provider,
      category: 'PROVIDER_UNAVAILABLE',
      message: `${provider} is experiencing high demand or service unavailability (HTTP 503). Immediate failover triggered.`,
      httpStatus: 503,
      isRetryable: false, // Do NOT retry repeatedly; fail over immediately!
      rawError: error,
    });
  }

  // 5. Timeout / AbortController Cancellation
  if (
    err?.name === 'AbortError' ||
    err?.name === 'TimeoutError' ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('timed out') ||
    lowerMsg.includes('deadline exceeded')
  ) {
    return new ProviderError({
      provider,
      category: 'TIMEOUT',
      message: `${provider} request timed out exceeding allocated latency budget.`,
      httpStatus: 504,
      isRetryable: false,
      rawError: error,
    });
  }

  // 6. Network & Transport Level Errors
  if (
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('enotfound') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('socket hang up') ||
    lowerMsg.includes('network error')
  ) {
    return new ProviderError({
      provider,
      category: 'NETWORK_ERROR',
      message: `Network communication failure connecting to ${provider} API.`,
      httpStatus: 503,
      isRetryable: true,
      rawError: error,
    });
  }

  // 7. Generic Server Outage (500, 502, 504)
  if (status >= 500 && status <= 599) {
    return new ProviderError({
      provider,
      category: 'PROVIDER_UNAVAILABLE',
      message: `${provider} server error (HTTP ${status}).`,
      httpStatus: status,
      isRetryable: true,
      rawError: error,
    });
  }

  // 8. Fallback Default
  return new ProviderError({
    provider,
    category: 'PROVIDER_UNAVAILABLE',
    message: `${provider} operation failed: ${msg || 'Unknown provider error'}`,
    httpStatus: status || 500,
    isRetryable: false,
    rawError: error,
  });
}

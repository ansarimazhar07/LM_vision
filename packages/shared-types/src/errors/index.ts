import { z } from 'zod';
import { ErrorCodeSchema, type ErrorCode } from '../enums/index.js';
import { ApiValidationErrorSchema, type ApiValidationError } from '../api/index.js';

export { ErrorCodeSchema, type ErrorCode };

/**
 * Serialized representation of AppError
 */
export const SerializedAppErrorSchema = z.object({
  name: z.string(),
  code: ErrorCodeSchema,
  message: z.string(),
  statusCode: z.number().int().min(400).max(599),
  validationErrors: z.array(ApiValidationErrorSchema).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string(),
});
export type SerializedAppError = z.infer<typeof SerializedAppErrorSchema>;

/**
 * Standard Application Error
 *
 * Sanitizes errors and ensures provider keys, tokens, or sensitive credentials
 * are never exposed in error messages or client payloads.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly validationErrors?: ApiValidationError[];
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(options: {
    code: ErrorCode;
    message: string;
    statusCode?: number;
    validationErrors?: ApiValidationError[];
    details?: Record<string, unknown>;
    cause?: unknown;
  }) {
    // Strip any obvious API key / secret patterns from message
    const sanitizedMessage = AppError.sanitizeMessage(options.message);
    super(sanitizedMessage, { cause: options.cause });

    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode ?? AppError.defaultStatusCodeFor(options.code);
    this.validationErrors = options.validationErrors;
    this.details = options.details ? AppError.sanitizeDetails(options.details) : undefined;
    this.timestamp = new Date().toISOString();

    Object.setPrototypeOf(this, AppError.prototype);
  }

  public toJSON(): SerializedAppError {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      validationErrors: this.validationErrors,
      details: this.details,
      timestamp: this.timestamp,
    };
  }

  public static defaultStatusCodeFor(code: ErrorCode): number {
    switch (code) {
      case 'VALIDATION_ERROR':
        return 400;
      case 'AUTHENTICATION_ERROR':
        return 401;
      case 'AUTHORIZATION_ERROR':
        return 403;
      case 'NOT_FOUND':
        return 404;
      case 'CONFLICT':
        return 409;
      case 'RATE_LIMITED':
        return 429;
      case 'AI_PROVIDER_ERROR':
      case 'EXTERNAL_SERVICE_ERROR':
        return 502;
      case 'INTERNAL_ERROR':
      default:
        return 500;
    }
  }

  /**
   * Remove sensitive patterns such as bearer tokens and API keys
   */
  public static sanitizeMessage(msg: string): string {
    return msg
      .replace(/AIza[0-9A-Za-z-_]{25,}/g, '[REDACTED_GEMINI_KEY]')
      .replace(/sk-(?:proj-)?[0-9A-Za-z-_]{20,}/g, '[REDACTED_OPENAI_KEY]')
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED_TOKEN]');
  }

  /**
   * Recursively strip sensitive keys from details object
   */
  public static sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['apiKey', 'secret', 'password', 'token', 'authorization', 'geminiKey', 'openAiKey'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(details)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof val === 'string') {
        sanitized[key] = AppError.sanitizeMessage(val);
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        sanitized[key] = AppError.sanitizeDetails(val as Record<string, unknown>);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }
}

import { z } from 'zod';
import {
  AppError,
  type ApiValidationError,
} from '@lm-vision/shared-types';

/**
 * Transforms a ZodError into a structured, API-ready array of validation issues
 */
export function formatZodError(error: z.ZodError): ApiValidationError[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return {
      field: path.length > 0 ? path : 'root',
      message: issue.message,
      code: issue.code,
      receivedValue: 'received' in issue ? issue.received : undefined,
    };
  });
}

export type ValidationResult<T> =
  | { success: true; data: T; errors?: never }
  | { success: false; data?: never; errors: ApiValidationError[] };

/**
 * Safely parse data against a Zod schema without throwing
 */
export function validateSafe<Output, Def extends z.ZodTypeDef = z.ZodTypeDef, Input = unknown>(
  schema: z.ZodType<Output, Def, Input>,
  data: unknown
): ValidationResult<Output> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: formatZodError(result.error),
  };
}

/**
 * Synonym for validateSafe for payload ingestion
 */
export const validatePayload = validateSafe;

/**
 * Validates data against a schema and throws AppError with VALIDATION_ERROR code on failure
 */
export function validateOrThrow<Output, Def extends z.ZodTypeDef = z.ZodTypeDef, Input = unknown>(
  schema: z.ZodType<Output, Def, Input>,
  data: unknown,
  customMessage?: string
): Output {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  const errors = formatZodError(result.error);
  const firstMessage = errors[0]?.message ?? 'Invalid payload';
  const message = customMessage ? `${customMessage}: ${firstMessage}` : firstMessage;

  throw new AppError({
    code: 'VALIDATION_ERROR',
    message,
    statusCode: 400,
    validationErrors: errors,
  });
}

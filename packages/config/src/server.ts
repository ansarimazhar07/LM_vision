import { z } from 'zod';
import { ClientEnvSchema } from './client.js';

/**
 * Server-Only Environment Schema
 * Validates sensitive secrets and backend infrastructure variables.
 */
export const ServerEnvSchema = ClientEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(3000),
  AI_ENGINE_PORT: z.coerce.number().int().positive().default(3001),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default('placeholder-service-role-key'),
  SUPABASE_JWT_SECRET: z.string().min(1).default('placeholder-jwt-secret-for-testing-only'),
  AI_DEFAULT_PROVIDER: z.enum(['GEMINI', 'OPENAI', 'MOCK']).default('GEMINI'),
  AI_PROVIDER_DEFAULT: z.enum(['GEMINI', 'OPENAI', 'MOCK']).optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  MOCK_AI_MODEL: z.string().default('mock-vision-engine-v1'),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
});
export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

/**
 * Validates and retrieves server-only environment variables.
 * Throws immediately if called in a browser runtime.
 */
export function getServerEnv(customEnv?: Record<string, string | undefined>): ServerEnv {
  // Prevent execution in browser contexts
  if (typeof window !== 'undefined') {
    throw new Error('[LM-Vision Security] Attempted to load server-only configuration in a client/browser environment!');
  }

  if (cachedServerEnv && !customEnv) {
    return cachedServerEnv;
  }

  const raw = customEnv ?? (typeof process !== 'undefined' ? process.env : {});
  const parsed = ServerEnvSchema.safeParse(raw);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => ` - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`[LM-Vision Config] Invalid Server Environment:\n${errorDetails}`);
  }

  if (!customEnv) {
    cachedServerEnv = parsed.data;
  }
  return parsed.data;
}

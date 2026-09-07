import { z } from 'zod';

/**
 * Public Client Environment Schema
 * Only contains safe public configuration intended for browser / mobile clients.
 */
export const ClientEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000/api/v1'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('https://placeholder-project.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default('placeholder-anon-key'),
  LM_VISION_LOCAL_ONLY: z
    .preprocess((val) => val === true || val === 'true' || val === '1', z.boolean())
    .default(false),
});
export type ClientEnv = z.infer<typeof ClientEnvSchema>;

let cachedClientEnv: ClientEnv | null = null;

/**
 * Safely parse and retrieve client environment configuration
 */
export function getClientEnv(customEnv?: Record<string, string | undefined>): ClientEnv {
  if (cachedClientEnv && !customEnv) {
    return cachedClientEnv;
  }

  const raw = customEnv ?? (typeof process !== 'undefined' ? process.env : {});
  const parsed = ClientEnvSchema.safeParse(raw);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => ` - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`[LM-Vision Config] Invalid Client Environment:\n${errorDetails}`);
  }

  if (!customEnv) {
    cachedClientEnv = parsed.data;
  }
  return parsed.data;
}

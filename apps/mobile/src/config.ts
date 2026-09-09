import { getClientEnv, type ClientEnv } from '@lm-vision/config';

/** Only EXPO_PUBLIC_* values may cross the mobile runtime boundary. */
export type MobileEnvInput = Record<string, string | undefined>;

export type MobileConfig = Pick<
  ClientEnv,
  | 'NEXT_PUBLIC_APP_ENV'
  | 'NEXT_PUBLIC_API_URL'
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  | 'LM_VISION_LOCAL_ONLY'
>;

let localOnlyOverride: boolean | null = null;

export function isLocalOnlyMode(): boolean {
  if (localOnlyOverride !== null) {
    return localOnlyOverride;
  }
  try {
    return getMobileConfig().LM_VISION_LOCAL_ONLY;
  } catch {
    return false;
  }
}

export function setLocalOnlyMode(enabled: boolean | null): void {
  localOnlyOverride = enabled;
}

export function getMobileConfig(customEnv?: MobileEnvInput): MobileConfig {
  // Keep these as direct Expo references so Metro can inline EXPO_PUBLIC_*
  // values at build time. Never read the full environment object in a bundle.
  const expoEnv: MobileEnvInput = typeof process !== 'undefined' ? {
    NODE_ENV: process.env.NODE_ENV,
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_APP_URL: process.env.EXPO_PUBLIC_APP_URL,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_LOCAL_ONLY: process.env.EXPO_PUBLIC_LOCAL_ONLY ?? process.env.LM_VISION_LOCAL_ONLY,
    LM_VISION_LOCAL_ONLY: process.env.LM_VISION_LOCAL_ONLY ?? process.env.EXPO_PUBLIC_LOCAL_ONLY,
  } : {};
  const env = customEnv ?? expoEnv;
  const clientEnv = getClientEnv({
    NODE_ENV: env.NODE_ENV,
    NEXT_PUBLIC_APP_ENV: env.EXPO_PUBLIC_APP_ENV ?? env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_APP_URL: env.EXPO_PUBLIC_APP_URL ?? env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: env.EXPO_PUBLIC_API_URL ?? env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: env.EXPO_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    LM_VISION_LOCAL_ONLY: env.EXPO_PUBLIC_LOCAL_ONLY ?? env.LM_VISION_LOCAL_ONLY,
  });

  return {
    NEXT_PUBLIC_APP_ENV: clientEnv.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_API_URL: clientEnv.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    LM_VISION_LOCAL_ONLY: clientEnv.LM_VISION_LOCAL_ONLY,
  };
}

import 'react-native-url-polyfill/auto';
import { createMobileSafeClient } from '@lm-vision/supabase-client/browser';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getMobileConfig, type MobileConfig } from '../config';

let mobileClient: SupabaseClient | null = null;

/** Creates the single RLS-enforced, mobile-safe Supabase client. */
export function getMobileSupabaseClient(config: MobileConfig = getMobileConfig()): SupabaseClient {
  if (!mobileClient) {
    const client = createMobileSafeClient(
      config.NEXT_PUBLIC_SUPABASE_URL,
      config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    mobileClient = client;
    return client;
  }
  return mobileClient;
}

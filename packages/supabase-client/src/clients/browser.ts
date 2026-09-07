// ============================================================================
// Browser-side Supabase Client Factory
// @lm-vision/supabase-client — packages/supabase-client/src/clients/browser.ts
// ============================================================================
// SECURITY:
//   This client uses only the public anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY).
//   The anon key is safe to include in browser/mobile bundles by Supabase design.
//   RLS policies enforce data access based on the authenticated user's JWT.
//
//   This client MUST NOT receive or use the service role key.
//   It relies on RLS for authorization — all policies from migration 012 apply.
// ============================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a browser-safe Supabase client using the public anon key.
 * RLS policies enforce all data access based on the authenticated user's JWT.
 *
 * Safe to call from React Native (mobile) and Next.js client components (web).
 * This client relies entirely on RLS — do not bypass it with service role credentials.
 *
 * @param supabaseUrl - The Supabase project URL (NEXT_PUBLIC_SUPABASE_URL)
 * @param supabaseAnonKey - The public anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
 */
export function createBrowserClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '[LM-Vision Config] createBrowserClient() requires both supabaseUrl and supabaseAnonKey. '
      + 'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured.'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Enable auto session refresh for browser clients
      autoRefreshToken: true,
      // Persist sessions in browser storage (localStorage by default)
      persistSession: true,
      // Detect auth callback URL automatically
      detectSessionInUrl: true,
    },
  });
}

/**
 * Mobile/browser-safe entry point. Keep this file free of imports from the
 * server client so bundlers cannot pull the service-role implementation into
 * a client bundle.
 */
export { createBrowserClient as createMobileSafeClient };

// ============================================================================
// Server-side Supabase Client Factory
// @lm-vision/supabase-client — packages/supabase-client/src/clients/server.ts
// ============================================================================
// SECURITY CRITICAL:
//   The server client uses the SERVICE ROLE KEY which BYPASSES all RLS.
//   It must NEVER be used in browser/mobile code.
//   It must NEVER be used for ordinary authenticated user data access.
//   Use it ONLY for:
//     - trusted server-side admin operations
//     - seeding/migration utilities
//     - background worker tasks
//     - audit log insertion (system events)
//     - user management by admins
//
//   For ordinary user data access, use the authenticated client
//   returned by createAuthenticatedClient() which respects RLS.
// ============================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a server-side Supabase client using the service role key.
 * This client BYPASSES all Row Level Security policies.
 *
 * ONLY use this for:
 * - Admin/system operations that legitimately need to bypass RLS
 * - Background tasks running in trusted server contexts
 * - Audit log insertion where user context is not available
 *
 * NEVER use this for ordinary authenticated user data access.
 * NEVER expose the service role key to browser/mobile clients.
 *
 * @param supabaseUrl - The Supabase project URL (NEXT_PUBLIC_SUPABASE_URL)
 * @param serviceRoleKey - The service role key (SUPABASE_SERVICE_ROLE_KEY — server only)
 */
export function createServerClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error(
      '[LM-Vision Security] createServerClient() must not be called in a browser context. '
      + 'The service role key bypasses all RLS and must remain server-only. '
      + 'Use createBrowserClient() for client-side operations.'
    );
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '[LM-Vision Config] createServerClient() requires both supabaseUrl and serviceRoleKey. '
      + 'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your server environment.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // Disable auto session refresh — server clients don't maintain user sessions
      autoRefreshToken: false,
      // Don't persist sessions server-side
      persistSession: false,
      // Detect session storage (should be false for server)
      detectSessionInUrl: false,
    },
  });
}

/**
 * Creates an authenticated Supabase client that respects RLS policies.
 * The client uses the anon key + the user's JWT token for authorization.
 * RLS policies will apply based on the authenticated user's role.
 *
 * Use this for all ordinary user data operations — inspections, evidence, findings, etc.
 * This preserves the RLS boundary and least-privilege principle.
 *
 * @param supabaseUrl - The Supabase project URL
 * @param supabaseAnonKey - The anon/public key (safe for client exposure)
 * @param userAccessToken - The authenticated user's JWT access token
 */
export function createAuthenticatedClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  userAccessToken: string,
): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

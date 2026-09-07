// ============================================================================
// Authentication Utilities
// @lm-vision/supabase-client — packages/supabase-client/src/auth/index.ts
// ============================================================================
// All authentication uses Supabase Auth as the identity authority.
// No custom JWT signing or password hashing is implemented here.
// These are thin, typed wrappers around the Supabase Auth SDK.
// ============================================================================
import {
  type SupabaseClient,
  type Session,
  type User,
  type AuthError,
} from '@supabase/supabase-js';

// ============================================================================
// Result Types
// ============================================================================

export interface AuthResult<T> {
  data: T | null;
  error: AuthError | null;
}

export interface SignUpMetadata {
  fullName: string;
  // Additional metadata can be added here in Phase 3+ (e.g., employee_code)
}

// ============================================================================
// Sign Up
// Creates a new Supabase Auth user.
// The handle_new_auth_user trigger (migration 002) automatically creates
// a public.users profile with the default INSPECTOR role.
// Role elevation must be performed by an ADMIN through server-side operations.
// ============================================================================

/**
 * Signs up a new user with email and password.
 * Automatically creates a public.users profile via DB trigger with INSPECTOR role.
 * For non-inspector roles, an ADMIN must elevate the role after sign-up.
 *
 * @param client - Supabase client (browser or server)
 * @param email - User's email address
 * @param password - User's password (Supabase handles hashing; minimum 6 chars by default)
 * @param metadata - Additional user metadata (fullName, etc.)
 */
export async function signUp(
  client: SupabaseClient,
  email: string,
  password: string,
  metadata: SignUpMetadata,
): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: metadata.fullName,
      },
    },
  });

  return {
    data: data ? { user: data.user, session: data.session } : null,
    error,
  };
}

// ============================================================================
// Sign In
// ============================================================================

/**
 * Signs in an existing user with email and password.
 * Returns the session containing the JWT access token.
 * The access token should be passed to createAuthenticatedClient()
 * for subsequent database operations that respect RLS.
 */
export async function signIn(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<AuthResult<{ user: User; session: Session }>> {
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  return {
    data: data.user && data.session
      ? { user: data.user, session: data.session }
      : null,
    error,
  };
}

// ============================================================================
// Sign Out
// ============================================================================

/**
 * Signs out the current user.
 * Invalidates the local session. The server-side JWT expiry handles server-side invalidation.
 */
export async function signOut(
  client: SupabaseClient,
): Promise<AuthResult<null>> {
  const { error } = await client.auth.signOut();
  return { data: null, error };
}

// ============================================================================
// Get Session
// ============================================================================

/**
 * Retrieves the current session if one exists.
 * Returns null data if the user is not authenticated or the session has expired.
 */
export async function getSession(
  client: SupabaseClient,
): Promise<AuthResult<Session>> {
  const { data, error } = await client.auth.getSession();
  return {
    data: data.session,
    error,
  };
}

// ============================================================================
// Get Authenticated User
// ============================================================================

/**
 * Retrieves the current authenticated user from Supabase Auth.
 * This makes a network request to validate the session server-side.
 * Use getSession() for lightweight session checks that don't need server validation.
 */
export async function getAuthenticatedUser(
  client: SupabaseClient,
): Promise<AuthResult<User>> {
  const { data, error } = await client.auth.getUser();
  return {
    data: data.user,
    error,
  };
}

// ============================================================================
// Refresh Session
// ============================================================================

/**
 * Refreshes the current session to extend the access token lifetime.
 * Supabase clients with autoRefreshToken=true handle this automatically.
 * Call this manually when using server-side clients with autoRefreshToken=false.
 */
export async function refreshSession(
  client: SupabaseClient,
): Promise<AuthResult<Session>> {
  const { data, error } = await client.auth.refreshSession();
  return {
    data: data.session,
    error,
  };
}

// ============================================================================
// Password Reset
// ============================================================================

/**
 * Initiates a password reset flow by sending a reset email.
 * The email will contain a link to the redirectTo URL.
 * Full password reset UI handling is deferred to Phase 3 (mobile) / Phase 4 (web).
 */
export async function resetPasswordForEmail(
  client: SupabaseClient,
  email: string,
  redirectTo?: string,
): Promise<AuthResult<null>> {
  const options = redirectTo ? { redirectTo } : undefined;
  const { error } = await client.auth.resetPasswordForEmail(email, options);
  return { data: null, error };
}

// ============================================================================
// Auth State Change Listener
// ============================================================================

/**
 * Subscribes to auth state changes (sign-in, sign-out, token refresh, etc.)
 * Returns an unsubscribe function — call it on component unmount to clean up.
 *
 * Use in Phase 3 (mobile) and Phase 4 (web) for reactive auth state.
 */
export function onAuthStateChange(
  client: SupabaseClient,
  callback: (event: string, session: Session | null) => void,
): () => void {
  const { data: { subscription } } = client.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

// ============================================================================
// Update User Password & Profile Metadata
// ============================================================================

/**
 * Updates password for currently authenticated user session.
 */
export async function updateUserPassword(
  client: SupabaseClient,
  newPassword: string,
): Promise<AuthResult<User>> {
  const { data, error } = await client.auth.updateUser({ password: newPassword });
  return { data: data.user, error };
}

/**
 * Updates profile metadata (such as full_name) for current user.
 */
export async function updateUserProfile(
  client: SupabaseClient,
  metadata: { fullName?: string },
): Promise<AuthResult<User>> {
  const { data, error } = await client.auth.updateUser({
    data: metadata.fullName ? { full_name: metadata.fullName } : undefined,
  });
  return { data: data.user, error };
}


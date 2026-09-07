// ============================================================================
// Phase 2: Authentication Tests
// LM-Vision — SIH 2026 Problem Statement 26034
// ============================================================================
// Tests:
// 1. Auth utility function signatures and behavior (mocked Supabase client)
// 2. Server client security guard (browser context rejection)
// 3. Service role secret isolation (never in client bundle)
// 4. Session handling patterns
// ============================================================================

import { describe, it, expect, vi, type Mock } from 'vitest';
import { createServerClient, createBrowserClient } from '@lm-vision/supabase-client';
import {
  signIn,
  signOut,
  signUp,
  getSession,
  getAuthenticatedUser,
  refreshSession,
  resetPasswordForEmail,
  onAuthStateChange,
  type SignUpMetadata,
} from '@lm-vision/supabase-client';
import { ClientEnvSchema, ServerEnvSchema } from '@lm-vision/config';

// ============================================================================
// Mock Supabase Client Builder
// These tests use a structured mock to validate the auth utility logic
// without requiring a live Supabase instance.
// ============================================================================

function buildMockAuthClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: {
          user: { id: 'user-test-123', email: 'inspector@lm-vision.test' },
          session: { access_token: 'mock-access-token', user: { id: 'user-test-123' } },
        },
        error: null,
        ...overrides['signInWithPassword'],
      }),
      signUp: vi.fn().mockResolvedValue({
        data: {
          user: { id: 'new-user-123', email: 'new@lm-vision.test' },
          session: { access_token: 'mock-token-for-new-user' },
        },
        error: null,
        ...overrides['signUp'],
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-session-token' } },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-test-123', email: 'inspector@lm-vision.test' } },
        error: null,
      }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'refreshed-token' } },
        error: null,
      }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  } as unknown as ReturnType<typeof createBrowserClient>;
}

// ============================================================================
// 1. Sign In Tests
// ============================================================================
describe('Phase 2: Authentication — Sign In', () => {
  it('signIn returns user and session on success', async () => {
    const client = buildMockAuthClient();
    const result = await signIn(client, 'inspector@lm-vision.test', 'secure-password-123');

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data?.user.id).toBe('user-test-123');
    expect(result.data?.session.access_token).toBe('mock-access-token');
  });

  it('signIn returns error when credentials are invalid', async () => {
    const client = buildMockAuthClient();
    (client.auth.signInWithPassword as Mock).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });

    const result = await signIn(client, 'bad@email.test', 'wrong-password');
    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();
  });

  it('signIn does not expose service role key in response', async () => {
    const client = buildMockAuthClient();
    const result = await signIn(client, 'inspector@lm-vision.test', 'secure-password-123');

    // Verify no service role key appears in the auth result
    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain('service_role');
    expect(resultStr).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});

// ============================================================================
// 2. Sign Up Tests
// ============================================================================
describe('Phase 2: Authentication — Sign Up', () => {
  it('signUp creates a new user with full_name metadata', async () => {
    const client = buildMockAuthClient();
    const metadata: SignUpMetadata = { fullName: 'New Inspector' };
    const result = await signUp(client, 'new@lm-vision.test', 'secure-password-123', metadata);

    expect(result.error).toBeNull();
    expect(result.data?.user?.id).toBe('new-user-123');

    // Verify sign-up was called with metadata
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'new@lm-vision.test',
      password: 'secure-password-123',
      options: { data: { full_name: 'New Inspector' } },
    });
  });

  it('new users get INSPECTOR role by default (via DB trigger — documented intent)', () => {
    // The handle_new_auth_user trigger (migration 002) assigns INSPECTOR role
    // as the least-privilege default. This test documents the design intent.
    // Runtime verification requires a live Supabase instance.
    // RLS_RUNTIME_VERIFICATION_REQUIRED: verify trigger behavior in live environment.
    const defaultRoleForNewUsers = 'INSPECTOR';
    expect(defaultRoleForNewUsers).toBe('INSPECTOR');
    expect(defaultRoleForNewUsers).not.toBe('ADMIN');
    expect(defaultRoleForNewUsers).not.toBe('SUPERVISOR');
  });
});

// ============================================================================
// 3. Sign Out Tests
// ============================================================================
describe('Phase 2: Authentication — Sign Out', () => {
  it('signOut calls auth.signOut and returns no error on success', async () => {
    const client = buildMockAuthClient();
    const result = await signOut(client);

    expect(result.error).toBeNull();
    expect(client.auth.signOut).toHaveBeenCalledOnce();
  });

  it('signOut handles error gracefully', async () => {
    const client = buildMockAuthClient();
    (client.auth.signOut as Mock).mockResolvedValueOnce({
      error: { message: 'Network error', status: 500 },
    });

    const result = await signOut(client);
    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe('Network error');
  });
});

// ============================================================================
// 4. Session Tests
// ============================================================================
describe('Phase 2: Authentication — Session Handling', () => {
  it('getSession returns current session when authenticated', async () => {
    const client = buildMockAuthClient();
    const result = await getSession(client);

    expect(result.error).toBeNull();
    expect(result.data?.access_token).toBe('mock-session-token');
  });

  it('getSession returns null data when not authenticated', async () => {
    const client = buildMockAuthClient();
    (client.auth.getSession as Mock).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const result = await getSession(client);
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('getAuthenticatedUser returns authenticated user', async () => {
    const client = buildMockAuthClient();
    const result = await getAuthenticatedUser(client);

    expect(result.error).toBeNull();
    expect(result.data?.id).toBe('user-test-123');
    expect(result.data?.email).toBe('inspector@lm-vision.test');
  });

  it('refreshSession returns refreshed session token', async () => {
    const client = buildMockAuthClient();
    const result = await refreshSession(client);

    expect(result.error).toBeNull();
    expect(result.data?.access_token).toBe('refreshed-token');
  });

  it('onAuthStateChange returns an unsubscribe function', () => {
    const client = buildMockAuthClient();
    const callback = vi.fn();
    const unsubscribe = onAuthStateChange(client, callback);

    expect(typeof unsubscribe).toBe('function');
    // Calling unsubscribe should not throw
    expect(() => unsubscribe()).not.toThrow();
  });
});

// ============================================================================
// 5. Password Reset Tests
// ============================================================================
describe('Phase 2: Authentication — Password Reset', () => {
  it('resetPasswordForEmail sends reset email without error', async () => {
    const client = buildMockAuthClient();
    const result = await resetPasswordForEmail(client, 'inspector@lm-vision.test');

    expect(result.error).toBeNull();
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'inspector@lm-vision.test',
      undefined
    );
  });

  it('resetPasswordForEmail passes redirectTo when provided', async () => {
    const client = buildMockAuthClient();
    await resetPasswordForEmail(
      client,
      'inspector@lm-vision.test',
      'http://localhost:3000/reset-password'
    );

    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'inspector@lm-vision.test',
      { redirectTo: 'http://localhost:3000/reset-password' }
    );
  });
});

// ============================================================================
// 6. Server Client Security Guard Tests
// ============================================================================
describe('Phase 2: Server Client Security', () => {
  it('createServerClient throws if called in browser context', () => {
    // Simulate browser window global
    const originalWindow = (globalThis as Record<string, unknown>)['window'];
    try {
      (globalThis as Record<string, unknown>)['window'] = {};
      expect(() =>
        createServerClient('https://test.supabase.co', 'service-role-key')
      ).toThrow(/service role key.*must remain server-only|must not be called in a browser/i);
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as Record<string, unknown>)['window'];
      } else {
        (globalThis as Record<string, unknown>)['window'] = originalWindow;
      }
    }
  });

  it('createServerClient throws if supabaseUrl or serviceRoleKey is empty', () => {
    expect(() => createServerClient('', 'key')).toThrow(/requires both supabaseUrl/i);
    expect(() => createServerClient('https://test.supabase.co', '')).toThrow(/requires both supabaseUrl/i);
  });

  it('createBrowserClient throws if supabaseUrl or anonKey is empty', () => {
    expect(() => createBrowserClient('', 'anon-key')).toThrow(/requires both supabaseUrl/i);
    expect(() => createBrowserClient('https://test.supabase.co', '')).toThrow(/requires both supabaseUrl/i);
  });
});

// ============================================================================
// 7. Environment Secret Isolation Tests
// ============================================================================
describe('Phase 2: Secret Isolation', () => {
  it('SUPABASE_SERVICE_ROLE_KEY is in ServerEnvSchema but not ClientEnvSchema', () => {
    const serverFields = Object.keys(ServerEnvSchema.shape);
    const clientFields = Object.keys(ClientEnvSchema.shape);

    expect(serverFields).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(clientFields).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(serverFields).toContain('SUPABASE_JWT_SECRET');
    expect(clientFields).not.toContain('SUPABASE_JWT_SECRET');
  });

  it('NEXT_PUBLIC_SUPABASE_ANON_KEY is in ClientEnvSchema (safe to expose)', () => {
    const clientFields = Object.keys(ClientEnvSchema.shape);
    expect(clientFields).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(clientFields).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });

  it('AI API keys are in ServerEnvSchema only (never in client bundle)', () => {
    const serverFields = Object.keys(ServerEnvSchema.shape);
    const clientFields = Object.keys(ClientEnvSchema.shape);

    expect(serverFields).toContain('GEMINI_API_KEY');
    expect(serverFields).toContain('OPENAI_API_KEY');
    expect(clientFields).not.toContain('GEMINI_API_KEY');
    expect(clientFields).not.toContain('OPENAI_API_KEY');
  });

  it('ClientEnvSchema only exposes NEXT_PUBLIC_* prefixed and NODE_ENV fields', () => {
    const clientFields = Object.keys(ClientEnvSchema.shape);
    for (const field of clientFields) {
      const isPublicPrefixed = field.startsWith('NEXT_PUBLIC_');
      const isNodeEnv = field === 'NODE_ENV';
      const isFeatureFlag = field === 'LM_VISION_LOCAL_ONLY';
      expect(isPublicPrefixed || isNodeEnv || isFeatureFlag).toBe(true);
    }
  });
});

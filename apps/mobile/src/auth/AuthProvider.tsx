import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import {
  getSession,
  onAuthStateChange,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  signUp as supabaseSignUp,
  resetPasswordForEmail,
  updateUserPassword,
  updateUserProfile,
} from '@lm-vision/supabase-client/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginRequestSchema } from '@lm-vision/shared-types';
import { getMobileSupabaseClient } from '../services/supabase';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  authUser: SupabaseUser | null;
  error: string | null;
  sessionExpired: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signInDemo: () => Promise<boolean>;
  signOut: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  updateProfileName: (fullName: string) => Promise<{ success: boolean; error?: string }>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function friendlyAuthError(kind: 'signIn' | 'signUp' | 'session' | 'signOut' | 'reset'): string {
  if (kind === 'signIn') return 'Unable to sign in. Check your email and password and try again.';
  if (kind === 'signUp') return 'Unable to create account. Please check your details and network connection.';
  if (kind === 'signOut') return 'Unable to sign out. Please try again.';
  if (kind === 'reset') return 'Unable to send password reset email. Please verify your email address.';
  return 'We could not restore your session. Check your connection and try again.';
}

export interface AuthProviderProps { children: ReactNode; client?: SupabaseClient; }

export { DEMO_STORAGE_KEY, DEMO_INSPECTOR_USER, DEMO_INSPECTOR_SESSION } from './demoInspector';
import { DEMO_STORAGE_KEY, DEMO_INSPECTOR_USER, DEMO_INSPECTOR_SESSION } from './demoInspector';

export function AuthProvider({ children, client = getMobileSupabaseClient() }: AuthProviderProps): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const hadSession = useRef(false);
  const [retryToken, setRetryToken] = useState(0);

  const isDemoMode = Boolean(
    session?.user?.id === DEMO_INSPECTOR_USER.id || authUser?.id === DEMO_INSPECTOR_USER.id
  );

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    const unsubscribe = onAuthStateChange(client, (event, nextSession) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT' && hadSession.current) setSessionExpired(true);
      setSession(nextSession);
      setAuthUser(nextSession?.user ?? null);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
      if (nextSession) hadSession.current = true;
    });

    const initAuth = async () => {
      // 1. Check local demo session first
      try {
        const localRaw = await AsyncStorage.getItem(DEMO_STORAGE_KEY);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (parsed?.user) {
            if (cancelled) return;
            setSession(parsed);
            setAuthUser(parsed.user);
            hadSession.current = true;
            setStatus('authenticated');
            return;
          }
        }
      } catch {}

      // 2. Check live Supabase session
      const result = await getSession(client);
      if (cancelled) return;
      if (result.error) {
        setStatus('error');
        setError(friendlyAuthError('session'));
        return;
      }
      setSession(result.data);
      setAuthUser(result.data?.user ?? null);
      if (result.data) hadSession.current = true;
      setStatus(result.data ? 'authenticated' : 'unauthenticated');
    };

    void initAuth();
    return () => { cancelled = true; unsubscribe(); };
  }, [client, retryToken]);

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    const parsed = LoginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError('Enter a valid email and a password with at least 8 characters.');
      return false;
    }
    setStatus('loading');
    setError(null);

    // Live Supabase authentication
    try {
      const result = await supabaseSignIn(client, parsed.data.email, parsed.data.password);
      if (result.data?.session && result.data?.user) {
        setSession(result.data.session);
        setAuthUser(result.data.user);
        hadSession.current = true;
        setSessionExpired(false);
        setStatus('authenticated');
        await AsyncStorage.removeItem(DEMO_STORAGE_KEY).catch(() => {});
        return true;
      }
      if (result.error) {
        setStatus('unauthenticated');
        setError(result.error.message || friendlyAuthError('signIn'));
        return false;
      }
    } catch (err: any) {
      setError(err?.message || friendlyAuthError('signIn'));
    }

    setStatus('unauthenticated');
    setError(friendlyAuthError('signIn'));
    return false;
  }, [client]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ success: boolean; error?: string }> => {
    const parsed = LoginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      const msg = 'Enter a valid email and a password with at least 8 characters.';
      setError(msg);
      return { success: false, error: msg };
    }
    if (!fullName || fullName.trim().length < 2) {
      const msg = 'Please enter your full name (at least 2 characters).';
      setError(msg);
      return { success: false, error: msg };
    }

    setStatus('loading');
    setError(null);

    try {
      const result = await supabaseSignUp(client, parsed.data.email, parsed.data.password, {
        fullName: fullName.trim(),
      });

      if (result.error) {
        setStatus('unauthenticated');
        setError(result.error.message);
        return { success: false, error: result.error.message };
      }

      if (result.data?.session && result.data?.user) {
        setSession(result.data.session);
        setAuthUser(result.data.user);
        hadSession.current = true;
        setSessionExpired(false);
        setStatus('authenticated');
        await AsyncStorage.removeItem(DEMO_STORAGE_KEY).catch(() => {});
        return { success: true };
      }

      // Supabase email confirmation requirement
      setStatus('unauthenticated');
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || friendlyAuthError('signUp');
      setStatus('unauthenticated');
      setError(msg);
      return { success: false, error: msg };
    }
  }, [client]);

  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !email.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setError(msg);
      return { success: false, error: msg };
    }
    try {
      const result = await resetPasswordForEmail(client, email.trim());
      if (result.error) {
        setError(result.error.message);
        return { success: false, error: result.error.message };
      }
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || friendlyAuthError('reset');
      setError(msg);
      return { success: false, error: msg };
    }
  }, [client]);

  const updatePassword = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!password || password.length < 8) {
      const msg = 'Password must be at least 8 characters long.';
      setError(msg);
      return { success: false, error: msg };
    }
    if (isDemoMode) {
      return { success: true };
    }
    try {
      const result = await updateUserPassword(client, password);
      if (result.error) {
        setError(result.error.message);
        return { success: false, error: result.error.message };
      }
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Failed to update password.';
      setError(msg);
      return { success: false, error: msg };
    }
  }, [client, isDemoMode]);

  const updateProfileName = useCallback(async (fullName: string): Promise<{ success: boolean; error?: string }> => {
    if (!fullName || fullName.trim().length < 2) {
      const msg = 'Name must be at least 2 characters.';
      return { success: false, error: msg };
    }
    if (isDemoMode) {
      if (authUser) {
        setAuthUser({
          ...authUser,
          user_metadata: { ...authUser.user_metadata, full_name: fullName.trim() },
        });
      }
      return { success: true };
    }
    try {
      const result = await updateUserProfile(client, { fullName: fullName.trim() });
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      if (result.data) {
        setAuthUser(result.data);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update profile.' };
    }
  }, [authUser, client, isDemoMode]);

  const signInDemo = useCallback(async (): Promise<boolean> => {
    setStatus('loading');
    setError(null);
    setSession(DEMO_INSPECTOR_SESSION);
    setAuthUser(DEMO_INSPECTOR_USER);
    hadSession.current = true;
    setSessionExpired(false);
    setStatus('authenticated');
    await AsyncStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(DEMO_INSPECTOR_SESSION)).catch(() => {});
    return true;
  }, []);

  const signOut = useCallback(async (): Promise<boolean> => {
    await AsyncStorage.removeItem(DEMO_STORAGE_KEY).catch(() => {});
    await supabaseSignOut(client);
    setSession(null);
    setAuthUser(null);
    setStatus('unauthenticated');
    return true;
  }, [client]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    session,
    authUser,
    error,
    sessionExpired,
    isDemoMode,
    signIn,
    signUp,
    signInDemo,
    signOut,
    resetPassword,
    updatePassword,
    updateProfileName,
    retry: () => setRetryToken((token) => token + 1),
  }), [
    authUser,
    error,
    isDemoMode,
    resetPassword,
    session,
    sessionExpired,
    signIn,
    signInDemo,
    signOut,
    signUp,
    status,
    updatePassword,
    updateProfileName,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

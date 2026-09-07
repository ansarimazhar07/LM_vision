import { describe, expect, it } from 'vitest';
import { InspectionSchema, InspectionStatusSchema } from '@lm-vision/shared-types';
import { getMobileConfig } from '../apps/mobile/src/config';
import { createLocalInspectionDraft, LocalInspectionDraftSchema } from '../apps/mobile/src/state/draft';
import { getRootRoute } from '../apps/mobile/src/navigation/guards';
import { FUTURE_INSPECTION_ROUTES } from '../apps/mobile/src/navigation/types';
import { onAuthStateChange } from '@lm-vision/supabase-client/auth';

describe('Phase 3 mobile route guards', () => {
  it('keeps the loading boundary visible until auth is resolved', () => {
    expect(getRootRoute('loading')).toBe('Loading');
    expect(getRootRoute('error')).toBe('Auth');
    expect(getRootRoute('unauthenticated')).toBe('Auth');
    expect(getRootRoute('authenticated')).toBe('App');
  });

  it('does not expose an authenticated app route to unauthenticated sessions', () => {
    expect(getRootRoute('unauthenticated')).not.toBe('App');
  });

  it('declares the future inspection route boundaries without claiming they work', () => {
    expect(FUTURE_INSPECTION_ROUTES).toEqual(expect.arrayContaining(['SmartScan', 'CameraCapture', 'AIProcessing', 'Report']));
  });
});

describe('Phase 3 auth state integration', () => {
  it('subscribes and unsubscribes through the existing Supabase auth adapter', () => {
    let listener: ((event: string, session: null) => void) | undefined;
    let unsubscribed = false;
    const client = { auth: { onAuthStateChange: (callback: (event: string, session: null) => void) => { listener = callback; return { data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } }; } } };
    const events: string[] = [];
    const unsubscribe = onAuthStateChange(client as never, (event) => events.push(event));
    listener?.('SIGNED_IN', null);
    unsubscribe();
    expect(events).toEqual(['SIGNED_IN']);
    expect(unsubscribed).toBe(true);
  });
});

describe('Phase 3 mobile draft state', () => {
  it('creates a validated, versioned physical inspection draft', () => {
    const draft = createLocalInspectionDraft({
      category: 'PERSONAL_CARE_COSMETICS',
      packageType: 'BOTTLE',
    }, new Date('2026-09-05T00:00:00.000Z'));
    expect(LocalInspectionDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.status).toBe('DRAFT');
    expect(draft.version).toBe(1);
    expect(draft.pendingOperations).toContain('CREATE_DRAFT');
  });

  it('rejects unsupported draft metadata at the mobile boundary', () => {
    expect(() => createLocalInspectionDraft({ category: 'LEGAL_DECISION', packageType: 'BOTTLE' })).toThrow();
  });
});

describe('Phase 3 mobile configuration boundary', () => {
  it('accepts Expo public Supabase settings', () => {
    const config = getMobileConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      EXPO_PUBLIC_APP_ENV: 'test',
      EXPO_PUBLIC_API_URL: 'https://api.example.test/v1',
    });
    expect(config.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(config.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('anon-key');
  });

  it('ignores server-only values and never returns them', () => {
    const config = getMobileConfig({
      SUPABASE_SERVICE_ROLE_KEY: 'server-secret',
      SUPABASE_JWT_SECRET: 'jwt-secret',
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
    expect(config).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
    expect(config).not.toHaveProperty('SUPABASE_JWT_SECRET');
  });
});

describe('Phase 3 shared type integration', () => {
  it('continues to consume canonical shared schemas', () => {
    expect(InspectionStatusSchema.safeParse('DRAFT').success).toBe(true);
    expect(InspectionSchema.safeParse({}).success).toBe(false);
  });
});

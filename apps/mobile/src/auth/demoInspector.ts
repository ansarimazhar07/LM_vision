import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export const DEMO_STORAGE_KEY = '@lm_vision:demo_auth_session';

export const DEMO_INSPECTOR_USER: SupabaseUser = {
  id: '00000002-0000-0000-0000-000000000001',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {
    full_name: 'Demo Inspector',
    role: 'INSPECTOR',
    badge_number: 'INS-DL-0042',
    jurisdiction_zone: 'North Delhi Zone',
  },
  aud: 'authenticated',
  created_at: new Date('2026-09-05T00:00:00.000Z').toISOString(),
  email: 'inspector@lmvision.gov.in',
  phone: '',
  role: 'authenticated',
  updated_at: new Date('2026-09-05T00:00:00.000Z').toISOString(),
};

export const DEMO_INSPECTOR_SESSION: Session = {
  access_token: 'demo-inspector-jwt-token-sih-2026',
  token_type: 'bearer',
  expires_in: 86400,
  refresh_token: 'demo-inspector-refresh-token',
  user: DEMO_INSPECTOR_USER,
};

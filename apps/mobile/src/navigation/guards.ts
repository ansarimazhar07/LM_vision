import type { AuthStatus } from '../auth/AuthProvider';

export type RootRoute = 'Loading' | 'Auth' | 'App';
export function getRootRoute(status: AuthStatus): RootRoute {
  if (status === 'loading') return 'Loading';
  if (status === 'authenticated') return 'App';
  return 'Auth';
}

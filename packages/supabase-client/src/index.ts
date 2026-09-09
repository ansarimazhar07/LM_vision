// ============================================================================
// @lm-vision/supabase-client — Public API
// ============================================================================
// ARCHITECTURE NOTE:
// This package provides Supabase-specific infrastructure WITHOUT coupling
// the canonical domain model to Supabase SDK types.
//
// The separation is:
//   Database row types (DatabaseRow*)  →  adapter  →  canonical domain types
//
// Import `@lm-vision/shared-types` for canonical domain models.
// Import this package for database/auth operations only.
//
// This package MUST NOT import from:
//   - services/ai-engine
//   - packages/rules (except as a future adapter if strictly required)
//   - apps/mobile or apps/web
// ============================================================================

// Database type definitions (hand-maintained, aligned with migrations)
export * from './types/database.js';

// Client factories
export { createServerClient } from './clients/server.js';
export { createBrowserClient, createMobileSafeClient } from './clients/browser.js';

// Auth utilities
export * from './auth/index.js';

// Domain adapters (DB row → canonical domain model)
export * from './adapters/user.js';
export * from './adapters/inspection.js';

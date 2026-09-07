import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@lm-vision/shared-types': path.resolve(__dirname, 'packages/shared-types/src/index.ts'),
      '@lm-vision/validation': path.resolve(__dirname, 'packages/validation/src/index.ts'),
      '@lm-vision/rules': path.resolve(__dirname, 'packages/rules/src/index.ts'),
      '@lm-vision/config/client': path.resolve(__dirname, 'packages/config/src/client.ts'),
      '@lm-vision/config': path.resolve(__dirname, 'packages/config/src/index.ts'),
      '@lm-vision/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
      '@lm-vision/perception': path.resolve(__dirname, 'packages/perception/src/index.ts'),
      '@lm-vision/ai-engine': path.resolve(__dirname, 'services/ai-engine/src/index.ts'),
      // Phase 2: Supabase client package and sub-paths
      '@lm-vision/supabase-client/types': path.resolve(__dirname, 'packages/supabase-client/src/types/database.ts'),
      '@lm-vision/supabase-client/auth': path.resolve(__dirname, 'packages/supabase-client/src/auth/index.ts'),
      '@lm-vision/supabase-client/browser': path.resolve(__dirname, 'packages/supabase-client/src/clients/browser.ts'),
      '@lm-vision/supabase-client': path.resolve(__dirname, 'packages/supabase-client/src/index.ts'),
    },
  },
});

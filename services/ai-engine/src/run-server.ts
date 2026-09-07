import fs from 'node:fs';
import path from 'node:path';

// Auto-load root .env if environment variables are not injected
for (const envFile of ['.env', '../../.env', '../.env']) {
  const resolved = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(resolved)) {
    const lines = fs.readFileSync(resolved, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  }
}

import { startAiEngineServer } from './server.js';

const port = Number(process.env['AI_ENGINE_PORT'] || process.env['PORT'] || 3001);

startAiEngineServer({ port })
  .then(({ port: activePort }) => {
    console.log(`[LM-Vision AI Engine] Server listening on http://localhost:${activePort}`);
    console.log(`[LM-Vision AI Engine] Health endpoint: http://localhost:${activePort}/api/v1/ai/health`);
    console.log(`[LM-Vision AI Engine] Analysis endpoint: http://localhost:${activePort}/api/v1/ai/package-analysis`);
  })
  .catch((err) => {
    console.error('[LM-Vision AI Engine] Failed to start server:', err);
    process.exit(1);
  });

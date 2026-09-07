import { describe, it, expect } from 'vitest';
import { GeminiProvider } from '@lm-vision/ai-engine';
import { PackageAnalysisSchema, type PackageAnalysisInput } from '@lm-vision/shared-types';

/**
 * Phase 6 Gated Live Gemini API Integration Test
 *
 * CRITICAL CI SAFETY INVARIANT:
 * This test will ONLY execute if process.env.GEMINI_API_KEY is configured in the environment.
 * If credentials are not present, this test safely skips without failing the build.
 */
describe('Phase 6 — Live Gemini Integration Test (Gated)', () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const shouldRun = Boolean(apiKey && apiKey.trim() !== '');

  it.runIf(shouldRun)('calls live Google Gemini Multimodal API and returns canonical PackageAnalysis', async () => {
    // Controlled valid base64 PNG sample swatch (> 100 bytes) for live testing
    const sampleImageBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAIAAAC2BqGFAAABH0lEQVR4nO3SQQ0AMAwDsW78wRbCUOxeNoFIp5zdHf67wQZCdzw6InRE6IjQEaEjQkeEjggdEToidEToiNARoSNCR4SOCB0ROiJ0ROiI0BGhI0JHhI4IHRE6InRE6IjQEaEjQkeEjggdEToidEToiNARoSNCR4SOCB0ROiJ0ROiI0BGhI0JHhI4IHRE6InRE6IjQEaEjQkeEjggdEToidEToiNARoSNCR4SOCB0ROiJ0ROiI0BGhI0JHhI4IHRE6InRE6IjQEaEjQkeEjggdEToidEToiNARoSNCR4SOCB0ROiJ0ROiI0BGhp/EAA+wDwLossjkAAAAASUVORK5CYII=';

    const input: PackageAnalysisInput = {
      inspectionId: '11111111-1111-4111-8111-111111111111',
      images: [
        {
          imageId: '22222222-2222-4222-8222-222222222222',
          surface: 'FRONT',
          mimeType: 'image/png',
          base64Data: sampleImageBase64,
        },
      ],
      options: {
        detectBlur: true,
        measureFontHeight: true,
        extractFullText: true,
        languageCodes: ['en'],
      },
    };

    const provider = new GeminiProvider({
      apiKey,
      modelName,
      timeoutMs: 30000,
    });

    const startTime = Date.now();
    const result = await provider.analyzePackage(input);
    const durationMs = Date.now() - startTime;

    // Verify canonical schema conformance
    const parseResult = PackageAnalysisSchema.safeParse(result);
    expect(parseResult.success).toBe(true);

    // Verify metadata and telemetry
    expect(result.provider).toBe('GEMINI');
    expect(result.modelName).toBe(modelName);
    expect(durationMs).toBeGreaterThan(0);

    // Verify zero secret leakage
    const resultString = JSON.stringify(result);
    expect(resultString).not.toContain(apiKey);
  });

  if (!shouldRun) {
    it('skips live Gemini integration test because GEMINI_API_KEY is not set', () => {
      expect(true).toBe(true);
    });
  }
});

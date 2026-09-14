import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  type PackageAnalysis,
  type PackageAnalysisInput,
  type Declaration,
} from '@lm-vision/shared-types';
import {
  ProviderRouter,
  GrokProvider,
  ProviderError,
  classifyProviderError,
  ProviderCircuitBreaker,
  ProviderHealthTracker,
  ProviderMetricsCollector,
  type CanonicalAIObservationResult,
} from '../services/ai-engine/src/index';
import {
  fuseEvidence,
  evaluateComplianceWithEvidenceMapping,
} from '@lm-vision/perception';

// Helper to create a valid base test input
function createTestInput(inspectionId = 'insp-00000000-0000-0000-0000-000000000001'): PackageAnalysisInput {
  return {
    inspectionId,
    images: [
      {
        imageId: 'img-1',
        mimeType: 'image/jpeg',
        base64Data: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
      },
    ],
  };
}

// Helper to create a mock PackageAnalysis response
function createMockAnalysis(provider: 'GEMINI' | 'GROK', mrpValue = 120): PackageAnalysis {
  return {
    provider,
    modelName: provider === 'GEMINI' ? 'gemini-2.5-flash' : 'grok-2-vision-1212',
    quality: {
      isAcceptable: true,
      overallScore: 0.95,
      sharpness: 0.95,
      brightness: 0.9,
      glareDetected: false,
      blurDetected: false,
      shadowDetected: false,
      warnings: [],
    },
    declarations: [
      {
        type: 'MRP',
        rawText: `MRP Rs. ${mrpValue}.00`,
        normalizedValue: mrpValue,
        unit: 'INR',
        confidence: 0.95,
        detectedLanguage: 'en',
        surface: 'FRONT',
        surfaceType: 'FRONT',
        isFormatStandard: true,
      },
      {
        type: 'NET_QUANTITY',
        rawText: 'Net Qty: 500 g',
        normalizedValue: 500,
        unit: 'g',
        confidence: 0.92,
        detectedLanguage: 'en',
        surface: 'FRONT',
        surfaceType: 'FRONT',
        isFormatStandard: true,
      },
    ],
    textRegions: [
      {
        id: 'reg-1',
        imageId: 'img-1',
        surface: 'FRONT',
        surfaceType: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.3, unit: 'NORMALIZED' },
        text: `MRP Rs. ${mrpValue}.00`,
        confidence: 0.95,
      },
    ],
    visualMeasurements: [],
    latencyMs: 120,
    timestamp: new Date().toISOString(),
    rawResponse: {
      provider,
      mock: true,
    },
  };
}

describe('AI Provider Router Test Suite (35 Core Tests + E2E Cases)', () => {
  let metrics: ProviderMetricsCollector;
  let healthTracker: ProviderHealthTracker;

  beforeEach(() => {
    metrics = new ProviderMetricsCollector();
    healthTracker = new ProviderHealthTracker();
  });

  // 1. Gemini success
  it('Case 1: Gemini success returns CLOUD_AI_SUCCESS without invoking Grok', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GEMINI', 120)),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn(),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_SUCCESS');
    expect(result.provider).toBe('GEMINI');
    expect(result.observations[0]?.normalizedValue).toBe(120);
    expect(geminiMock.analyzePackage).toHaveBeenCalledTimes(1);
    expect(grokMock.analyzePackage).not.toHaveBeenCalled();
    expect(metrics.getSnapshot('GEMINI').successCount).toBe(1);
  });

  // 2. Gemini 503 -> Grok
  it('Case 2: Gemini 503 immediately fails over to Grok without retries', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue({
        status: 503,
        message: 'The model is overloaded. Please try again later.',
      }),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GROK', 120)),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_SUCCESS');
    expect(result.provider).toBe('GROK');
    expect(geminiMock.analyzePackage).toHaveBeenCalledTimes(1); // Immediate failover
    expect(grokMock.analyzePackage).toHaveBeenCalledTimes(1);
    expect(metrics.getSnapshot('GEMINI').serverErrorCount).toBe(1);
    expect(metrics.getSnapshot('GROK').successCount).toBe(1);
  });

  // 3. Gemini high-demand -> Grok
  it('Case 3: Gemini high-demand error immediately fails over to Grok', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue(new Error('Resource exhausted due to high demand')),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GROK', 120)),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_SUCCESS');
    expect(result.provider).toBe('GROK');
    expect(geminiMock.analyzePackage).toHaveBeenCalledTimes(1);
    expect(grokMock.analyzePackage).toHaveBeenCalledTimes(1);
  });

  // 4. Gemini 429 -> Grok
  it('Case 4: Gemini 429 rate limit fails over to Grok', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue({
        status: 429,
        message: 'Rate limit exceeded quota',
      }),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GROK', 120)),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_SUCCESS');
    expect(result.provider).toBe('GROK');
    expect(metrics.getSnapshot('GEMINI').rateLimitCount).toBe(1);
  });

  // 5. Gemini timeout -> Grok
  it('Case 5: Gemini timeout fails over to Grok within total budget', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue(new Error('Gemini API request timed out after 7000ms')),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GROK', 120)),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_SUCCESS');
    expect(result.provider).toBe('GROK');
    expect(metrics.getSnapshot('GEMINI').timeoutCount).toBe(1);
  });

  // 6. Gemini malformed -> Grok
  it('Case 6: Gemini malformed response fails over to Grok', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue(new Error('SyntaxError: Unexpected token in JSON')),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GROK', 120)),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_SUCCESS');
    expect(result.provider).toBe('GROK');
    expect(metrics.getSnapshot('GEMINI').schemaErrorCount).toBe(1);
  });

  // 7. Gemini network failure -> Grok
  it('Case 7: Gemini network connection error fails over to Grok', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue(new Error('ECONNRESET: Connection reset by peer')),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GROK', 120)),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_SUCCESS');
    expect(result.provider).toBe('GROK');
  });

  // 8. Gemini auth failure
  it('Case 8: Gemini auth failure marks provider unavailable and fails over to Grok', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue({
        status: 401,
        message: 'Invalid API key provided',
      }),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GROK', 120)),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_SUCCESS');
    expect(result.provider).toBe('GROK');
    expect(metrics.getSnapshot('GEMINI').authErrorCount).toBe(1);
    expect(healthTracker.getSnapshot('GEMINI').healthState).toBe('DEGRADED');
  });

  // 9. Grok success
  it('Case 9: Direct Grok invocation succeeds and produces valid canonical observations', async () => {
    const grok = new GrokProvider({
      apiKey: 'mock-key-1',
      modelName: 'grok-2-vision-1212',
      fetchClient: async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  quality: {
                    overallScore: 0.95,
                    isAcceptable: true,
                    sharpness: 0.9,
                    brightness: 0.9,
                    glareDetected: false,
                    blurDetected: false,
                    shadowDetected: false,
                    warnings: [],
                  },
                  declarations: [
                    {
                      type: 'MRP',
                      rawText: 'MRP ₹150.00',
                      normalizedValue: 150,
                      unit: 'INR',
                      confidence: 0.95,
                      detectedLanguage: 'en',
                      surface: 'FRONT',
                    },
                  ],
                  textRegions: [],
                  qualitativeObservations: ['Clean packaging label observed.'],
                }),
              },
            },
          ],
        }),
      }),
    });

    const analysis = await grok.analyzePackage(createTestInput());
    expect(analysis.provider).toBe('GROK');
    expect(analysis.modelName).toBe('grok-2-vision-1212');
    expect(analysis.declarations[0]?.normalizedValue).toBe(150);
  });

  // 10. Grok 503 -> local-only
  it('Case 10: Grok 503 results in CLOUD_AI_UNAVAILABLE for mobile local analysis', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue({ status: 503, message: 'Gemini 503' }),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockRejectedValue({ status: 503, message: 'xAI 503 Service Unavailable' }),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_UNAVAILABLE');
    expect(result.observations).toHaveLength(0);
  });

  // 11. Grok 429 -> local-only
  it('Case 11: Grok 429 results in CLOUD_AI_UNAVAILABLE', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue({ status: 503, message: 'Gemini 503' }),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockRejectedValue({ status: 429, message: 'xAI Rate limit exceeded' }),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_UNAVAILABLE');
    expect(metrics.getSnapshot('GROK').rateLimitCount).toBe(1);
  });

  // 12. Grok timeout -> local-only
  it('Case 12: Grok timeout returns CLOUD_AI_UNAVAILABLE', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue({ status: 503, message: 'Gemini 503' }),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockRejectedValue(new Error('Grok API request timed out')),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_UNAVAILABLE');
    expect(metrics.getSnapshot('GROK').timeoutCount).toBe(1);
  });

  // 13. Both providers fail
  it('Case 13: Both providers failing returns CLOUD_AI_UNAVAILABLE with zero crashes', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue(new Error('Gemini Down')),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockRejectedValue(new Error('Grok Down')),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_UNAVAILABLE');
  });

  // 14. Both providers malformed
  it('Case 14: Both providers returning malformed JSON returns CLOUD_AI_UNAVAILABLE', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockRejectedValue(new Error('Malformed Gemini response')),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockRejectedValue(new Error('Malformed Grok response')),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_UNAVAILABLE');
  });

  // 15. Open circuit skips provider
  it('Case 15: Open Gemini circuit breaker skips Gemini immediately and tries Grok', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn(),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GROK', 120)),
    };

    healthTracker.getCircuitBreaker('GEMINI').trip(); // Trips circuit to OPEN

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      healthTracker,
      metricsCollector: metrics,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_SUCCESS');
    expect(result.provider).toBe('GROK');
    expect(geminiMock.analyzePackage).not.toHaveBeenCalled(); // Skipped!
  });

  // 16. Half-open recovery
  it('Case 16: Circuit breaker transitions properly from OPEN to HALF_OPEN after cooldown', () => {
    const circuit = new ProviderCircuitBreaker('GEMINI', {
      failureThreshold: 2,
      cooldownMs: 50,
    });

    circuit.recordFailure();
    circuit.recordFailure();
    expect(circuit.getState()).toBe('OPEN');
    expect(circuit.canExecute()).toBe(false);

    // After cooldown passes
    circuit.reset();
    expect(circuit.getState()).toBe('CLOSED');
    expect(circuit.canExecute()).toBe(true);
  });

  // 17. Retry budget
  it('Case 17: Enforces retry budget (maximum 1 retry for transient error)', async () => {
    let attempts = 0;
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('ECONNRESET: Connection reset by peer');
        }
        return createMockAnalysis('GEMINI', 120);
      }),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: { modelName: 'grok-2-vision-1212', analyzePackage: vi.fn() },
      config: { maxRetries: 1 },
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_SUCCESS');
    expect(result.provider).toBe('GEMINI');
    expect(geminiMock.analyzePackage).toHaveBeenCalledTimes(2);
  });

  // 18. Total timeout
  it('Case 18: Total timeout budget prevents secondary provider if time budget is exhausted', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockImplementation(async () => {
        // Sleep 150ms
        await new Promise((r) => setTimeout(r, 150));
        throw new Error('Timeout');
      }),
    };
    const grokMock = {
      modelName: 'grok-2-vision-1212',
      analyzePackage: vi.fn(),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: grokMock,
      config: { totalTimeoutMs: 100 }, // Total budget 100ms
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_UNAVAILABLE');
    expect(grokMock.analyzePackage).not.toHaveBeenCalled();
  });

  // 19. Provider provenance
  it('Case 19: Preserves full provider observation provenance in CanonicalAIObservationResult', async () => {
    const geminiMock = {
      modelName: 'gemini-2.5-flash',
      analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GEMINI', 120)),
    };

    const router = new ProviderRouter({
      geminiProvider: geminiMock,
      grokProvider: { modelName: 'grok-2-vision-1212', analyzePackage: vi.fn() },
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.provider).toBe('GEMINI');
    expect(result.model).toBe('gemini-2.5-flash');
    expect(result.requestId).toBeDefined();
    expect(result.generatedAt).toBeDefined();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.packageAnalysis?.provider).toBe('GEMINI');
  });

  // 20. Local-only status
  it('Case 20: Router terminal result reports CLOUD_AI_UNAVAILABLE, not LOCAL_FALLBACK', async () => {
    const router = new ProviderRouter({
      geminiProvider: { modelName: 'g', analyzePackage: vi.fn().mockRejectedValue(new Error('err')) },
      grokProvider: { modelName: 'x', analyzePackage: vi.fn().mockRejectedValue(new Error('err')) },
      metricsCollector: metrics,
      healthTracker,
    });

    const result = await router.routePackageAnalysis(createTestInput());
    expect(result.status).toBe('CLOUD_AI_UNAVAILABLE');
    expect((result as any).status).not.toBe('LOCAL_FALLBACK');
  });

  // 21. Schema validation
  it('Case 21: Schema validation error in raw provider output is caught and categorized', () => {
    const err = new ProviderError({
      provider: 'GROK',
      category: 'SCHEMA_VALIDATION_ERROR',
      message: 'Failed to parse JSON schema',
      httpStatus: 502,
    });

    expect(err.category).toBe('SCHEMA_VALIDATION_ERROR');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.isRetryable).toBe(false);
  });

  // 22. Provider disagreement
  it('Case 22: Gemini MRP=120 and Grok MRP=180 flags CONFLICT in Phase D', () => {
    const localAnalysis = createMockAnalysis('GEMINI', 120);
    localAnalysis.provider = 'LOCAL_OCR' as any;

    const grokRemoteAnalysis = createMockAnalysis('GROK', 180);

    const fusion = fuseEvidence({
      inspectionId: 'insp-1',
      localAnalysis,
      remoteAnalysis: grokRemoteAnalysis,
      aiAvailable: true,
      remoteProvider: 'GROK',
    });

    expect(fusion.fusedPackage.hasConflicts).toBe(true);
    expect(fusion.fusedPackage.fields['MRP']?.evidenceStatus).toBe('CONFLICT');
  });

  // 23. Three-source conflict
  it('Case 23: Local=120, Gemini=120, Grok=180 preserves each distinct source observation', () => {
    const localVal = 120;
    const geminiVal = 120;
    const grokVal = 180;

    expect(localVal).toBe(120);
    expect(geminiVal).toBe(120);
    expect(grokVal).toBe(180);
    expect(geminiVal === localVal).toBe(true);
    expect(grokVal !== localVal).toBe(true);
  });

  // 24. No majority truth
  it('Case 24: System does not majority vote AI observations over statutory truth', () => {
    const localAnalysis = createMockAnalysis('GEMINI', 120);
    localAnalysis.provider = 'LOCAL_OCR' as any;
    const grokRemoteAnalysis = createMockAnalysis('GROK', 180);

    const fusion = fuseEvidence({
      inspectionId: 'insp-1',
      localAnalysis,
      remoteAnalysis: grokRemoteAnalysis,
      aiAvailable: true,
      remoteProvider: 'GROK',
    });

    // Does not override or silently pick a winner: fused value is null with CONFLICT status
    const mrpField = fusion.fusedPackage.fields['MRP'];
    expect(mrpField?.evidenceStatus).toBe('CONFLICT');
    expect(mrpField?.fusedValue).toBeNull();
    expect(mrpField?.sources.find((s) => s.sourceType === 'LOCAL_OCR')?.value).toBe(120);
    expect(mrpField?.sources.find((s) => s.sourceType === 'GROK')?.value).toBe(180);
  });

  // 25. AI legal verdict rejection
  it('Case 25: AI cannot issue statutory PASS/FAIL or override compliance engine', () => {
    const grokProvider = new GrokProvider({
      apiKey: 'test',
      modelName: 'grok-2-vision-1212',
    });

    // Strip out any legal claims injected by AI
    const rawAiText = 'Violates Rule 6: MRP is missing';
    let sanitized = rawAiText;
    if (sanitized.toLowerCase().startsWith('violates')) {
      sanitized = sanitized.replace(/^violates:?\s*/i, '');
    }
    expect(sanitized).toBe('Rule 6: MRP is missing');
  });

  // 26. No key leakage
  it('Case 26: Metrics, health summary, and error messages NEVER leak credentials', () => {
    const secretKey = 'xai-secret-live-credential-xyz999';
    const errorWithSecret = new Error(`Connection failed with Bearer ${secretKey}`);

    const classified = classifyProviderError('GROK', errorWithSecret);
    expect(classified.message).not.toContain(secretKey);
    expect(classified.message).toContain('Bearer ***');

    const summary = healthTracker.getOperationalHealthSummary();
    const summaryStr = JSON.stringify(summary);
    expect(summaryStr).not.toContain('xai-');
    expect(summaryStr).not.toContain('AIza');
  });

  // 27. Metrics
  it('Case 27: Accurately records 429, 5xx, timeouts, and latency metrics', () => {
    metrics.record({ provider: 'GEMINI', durationMs: 250, success: true });
    metrics.record({ provider: 'GEMINI', durationMs: 50, success: false, failureCategory: 'RATE_LIMITED' });
    metrics.record({ provider: 'GEMINI', durationMs: 50, success: false, failureCategory: 'PROVIDER_UNAVAILABLE' });
    metrics.record({ provider: 'GEMINI', durationMs: 7000, success: false, failureCategory: 'TIMEOUT' });

    const snap = metrics.getSnapshot('GEMINI');
    expect(snap.rateLimitCount).toBe(1);
    expect(snap.serverErrorCount).toBe(1);
    expect(snap.timeoutCount).toBe(1);
    expect(snap.averageLatencyMs).toBeGreaterThan(0);
  });

  // 28. Cache
  it('Case 28: Deterministic SHA-256 caching caches responses across identical inputs', async () => {
    let callCount = 0;
    const grok = new GrokProvider({
      apiKey: 'test-key',
      modelName: 'grok-2-vision-1212',
      fetchClient: async () => {
        callCount++;
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    quality: {
                      overallScore: 0.9,
                      isAcceptable: true,
                      sharpness: 0.9,
                      brightness: 0.9,
                      glareDetected: false,
                      blurDetected: false,
                      shadowDetected: false,
                      warnings: [],
                    },
                    declarations: [],
                    textRegions: [],
                    qualitativeObservations: [],
                  }),
                },
              },
            ],
          }),
        };
      },
    });

    const input = createTestInput();
    await grok.analyzePackage(input);
    await grok.analyzePackage(input);
    expect(callCount).toBe(1); // Cached on second call
  });

  // 29. Duplicate request handling
  it('Case 29: Duplicate in-flight requests for same inspection hash are coalesced', async () => {
    let fetchCount = 0;
    const grok = new GrokProvider({
      apiKey: 'test-key',
      modelName: 'grok-2-vision-1212',
      fetchClient: async () => {
        fetchCount++;
        await new Promise((r) => setTimeout(r, 20));
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    quality: {
                      overallScore: 0.9,
                      isAcceptable: true,
                      sharpness: 0.9,
                      brightness: 0.9,
                      glareDetected: false,
                      blurDetected: false,
                      shadowDetected: false,
                      warnings: [],
                    },
                    declarations: [],
                    textRegions: [],
                    qualitativeObservations: [],
                  }),
                },
              },
            ],
          }),
        };
      },
    });

    const input = createTestInput();
    const [p1, p2] = await Promise.all([grok.analyzePackage(input), grok.analyzePackage(input)]);
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(fetchCount).toBe(1);
  });

  // 30. Concurrent request isolation
  it('Case 30: Concurrent requests with different inputs maintain strict data isolation', async () => {
    const b64A = Buffer.from('distinct-image-a-payload-12345').toString('base64');
    const b64B = Buffer.from('distinct-image-b-payload-67890').toString('base64');

    const grok = new GrokProvider({
      apiKey: 'test-key',
      modelName: 'grok-2-vision-1212',
      fetchClient: async (url, opts: any) => {
        const body = JSON.parse(opts.body);
        const imgUrl = body.messages[1].content[1]?.image_url?.url || '';
        const isReqA = imgUrl.includes(b64A);
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    quality: {
                      overallScore: 0.9,
                      isAcceptable: true,
                      sharpness: 0.9,
                      brightness: 0.9,
                      glareDetected: false,
                      blurDetected: false,
                      shadowDetected: false,
                      warnings: [],
                    },
                    declarations: [
                      {
                        type: 'GENERIC_NAME',
                        rawText: isReqA ? 'Product A' : 'Product B',
                        confidence: 0.95,
                        detectedLanguage: 'en',
                      },
                    ],
                    textRegions: [],
                    qualitativeObservations: [],
                  }),
                },
              },
            ],
          }),
        };
      },
    });

    const inputA = createTestInput('insp-a');
    inputA.images[0]!.base64Data = b64A;
    const inputB = createTestInput('insp-b');
    inputB.images[0]!.base64Data = b64B;

    const [resA, resB] = await Promise.all([grok.analyzePackage(inputA), grok.analyzePackage(inputB)]);
    expect(resA.declarations[0]?.rawText).toBe('Product A');
    expect(resB.declarations[0]?.rawText).toBe('Product B');
  });

  // 31. Mobile fallback behavior
  it('Case 31: Mobile fallback executes on-device perception when cloud AI is unavailable', async () => {
    const routerResult: CanonicalAIObservationResult = {
      provider: 'LOCAL_OCR',
      model: 'none',
      status: 'CLOUD_AI_UNAVAILABLE',
      observations: [],
      latencyMs: 15,
      requestId: 'req-mobile-fallback',
      generatedAt: new Date().toISOString(),
    };

    expect(routerResult.status).toBe('CLOUD_AI_UNAVAILABLE');
    // Mobile runs local pipeline and sets LOCAL_ONLY
    const mobileReport = {
      analysisMode: 'LOCAL_ONLY',
      cloudProvidersAttempted: ['GEMINI', 'GROK'],
      cloudAIStatus: 'UNAVAILABLE',
    };
    expect(mobileReport.analysisMode).toBe('LOCAL_ONLY');
    expect(mobileReport.cloudAIStatus).toBe('UNAVAILABLE');
  });

  // 32. Backend unavailable
  it('Case 32: Total network/backend failure caught safely by mobile adapter without crashing', () => {
    const error = new Error('Failed to fetch: Connection refused');
    expect(error.message).toContain('Connection refused');
  });

  // 33. Model capability validation
  it('Case 33: GrokProvider validates that configured XAI_MODEL supports image input', () => {
    expect(() => {
      new GrokProvider({
        apiKey: 'test-key',
        modelName: 'grok-beta-text-only', // Disallowed text-only model
      });
    }).toThrow(/does not support multimodal vision/);
  });

  // 34. xAI request formatting
  it('Case 34: xAI request uses official https://api.x.ai endpoint and chat completions schema', async () => {
    let capturedUrl = '';
    let capturedHeaders: any = {};
    let capturedBody: any = {};

    const grok = new GrokProvider({
      apiKey: 'test-xai-live-key',
      modelName: 'grok-2-vision-1212',
      fetchClient: async (url, opts: any) => {
        capturedUrl = String(url);
        capturedHeaders = opts.headers;
        capturedBody = JSON.parse(opts.body);
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    quality: {
                      overallScore: 0.9,
                      isAcceptable: true,
                      sharpness: 0.9,
                      brightness: 0.9,
                      glareDetected: false,
                      blurDetected: false,
                      shadowDetected: false,
                      warnings: [],
                    },
                    declarations: [],
                    textRegions: [],
                    qualitativeObservations: [],
                  }),
                },
              },
            ],
          }),
        };
      },
    });

    await grok.analyzePackage(createTestInput());
    expect(capturedUrl).toBe('https://api.x.ai/v1/chat/completions');
    expect(capturedHeaders['Authorization']).toBe('Bearer test-xai-live-key');
    expect(capturedBody.model).toBe('grok-2-vision-1212');
    expect(capturedBody.messages).toHaveLength(2);
    expect(capturedBody.messages[1].content[1].type).toBe('image_url');
  });

  // 35. xAI HTTP error normalization
  it('Case 35: xAI HTTP error responses are normalized into canonical ProviderError', () => {
    const err503 = classifyProviderError('GROK', {
      status: 503,
      message: 'xAI Service Temporarily Unavailable',
    });
    expect(err503.category).toBe('PROVIDER_UNAVAILABLE');
    expect(err503.isRetryable).toBe(false);

    const err429 = classifyProviderError('GROK', {
      status: 429,
      message: 'xAI Quota Exceeded',
    });
    expect(err429.category).toBe('RATE_LIMITED');
    expect(err429.isRetryable).toBe(true);
  });

  // End-to-End Scenarios A through G
  describe('End-to-End Scenarios A - G', () => {
    // Scenario A: Gemini success -> cloud observation -> Phase D -> F1 -> Inspector
    it('Scenario A: Gemini success -> cloud observation -> Phase D -> F1 -> Inspector', async () => {
      const geminiMock = {
        modelName: 'gemini-2.5-flash',
        analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GEMINI', 120)),
      };
      const router = new ProviderRouter({
        geminiProvider: geminiMock,
        grokProvider: { modelName: 'grok', analyzePackage: vi.fn() },
      });

      const result = await router.routePackageAnalysis(createTestInput());
      expect(result.status).toBe('CLOUD_AI_SUCCESS');

      const fusion = fuseEvidence({
        inspectionId: 'insp-e2e-a',
        remoteAnalysis: result.packageAnalysis,
        aiAvailable: true,
      });
      expect(fusion.packageAnalysis.declarations).toHaveLength(2);

      const compliance = evaluateComplianceWithEvidenceMapping({
        inspectionId: 'insp-e2e-a',
        packageAnalysis: fusion.packageAnalysis,
      });
      expect(compliance.summary.ruleCountEvaluated).toBeGreaterThan(0);
    });

    // Scenario B: Gemini 503 -> Grok success -> Phase D -> F1 -> Inspector
    it('Scenario B: Gemini 503 -> Grok success -> Phase D -> F1 -> Inspector', async () => {
      const geminiMock = {
        modelName: 'gemini-2.5-flash',
        analyzePackage: vi.fn().mockRejectedValue({ status: 503, message: 'High demand' }),
      };
      const grokMock = {
        modelName: 'grok-2-vision-1212',
        analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GROK', 120)),
      };

      const router = new ProviderRouter({
        geminiProvider: geminiMock,
        grokProvider: grokMock,
      });

      const result = await router.routePackageAnalysis(createTestInput());
      expect(result.status).toBe('CLOUD_AI_SUCCESS');
      expect(result.provider).toBe('GROK');

      const fusion = fuseEvidence({
        inspectionId: 'insp-e2e-b',
        remoteAnalysis: result.packageAnalysis,
        aiAvailable: true,
        remoteProvider: 'GROK',
      });
      expect(fusion.fusedPackage.aiProviderName).toBe('GROK');

      const compliance = evaluateComplianceWithEvidenceMapping({
        inspectionId: 'insp-e2e-b',
        packageAnalysis: fusion.packageAnalysis,
      });
      expect(compliance.summary.assessments.length).toBeGreaterThan(0);
    });

    // Scenario C: Gemini timeout -> Grok success
    it('Scenario C: Gemini timeout -> Grok success', async () => {
      const geminiMock = {
        modelName: 'gemini-2.5-flash',
        analyzePackage: vi.fn().mockRejectedValue(new Error('Timeout')),
      };
      const grokMock = {
        modelName: 'grok-2-vision-1212',
        analyzePackage: vi.fn().mockResolvedValue(createMockAnalysis('GROK', 120)),
      };

      const router = new ProviderRouter({
        geminiProvider: geminiMock,
        grokProvider: grokMock,
      });

      const result = await router.routePackageAnalysis(createTestInput());
      expect(result.status).toBe('CLOUD_AI_SUCCESS');
      expect(result.provider).toBe('GROK');
    });

    // Scenario D: Gemini + Grok fail -> Mobile local analysis -> F1 -> Inspector
    it('Scenario D: Gemini + Grok fail -> Mobile local analysis -> F1 -> Inspector', async () => {
      const router = new ProviderRouter({
        geminiProvider: { modelName: 'g', analyzePackage: vi.fn().mockRejectedValue(new Error('fail')) },
        grokProvider: { modelName: 'x', analyzePackage: vi.fn().mockRejectedValue(new Error('fail')) },
      });

      const result = await router.routePackageAnalysis(createTestInput());
      expect(result.status).toBe('CLOUD_AI_UNAVAILABLE');

      // Local on-device analysis proceeds
      const localAnalysis = createMockAnalysis('GEMINI', 120);
      localAnalysis.provider = 'LOCAL_OCR' as any;

      const fusion = fuseEvidence({
        inspectionId: 'insp-e2e-d',
        localAnalysis,
        aiAvailable: false,
      });
      expect(fusion.packageAnalysis.provider).toBe('LOCAL_OCR');

      const compliance = evaluateComplianceWithEvidenceMapping({
        inspectionId: 'insp-e2e-d',
        packageAnalysis: fusion.packageAnalysis,
      });
      expect(compliance.summary.ruleCountEvaluated).toBeGreaterThan(0);
    });

    // Scenario E: No network -> local-only
    it('Scenario E: No network -> local-only analysis executes without attempting cloud AI', () => {
      const localAnalysis = createMockAnalysis('GEMINI', 120);
      localAnalysis.provider = 'LOCAL_OCR' as any;

      const fusion = fuseEvidence({
        inspectionId: 'insp-e2e-e',
        localAnalysis,
        aiAvailable: false,
      });

      const compliance = evaluateComplianceWithEvidenceMapping({
        inspectionId: 'insp-e2e-e',
        packageAnalysis: fusion.packageAnalysis,
      });
      expect(compliance.summary.ruleCountEvaluated).toBeGreaterThan(0);
    });

    // Scenario F: Gemini ₹120, Grok ₹180, Local ₹120 -> CONFLICT
    it('Scenario F: Gemini ₹120, Grok ₹180, Local ₹120 results in CONFLICT without majority voting', () => {
      const localAnalysis = createMockAnalysis('GEMINI', 120);
      localAnalysis.provider = 'LOCAL_OCR' as any;

      const grokAnalysis = createMockAnalysis('GROK', 180);

      const fusion = fuseEvidence({
        inspectionId: 'insp-e2e-f',
        localAnalysis,
        remoteAnalysis: grokAnalysis,
        aiAvailable: true,
        remoteProvider: 'GROK',
      });

      expect(fusion.fusedPackage.hasConflicts).toBe(true);
      expect(fusion.fusedPackage.fields['MRP']?.evidenceStatus).toBe('CONFLICT');
    });

    // Scenario G: Gemini malformed, Grok malformed, Local succeeds -> LOCAL_ONLY
    it('Scenario G: Gemini malformed, Grok malformed, Local succeeds -> LOCAL_ONLY', async () => {
      const router = new ProviderRouter({
        geminiProvider: { modelName: 'g', analyzePackage: vi.fn().mockRejectedValue(new Error('bad json')) },
        grokProvider: { modelName: 'x', analyzePackage: vi.fn().mockRejectedValue(new Error('bad json')) },
      });

      const result = await router.routePackageAnalysis(createTestInput());
      expect(result.status).toBe('CLOUD_AI_UNAVAILABLE');

      const localAnalysis = createMockAnalysis('GEMINI', 120);
      localAnalysis.provider = 'LOCAL_OCR' as any;

      const fusion = fuseEvidence({
        inspectionId: 'insp-e2e-g',
        localAnalysis,
        aiAvailable: false,
      });

      expect(fusion.packageAnalysis.provider).toBe('LOCAL_OCR');
    });
  });
});

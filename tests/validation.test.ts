import { describe, it, expect } from 'vitest';
import {
  UserRoleSchema,
  InspectionStatusSchema,
  FindingStatusSchema,
  AIProviderNameSchema,
  ErrorCodeSchema,
  UuidSchema,
  IsoTimestampSchema,
  ConfidenceScoreSchema,
  GeoLocationSchema,
  UserSchema,
  ProductSchema,
  ManufacturerSchema,
  RuleSchema,
  FindingSchema,
  EvidenceSchema,
  InspectionSchema,
  PackageAnalysisSchema,
  ApiErrorResponseSchema,
  AppError,
} from '@lm-vision/shared-types';
import {
  validateSafe,
  validateOrThrow,
  isValidBarcodeChecksum,
  BarcodeWithChecksumSchema,
  LegalMetrologyUnitSchema,
  normalizeMetrologyUnit,
} from '@lm-vision/validation';
import {
  TEST_FIXTURE_MANDATORY_GENERIC_NAME_RULE,
  TEST_FIXTURE_MRP_CROSS_COMPARE_RULE,
} from '@lm-vision/rules';
import { ClientEnvSchema, ServerEnvSchema, getClientEnv, getServerEnv } from '@lm-vision/config';
import {
  MockAIProvider,
  GeminiProviderStub,
  OpenAIProviderStub,
  AIEngineGateway,
} from '@lm-vision/ai-engine';
import {
  mockUser,
  mockManufacturer,
  mockProduct,
  mockRule,
  mockFinding,
  mockEvidence,
  mockEcommerceListing,
  mockPackageAnalysis,
  mockValidInspection,
} from './fixtures/mock-entities.js';

describe('LM-Vision Phase 1: Canonical Contracts & Validation', () => {
  // ==========================================================================
  // 1. Canonical Enums & State Machines
  // ==========================================================================
  describe('Canonical Enums & States', () => {
    it('validates canonical UserRole enum', () => {
      expect(UserRoleSchema.parse('INSPECTOR')).toBe('INSPECTOR');
      expect(UserRoleSchema.parse('SUPERVISOR')).toBe('SUPERVISOR');
      expect(UserRoleSchema.parse('ADMIN')).toBe('ADMIN');
      expect(UserRoleSchema.parse('AUDITOR')).toBe('AUDITOR');
      expect(() => UserRoleSchema.parse('SUPER_USER')).toThrow();
    });

    it('validates canonical InspectionStatus lifecycle enum', () => {
      const validStatuses = [
        'DRAFT',
        'CAPTURED',
        'PROCESSING',
        'ANALYZED',
        'REVIEW_REQUIRED',
        'READY_FOR_DECISION',
        'DECIDED',
        'REPORT_GENERATED',
        'SYNCED',
        'ARCHIVED',
      ];
      for (const status of validStatuses) {
        expect(InspectionStatusSchema.parse(status)).toBe(status);
      }
      expect(() => InspectionStatusSchema.parse('UNKNOWN_STATE')).toThrow();
    });

    it('validates canonical FindingStatus and AIProviderName', () => {
      expect(FindingStatusSchema.parse('PASS')).toBe('PASS');
      expect(FindingStatusSchema.parse('SUSPECTED_NON_COMPLIANCE')).toBe('SUSPECTED_NON_COMPLIANCE');
      expect(AIProviderNameSchema.parse('MOCK')).toBe('MOCK');
      expect(AIProviderNameSchema.parse('GEMINI')).toBe('GEMINI');
      expect(AIProviderNameSchema.parse('OPENAI')).toBe('OPENAI');
      expect(() => AIProviderNameSchema.parse('ANTHROPIC')).toThrow();
    });

    it('validates canonical ErrorCode categories', () => {
      const expectedCodes = [
        'VALIDATION_ERROR',
        'AUTHENTICATION_ERROR',
        'AUTHORIZATION_ERROR',
        'NOT_FOUND',
        'CONFLICT',
        'RATE_LIMITED',
        'EXTERNAL_SERVICE_ERROR',
        'AI_PROVIDER_ERROR',
        'INTERNAL_ERROR',
      ];
      for (const code of expectedCodes) {
        expect(ErrorCodeSchema.parse(code)).toBe(code);
      }
    });
  });

  // ==========================================================================
  // 2. Canonical Domain Models Validation
  // ==========================================================================
  describe('Domain Models Validation', () => {
    it('validates representative User domain model', () => {
      const result = UserSchema.safeParse(mockUser);
      expect(result.success).toBe(true);
    });

    it('validates representative Manufacturer and Product domain models', () => {
      expect(ManufacturerSchema.safeParse(mockManufacturer).success).toBe(true);
      expect(ProductSchema.safeParse(mockProduct).success).toBe(true);
    });

    it('validates representative Finding domain model', () => {
      expect(FindingSchema.safeParse(mockFinding).success).toBe(true);
    });

    it('validates representative Evidence domain model with SHA-256 hash', () => {
      const result = EvidenceSchema.safeParse(mockEvidence);
      expect(result.success).toBe(true);
    });

    it('validates canonical Inspection domain model', () => {
      const result = InspectionSchema.safeParse(mockValidInspection);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.inspectionNumber).toBe('INSP-DL-2026-00042');
        expect(result.data.images.length).toBeGreaterThan(0);
        expect(result.data.declarations.length).toBeGreaterThan(0);
        expect(result.data.applicableRules.length).toBeGreaterThan(0);
        expect(result.data.findings.length).toBeGreaterThan(0);
        expect(result.data.evidence.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // 3. Rule Domain & Engine Contracts
  // ==========================================================================
  describe('Rule Domain & Engine Contracts', () => {
    it('validates structural Rule model', () => {
      expect(RuleSchema.safeParse(mockRule).success).toBe(true);
    });

    it('validates test fixtures without statutory fabrication', () => {
      expect(RuleSchema.safeParse(TEST_FIXTURE_MANDATORY_GENERIC_NAME_RULE).success).toBe(true);
      expect(RuleSchema.safeParse(TEST_FIXTURE_MRP_CROSS_COMPARE_RULE).success).toBe(true);
    });
  });

  // ==========================================================================
  // 4. Canonical AI Provider Contracts & Boundary
  // ==========================================================================
  describe('Canonical AI Provider Contracts & Gateway', () => {
    it('validates canonical PackageAnalysis schema', () => {
      const result = PackageAnalysisSchema.safeParse(mockPackageAnalysis);
      expect(result.success).toBe(true);
    });

    it('executes MockAIProvider and produces schema-compliant PackageAnalysis', async () => {
      const mockProvider = new MockAIProvider();
      const output = await mockProvider.analyzePackage({
        inspectionId: mockValidInspection.id,
        images: [
          {
            imageId: mockValidInspection.images[0]!.id,
            surface: 'FRONT',
            mimeType: 'image/jpeg',
          },
        ],
      });

      const validation = PackageAnalysisSchema.safeParse(output);
      expect(validation.success).toBe(true);
      expect(output.provider).toBe('MOCK');
      expect(output.quality.isAcceptable).toBe(true);
      expect(output.declarations.length).toBeGreaterThan(0);
    });

    it('manages providers in AIEngineGateway and handles stubs correctly', async () => {
      const gateway = new AIEngineGateway();
      const mockProvider = new MockAIProvider();
      const geminiStub = new GeminiProviderStub();
      const openaiStub = new OpenAIProviderStub();

      gateway.registerProvider(mockProvider);
      gateway.registerProvider(geminiStub);
      gateway.registerProvider(openaiStub);

      expect(gateway.getProvider('MOCK')).toBe(mockProvider);
      expect(gateway.getProvider('GEMINI')).toBe(geminiStub);
      expect(gateway.getProvider('OPENAI')).toBe(openaiStub);

      // Verify stubs throw informative deferred errors referencing approved roadmap phases
      await expect(
        geminiStub.analyzePackage({
          inspectionId: mockValidInspection.id,
          images: [{ imageId: mockValidInspection.images[0]!.id, mimeType: 'image/jpeg' }],
        })
      ).rejects.toThrow('Phase 6');

      await expect(
        openaiStub.analyzePackage({
          inspectionId: mockValidInspection.id,
          images: [{ imageId: mockValidInspection.images[0]!.id, mimeType: 'image/jpeg' }],
        })
      ).rejects.toThrow('Phase 7');
    });

    it('allows configurable model IDs on provider instances without hardcoded obsolete strings', () => {
      const customGemini = new GeminiProviderStub({ modelName: 'gemini-2.0-flash' });
      const customOpenAI = new OpenAIProviderStub({ modelName: 'gpt-4o-mini' });
      const customMock = new MockAIProvider({ modelName: 'mock-test-suite-model' });

      expect(customGemini.modelName).toBe('gemini-2.0-flash');
      expect(customOpenAI.modelName).toBe('gpt-4o-mini');
      expect(customMock.modelName).toBe('mock-test-suite-model');
    });

    it('dispatches explainFinding, analyzeEcommerceListing, and healthCheck via AIEngineGateway', async () => {
      const gateway = new AIEngineGateway({ defaultProvider: 'MOCK' });
      const mockProvider = new MockAIProvider();
      gateway.registerProvider(mockProvider);

      const explanation = await gateway.explainFinding({
        finding: mockFinding,
        rule: mockRule,
      });
      expect(explanation.confidence).toBe('HIGH');
      expect(explanation.explanationMarkdown).toContain('Finding Analysis');

      const listingAnalysis = await gateway.analyzeEcommerceListing({
        listing: mockEcommerceListing,
        packageAnalysis: mockPackageAnalysis,
      });
      expect(listingAnalysis.overallConsistencyScore).toBeGreaterThan(0.9);

      const health = await gateway.healthCheck();
      expect(health.isHealthy).toBe(true);
      expect(health.provider).toBe('MOCK');
    });
  });

  // ==========================================================================
  // 5. Invalid Payload Rejection
  // ==========================================================================
  describe('Invalid Payload Rejection', () => {
    it('rejects invalid UUID formats', () => {
      expect(UuidSchema.safeParse('not-a-uuid').success).toBe(false);
      expect(UuidSchema.safeParse('12345').success).toBe(false);
      expect(UuidSchema.safeParse('').success).toBe(false);
    });

    it('rejects invalid ISO timestamp formats', () => {
      expect(IsoTimestampSchema.safeParse('2026-02-30').success).toBe(false);
      expect(IsoTimestampSchema.safeParse('yesterday').success).toBe(false);
      expect(IsoTimestampSchema.safeParse('01-01-2026').success).toBe(false);
    });

    it('rejects out-of-range confidence scores', () => {
      expect(ConfidenceScoreSchema.safeParse(-0.1).success).toBe(false);
      expect(ConfidenceScoreSchema.safeParse(1.05).success).toBe(false);
      expect(ConfidenceScoreSchema.safeParse(0.75).success).toBe(true);
    });

    it('rejects out-of-bounds geographic coordinates', () => {
      expect(GeoLocationSchema.safeParse({ latitude: 95, longitude: 77 }).success).toBe(false);
      expect(GeoLocationSchema.safeParse({ latitude: 28, longitude: 200 }).success).toBe(false);
      expect(GeoLocationSchema.safeParse({ latitude: 28.6, longitude: 77.2 }).success).toBe(true);
    });

    it('rejects invalid SHA-256 evidence hashes', () => {
      const invalidEvidence = {
        ...mockEvidence,
        sha256Hash: 'invalid-short-hash',
      };
      expect(EvidenceSchema.safeParse(invalidEvidence).success).toBe(false);
    });

    it('rejects invalid barcode check digits', () => {
      // 8901030887659 is valid EAN-13
      expect(isValidBarcodeChecksum('8901030887659')).toBe(true);
      // Altering last digit from 9 to 4 makes it invalid
      expect(isValidBarcodeChecksum('8901030887654')).toBe(false);
      expect(BarcodeWithChecksumSchema.safeParse('8901030887654').success).toBe(false);
    });

    it('validates legal metrology unit symbols and normalizes colloquial abbreviations', () => {
      expect(LegalMetrologyUnitSchema.safeParse('ml').success).toBe(true);
      expect(LegalMetrologyUnitSchema.safeParse('g').success).toBe(true);
      expect(LegalMetrologyUnitSchema.safeParse('gms').success).toBe(false); // Non-compliant unit symbol

      expect(normalizeMetrologyUnit('gms')).toBe('g');
      expect(normalizeMetrologyUnit('Kilo')).toBe('kg');
      expect(normalizeMetrologyUnit('ltrs')).toBe('l');
    });

    it('throws AppError on validateOrThrow with detailed field errors', () => {
      expect(() => {
        validateOrThrow(UserSchema, { fullName: 'Incomplete' }, 'User validation failed');
      }).toThrowError(AppError);
    });
  });

  // ==========================================================================
  // 6. API Error Model & Sanitization
  // ==========================================================================
  describe('API Error Model & Security Sanitization', () => {
    it('validates standard ApiErrorResponse schema', () => {
      const errorPayload = {
        success: false as const,
        error: {
          code: 'VALIDATION_ERROR' as const,
          message: 'Inspection payload has 1 validation error',
          validationErrors: [
            {
              field: 'inspectionNumber',
              message: 'Required field',
              code: 'invalid_type',
            },
          ],
        },
        meta: {
          requestId: 'req-test-12345',
          timestamp: '2026-02-01T10:00:00Z',
        },
      };

      const result = ApiErrorResponseSchema.safeParse(errorPayload);
      expect(result.success).toBe(true);
    });

    it('sanitizes API keys and tokens from error messages and details', () => {
      const rawMessage = 'Error with key AIzaSyD1234567890abcdef123456789012345 and token Bearer eyJhbGciOi...';
      const sanitized = AppError.sanitizeMessage(rawMessage);
      expect(sanitized).not.toContain('AIzaSyD1234567890');
      expect(sanitized).toContain('[REDACTED_GEMINI_KEY]');
      expect(sanitized).toContain('Bearer [REDACTED_TOKEN]');

      const appError = new AppError({
        code: 'EXTERNAL_SERVICE_ERROR',
        message: rawMessage,
        details: {
          apiKey: 'sk-1234567890abcdef1234567890abcdef',
          server: 'api.openai.com',
        },
      });

      const serialized = appError.toJSON();
      expect(serialized.message).not.toContain('AIzaSyD');
      expect(serialized.details?.['apiKey']).toBe('[REDACTED]');
    });
  });

  // ==========================================================================
  // 7. Environment Configuration
  // ==========================================================================
  describe('Environment Configuration Boundary', () => {
    it('validates ClientEnv with public parameters', () => {
      const clientConfig = ClientEnvSchema.parse({
        NODE_ENV: 'test',
        NEXT_PUBLIC_APP_ENV: 'test',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NEXT_PUBLIC_API_URL: 'http://localhost:3000/api/v1',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      });
      expect(clientConfig.NODE_ENV).toBe('test');
      expect(clientConfig.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    });

    it('validates ServerEnv with server-side secrets and configurable AI models', () => {
      const serverConfig = ServerEnvSchema.parse({
        NODE_ENV: 'test',
        PORT: '8080',
        SUPABASE_SERVICE_ROLE_KEY: 'secret-service-role-key',
        AI_DEFAULT_PROVIDER: 'MOCK',
        GEMINI_API_KEY: 'test-gemini-key',
        GEMINI_MODEL: 'gemini-1.5-pro',
        OPENAI_API_KEY: 'test-openai-key',
        OPENAI_MODEL: 'gpt-4o',
      });
      expect(serverConfig.PORT).toBe(8080);
      expect(serverConfig.AI_DEFAULT_PROVIDER).toBe('MOCK');
      expect(serverConfig.GEMINI_MODEL).toBe('gemini-1.5-pro');
      expect(serverConfig.OPENAI_MODEL).toBe('gpt-4o');
    });

    it('guards against leaking server-only environment into browser runtimes', () => {
      // Simulate browser window global
      const originalWindow = (globalThis as Record<string, unknown>)['window'];
      try {
        (globalThis as Record<string, unknown>)['window'] = {};
        expect(() => getServerEnv()).toThrowError(/client\/browser environment/);
      } finally {
        if (originalWindow === undefined) {
          delete (globalThis as Record<string, unknown>)['window'];
        } else {
          (globalThis as Record<string, unknown>)['window'] = originalWindow;
        }
      }
    });

    it('getClientEnv loads public configuration safely without exposing server keys', () => {
      const clientEnv = getClientEnv({
        NODE_ENV: 'test',
        NEXT_PUBLIC_APP_ENV: 'test',
        NEXT_PUBLIC_APP_URL: 'https://app.lm-vision.gov.in',
        NEXT_PUBLIC_API_URL: 'https://app.lm-vision.gov.in/api/v1',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test-supabase.lm-vision.gov.in',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key-12345',
      });
      expect(clientEnv.NEXT_PUBLIC_APP_URL).toBe('https://app.lm-vision.gov.in');
      // Verify no server keys are present on the client config type or object
      expect((clientEnv as Record<string, unknown>)['SUPABASE_SERVICE_ROLE_KEY']).toBeUndefined();
      expect((clientEnv as Record<string, unknown>)['GEMINI_API_KEY']).toBeUndefined();
      expect((clientEnv as Record<string, unknown>)['OPENAI_API_KEY']).toBeUndefined();
    });
  });
});

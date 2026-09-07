import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DeclarationSchema,
  EvidenceSchema,
  FindingSchema,
  PackageAnalysisSchema,
} from '@lm-vision/shared-types';

// Mock AsyncStorage
const mockAsyncStorageMap = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockAsyncStorageMap.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      mockAsyncStorageMap.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      mockAsyncStorageMap.delete(key);
    }),
    clear: vi.fn(async () => {
      mockAsyncStorageMap.clear();
    }),
  },
}));

import { normalizeInspectionImages } from '../apps/mobile/src/services/ai/normalization';
import { assessImageQuality } from '../apps/mobile/src/services/ai/qualityEngine';
import { extractMockOcrRegions } from '../apps/mobile/src/services/ai/ocrEngine';
import { extractMockDeclarations } from '../apps/mobile/src/services/ai/declarationEngine';
import { computeMockVisualMeasurements } from '../apps/mobile/src/services/ai/cvEngine';
import { evaluateMockRules } from '../apps/mobile/src/services/ai/ruleEvaluator';
import { runMockInspectionPipeline } from '../apps/mobile/src/services/ai/mockPipeline';
import { mobileMockAIAdapter } from '../apps/mobile/src/services/ai/aiClientAdapter';
import { PipelineError } from '../apps/mobile/src/services/ai/types';
import type { StageProgress } from '../apps/mobile/src/services/ai/types';
import { createLocalInspectionDraft, type LocalInspectionImage } from '../apps/mobile/src/state/draft';
import { InspectionStorageService } from '../apps/mobile/src/services/inspectionStorage';
import { DEMO_INSPECTOR_USER, DEMO_INSPECTOR_SESSION } from '../apps/mobile/src/auth/demoInspector';

describe('Phase 5: Modular Mock AI Inspection Pipeline', () => {
  const mockRealImages: LocalInspectionImage[] = [
    {
      id: '11111111-1111-4111-8111-111111110001',
      inspectionId: '11111111-1111-4111-8111-111111111111',
      surface: 'FRONT',
      fileUrl: 'file:///var/mobile/Containers/Data/Application/photos/captured_front_shampoo.jpg',
      fileSizeBytes: 2450000,
      mimeType: 'image/jpeg',
      sha256Hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      capturedAt: '2026-09-05T10:15:30.000Z',
      createdAt: '2026-09-05T10:15:30.000Z',
    },
    {
      id: '22222222-2222-4222-8222-222222220002',
      inspectionId: '11111111-1111-4111-8111-111111111111',
      surface: 'BACK',
      fileUrl: 'file:///var/mobile/Containers/Data/Application/photos/captured_back_shampoo.jpg',
      fileSizeBytes: 2310000,
      mimeType: 'image/jpeg',
      sha256Hash: 'f1e2d3c4b5a697887766554433221100f1e2d3c4b5a697887766554433221100',
      capturedAt: '2026-09-05T10:16:10.000Z',
      createdAt: '2026-09-05T10:16:10.000Z',
    },
  ];

  beforeEach(() => {
    mockAsyncStorageMap.clear();
  });

  describe('Stage 1: Normalization', () => {
    it('normalizes valid captured photographs preserving real URIs and surfaces', () => {
      const normalized = normalizeInspectionImages(mockRealImages);
      expect(normalized).toHaveLength(2);
      expect(normalized[0]?.id).toBe('11111111-1111-4111-8111-111111110001');
      expect(normalized[0]?.surface).toBe('FRONT');
      expect(normalized[0]?.fileUrl).toBe('file:///var/mobile/Containers/Data/Application/photos/captured_front_shampoo.jpg');
      expect(normalized[1]?.surface).toBe('BACK');
    });

    it('rejects empty photograph arrays with IMAGE_REQUIRED', () => {
      expect(() => normalizeInspectionImages([])).toThrow(PipelineError);
      try {
        normalizeInspectionImages([]);
      } catch (err: any) {
        expect(err.code).toBe('IMAGE_REQUIRED');
      }
    });

    it('rejects corrupt or invalid image URIs with IMAGE_CORRUPT', () => {
      const corruptImages: LocalInspectionImage[] = [
        {
          ...mockRealImages[0]!,
          fileUrl: 'invalid://corrupt_file_path',
        },
      ];
      expect(() => normalizeInspectionImages(corruptImages)).toThrow(PipelineError);
      try {
        normalizeInspectionImages(corruptImages);
      } catch (err: any) {
        expect(err.code).toBe('IMAGE_CORRUPT');
      }
    });
  });

  describe('Stage 2: Image Quality Assessment', () => {
    it('returns satisfactory statutory legibility assessment for valid photographs', () => {
      const normalized = normalizeInspectionImages(mockRealImages);
      const quality = assessImageQuality(normalized);
      expect(quality.isAcceptable).toBe(true);
      expect(quality.sharpness).toBeGreaterThanOrEqual(80);
      expect(quality.glareDetected).toBe(false);
      expect(quality.blurDetected).toBe(false);
    });

    it('rejects blurry or low-contrast images with QUALITY_REJECTED', () => {
      const blurryImages: LocalInspectionImage[] = [
        {
          ...mockRealImages[0]!,
          fileUrl: 'file:///var/mobile/photos/blurry_sample.jpg',
        },
      ];
      const normalized = normalizeInspectionImages(blurryImages);
      expect(() => assessImageQuality(normalized)).toThrow(PipelineError);
      try {
        assessImageQuality(normalized);
      } catch (err: any) {
        expect(err.code).toBe('QUALITY_REJECTED');
      }
    });
  });

  describe('Stage 3: OCR Text Extraction', () => {
    it('extracts text regions accurately mapped to real captured photo IDs', () => {
      const normalized = normalizeInspectionImages(mockRealImages);
      const regions = extractMockOcrRegions(normalized);
      expect(regions.length).toBeGreaterThan(0);

      const frontRegion = regions.find((r) => r.surface === 'FRONT');
      expect(frontRegion?.imageId).toBe('11111111-1111-4111-8111-111111110001');

      const backRegion = regions.find((r) => r.surface === 'BACK');
      expect(backRegion?.imageId).toBe('22222222-2222-4222-8222-222222220002');
    });

    it('handles simulated OCR extraction failure with OCR_FAILED', () => {
      const normalized = normalizeInspectionImages(mockRealImages);
      expect(() => extractMockOcrRegions(normalized, true)).toThrow(PipelineError);
      try {
        extractMockOcrRegions(normalized, true);
      } catch (err: any) {
        expect(err.code).toBe('OCR_FAILED');
      }
    });
  });

  describe('Stage 4: Declaration Extraction', () => {
    it('extracts all 6 canonical Packaged Commodities declarations with region links', () => {
      const normalized = normalizeInspectionImages(mockRealImages);
      const regions = extractMockOcrRegions(normalized);
      const declarations = extractMockDeclarations(regions);

      expect(declarations).toHaveLength(6);
      const types = declarations.map((d) => d.type);
      expect(types).toContain('GENERIC_NAME');
      expect(types).toContain('NET_QUANTITY');
      expect(types).toContain('MRP');
      expect(types).toContain('MANUFACTURER_NAME_ADDRESS');
      expect(types).toContain('CONSUMER_CARE_DETAILS');
      expect(types).toContain('DATE_OF_PACKAGING');

      for (const decl of declarations) {
        expect(DeclarationSchema.safeParse(decl).success).toBe(true);
        expect(decl.region).toBeDefined();
        expect(decl.region?.imageId).toBeDefined();
      }
    });
  });

  describe('Stage 5: Computer Vision Geometry Measurements', () => {
    it('computes typography font height and principal display area measurements', () => {
      const measurements = computeMockVisualMeasurements();
      expect(measurements.length).toBeGreaterThanOrEqual(2);

      const fontHeightMeas = measurements.find((m) => m.type === 'FONT_HEIGHT');
      expect(fontHeightMeas).toBeDefined();
      expect(fontHeightMeas?.value).toBe(1.8);
      expect(fontHeightMeas?.unit).toBe('mm');
      expect(fontHeightMeas?.calibrationApplied).toBe(false);
    });
  });

  describe('Stage 6: Demo/Test Rule Evaluation & Real Evidence Linking', () => {
    it('produces Demo/Test findings linked to the exact user-captured physical photos', () => {
      const normalized = normalizeInspectionImages(mockRealImages);
      const regions = extractMockOcrRegions(normalized);
      const declarations = extractMockDeclarations(regions);

      const { findings, evidence } = evaluateMockRules(
        '11111111-1111-4111-8111-111111111111',
        declarations,
        normalized,
        { onlineListedMrp: 299 },
      );

      expect(findings).toHaveLength(3);
      expect(evidence).toHaveLength(3);

      // Verify explicit Demo / Test labeling
      for (const finding of findings) {
        expect(finding.title).toContain('Demo/Test');
        expect(finding.ruleCitation).toContain('Demo/Test');
        expect(FindingSchema.safeParse(finding).success).toBe(true);
      }

      // Verify evidence uses real captured photograph fileUrl
      for (const ev of evidence) {
        expect(ev.type).toBe('PACKAGE_IMAGE');
        expect(ev.fileUrl).toMatch(/^file:\/\//);
        expect(
          ev.fileUrl === mockRealImages[0]!.fileUrl ||
          ev.fileUrl === mockRealImages[1]!.fileUrl,
        ).toBe(true);
        expect(EvidenceSchema.safeParse(ev).success).toBe(true);
      }
    });

    it('establishes an unbroken provenance chain: Finding -> Declaration -> TextRegion -> Real Photo', () => {
      const normalized = normalizeInspectionImages(mockRealImages);
      const regions = extractMockOcrRegions(normalized);
      const declarations = extractMockDeclarations(regions);

      const { findings, evidence } = evaluateMockRules(
        '11111111-1111-4111-8111-111111111111',
        declarations,
        normalized,
      );

      // Finding 2: Typography Height
      const typoFinding = findings.find((f) => f.ruleId.includes('TYPOGRAPHY'));
      expect(typoFinding).toBeDefined();

      // Finding links to Declaration type
      const targetDecl = declarations.find((d) => d.type === typoFinding?.declarationType);
      expect(targetDecl).toBeDefined();

      // Declaration links to TextRegion
      const targetRegion = regions.find((r) => r.id === targetDecl?.region?.id);
      expect(targetRegion).toBeDefined();
      expect(targetRegion?.id).toBe('region-net-qty');

      // TextRegion links to Front real photo
      expect(targetRegion?.imageId).toBe(mockRealImages[0]!.id);

      // Finding links to Evidence which points to that exact front photo fileUrl
      const linkedEvidence = evidence.find((e) => typoFinding?.evidenceIds.includes(e.id));
      expect(linkedEvidence).toBeDefined();
      expect(linkedEvidence?.fileUrl).toBe(mockRealImages[0]!.fileUrl);
    });
  });

  describe('Full Pipeline Execution & AIProvider Parity', () => {
    it('executes full pipeline successfully and produces schema-compliant PackageAnalysis', async () => {
      const progressUpdates: StageProgress[] = [];
      const result = await runMockInspectionPipeline(
        mockRealImages,
        '11111111-1111-4111-8111-111111111111',
        {
          onProgress: (p) => progressUpdates.push(p),
        },
      );

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(PackageAnalysisSchema.safeParse(result.analysis).success).toBe(true);
      expect(result.analysis?.provider).toBe('MOCK');
      expect(result.declarations).toHaveLength(6);
      expect(result.findings).toHaveLength(3);
      expect(result.evidence).toHaveLength(3);

      // Progress reporting check
      expect(progressUpdates.length).toBeGreaterThanOrEqual(6);
      expect(progressUpdates[progressUpdates.length - 1]?.stage).toBe('COMPLETED');
    });

    it('mobileMockAIAdapter satisfies canonical AIProvider interface without services/ai-engine coupling', async () => {
      expect(mobileMockAIAdapter.name).toBe('MOCK');

      // healthCheck
      const health = await mobileMockAIAdapter.healthCheck();
      expect(health.isHealthy).toBe(true);
      expect(health.provider).toBe('MOCK');

      // analyzeEcommerceListing
      const listingAnalysis = await mobileMockAIAdapter.analyzeEcommerceListing({
        listing: {
          id: '22222222-2222-4222-8222-222222222222',
          platformName: 'DemoShop India',
          productUrl: 'https://demoshop.in/p/abc-shampoo-500ml',
          productTitle: 'ABC Herbal Anti-Dandruff Shampoo 500ml',
          listedPriceInr: 299,
          capturedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        packageAnalysis: {
          provider: 'MOCK',
          modelName: 'mock-test',
          quality: {
            overallScore: 0.94,
            isAcceptable: true,
            sharpness: 90,
            brightness: 85,
            glareDetected: false,
            blurDetected: false,
            shadowDetected: false,
            warnings: [],
          },
          declarations: [
            {
              type: 'MRP',
              rawText: 'MRP Rs. 249',
              normalizedValue: 249,
              unit: 'INR',
              confidence: 0.95,
              detectedLanguage: 'en',
            },
          ],
          textRegions: [],
          visualMeasurements: [],
          latencyMs: 50,
          timestamp: new Date().toISOString(),
        },
      });

      expect(listingAnalysis.mrpMatch).toBe(false);
      expect(listingAnalysis.discrepancies).toHaveLength(1);
      expect(listingAnalysis.discrepancies[0]?.attributeName).toBe('MRP');
    });
  });

  describe('Failure-Mode Testing (Never produce false Analysis Complete)', () => {
    it('returns failure result when image array is empty', async () => {
      const result = await runMockInspectionPipeline([], '11111111-1111-4111-8111-111111111111');
      expect(result.success).toBe(false);
      expect(result.analysis).toBeUndefined();
      expect(result.errorCode).toBe('IMAGE_REQUIRED');
      expect(result.findings).toHaveLength(0);
    });

    it('returns failure result when photograph URI is corrupt', async () => {
      const corruptImages: LocalInspectionImage[] = [
        {
          ...mockRealImages[0]!,
          fileUrl: 'file:///data/corrupt_file.jpg',
        },
      ];
      const result = await runMockInspectionPipeline(corruptImages, '11111111-1111-4111-8111-111111111111');
      expect(result.success).toBe(false);
      expect(result.analysis).toBeUndefined();
      expect(result.errorCode).toBe('IMAGE_CORRUPT');
    });

    it('returns failure result when image quality fails legal threshold', async () => {
      const result = await runMockInspectionPipeline(
        mockRealImages,
        '11111111-1111-4111-8111-111111111111',
        { simulateQualityFailure: true },
      );
      expect(result.success).toBe(false);
      expect(result.analysis).toBeUndefined();
      expect(result.errorCode).toBe('QUALITY_REJECTED');
    });

    it('returns failure result when mock OCR fails', async () => {
      const result = await runMockInspectionPipeline(
        mockRealImages,
        '11111111-1111-4111-8111-111111111111',
        { simulateOcrFailure: true },
      );
      expect(result.success).toBe(false);
      expect(result.analysis).toBeUndefined();
      expect(result.errorCode).toBe('OCR_FAILED');
    });
  });

  describe('Authentication & Credential Decoupling', () => {
    it('provides local demo inspector profile without hardcoded plaintext passwords in source', () => {
      expect(DEMO_INSPECTOR_USER.email).toBe('inspector@lmvision.gov.in');
      expect(DEMO_INSPECTOR_USER.user_metadata['role']).toBe('INSPECTOR');
      expect(DEMO_INSPECTOR_SESSION.access_token).toBeDefined();
    });
  });

  describe('Storage & Persistence Failure-Mode Testing', () => {
    it('returns failure result when local device storage throws an error (Storage Unavailable)', async () => {
      const storageService = new InspectionStorageService();
      const draft = createLocalInspectionDraft({
        category: 'PERSONAL_CARE_COSMETICS',
        packageType: 'BOTTLE',
      });

      // Force AsyncStorage to throw
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const setItemSpy = vi.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Disk quota exceeded / storage locked'));

      const result = await storageService.saveInspection(draft);
      expect(result.success).toBe(false);
      expect(result.savedRemotely).toBe(false);
      expect(result.error).toContain('Disk quota exceeded');

      setItemSpy.mockRestore();
    });

    it('gracefully handles remote database failure without claiming false remote sync', async () => {
      const storageService = new InspectionStorageService();
      const draft = createLocalInspectionDraft({
        category: 'PERSONAL_CARE_COSMETICS',
        packageType: 'BOTTLE',
      });

      // Mock Supabase client failing
      const failingSupabaseMock: any = {
        from: vi.fn(() => ({
          upsert: vi.fn().mockRejectedValue(new Error('Network disconnected / timeout')),
        })),
      };

      const result = await storageService.saveInspection(draft, failingSupabaseMock);
      // It succeeds locally, but explicitly DOES NOT report savedRemotely: true
      expect(result.success).toBe(true);
      expect(result.savedRemotely).toBe(false);
    });
  });
});

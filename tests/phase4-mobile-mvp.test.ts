import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DeclarationSchema,
  FindingSchema,
  InspectorDecisionSchema,
  PackageAnalysisSchema,
} from '@lm-vision/shared-types';

// In-memory persistent storage store to simulate mobile device storage across restarts
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

import {
  createLocalInspectionDraft,
  LocalInspectionDraftSchema,
  type LocalInspectionDraft,
} from '../apps/mobile/src/state/draft';
import {
  createDemoAnalysis,
  DEMO_PRODUCT,
} from '../apps/mobile/src/fixtures/demoFixture';
import {
  InspectionStorageService,
} from '../apps/mobile/src/services/inspectionStorage';
import { FUTURE_INSPECTION_ROUTES } from '../apps/mobile/src/navigation/types';
import { getMobileConfig } from '../apps/mobile/src/config';

describe('Phase 4: Mobile Draft Lifecycle & State Machine', () => {
  it('creates an initialized, validated draft with extended lifecycle arrays', () => {
    const draft = createLocalInspectionDraft({
      category: 'PERSONAL_CARE_COSMETICS',
      packageType: 'BOTTLE',
      productName: DEMO_PRODUCT.name,
      brandName: DEMO_PRODUCT.brand,
    });

    expect(LocalInspectionDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.status).toBe('DRAFT');
    expect(draft.version).toBe(1);
    expect(draft.images).toEqual([]);
    expect(draft.declarations).toEqual([]);
    expect(draft.findings).toEqual([]);
    expect(draft.evidence).toEqual([]);
  });

  it('supports full lifecycle transitions: DRAFT -> CAPTURED -> PROCESSING -> REVIEW_REQUIRED -> DECIDED', () => {
    const draft = createLocalInspectionDraft({
      category: 'PERSONAL_CARE_COSMETICS',
      packageType: 'BOTTLE',
    });

    // 1. DRAFT -> CAPTURED
    const capturedDraft: LocalInspectionDraft = {
      ...draft,
      status: 'CAPTURED',
      images: [
        {
          id: 'img-1',
          inspectionId: draft.localId,
          surface: 'FRONT',
          fileUrl: 'file:///data/photos/front.jpg',
          fileSizeBytes: 204800,
          mimeType: 'image/jpeg',
          sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          capturedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          quality: {
            overallScore: 0.95,
            isAcceptable: true,
            sharpness: 90,
            brightness: 85,
            glareDetected: false,
            blurDetected: false,
            shadowDetected: false,
            warnings: [],
          },
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    expect(LocalInspectionDraftSchema.safeParse(capturedDraft).success).toBe(true);

    // 2. CAPTURED -> REVIEW_REQUIRED (via demo analysis)
    const { analysis, declarations, findings } = createDemoAnalysis(draft.localId, ['img-1']);
    const analyzedDraft: LocalInspectionDraft = {
      ...capturedDraft,
      status: 'REVIEW_REQUIRED',
      aiAnalysis: analysis,
      declarations,
      findings,
      updatedAt: new Date().toISOString(),
    };
    expect(LocalInspectionDraftSchema.safeParse(analyzedDraft).success).toBe(true);

    // 3. REVIEW_REQUIRED -> DECIDED (via inspector decision)
    const now = new Date().toISOString();
    const decidedDraft: LocalInspectionDraft = {
      ...analyzedDraft,
      status: 'DECIDED',
      inspectorDecision: {
        id: '44444444-4444-4444-8444-444444444444',
        inspectionId: '11111111-1111-4111-8111-111111111111',
        inspectorUserId: '00000000-0000-4000-8000-000000000001',
        decision: 'NOTICE_ISSUED',
        summaryNotes: 'Show-cause notice issued under Rule 6 for missing consumer care phone and pricing concordance.',
        violationsFound: true,
        verifiedFindingIds: findings.map((f) => f.id),
        dismissedFindingIds: [],
        decidedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      updatedAt: now,
    };
    expect(LocalInspectionDraftSchema.safeParse(decidedDraft).success).toBe(true);
  });
});

describe('Phase 4: Demo Fixture & Analysis Accuracy', () => {
  it('generates canonical PackageAnalysis output conforming to PackageAnalysisSchema', () => {
    const { analysis } = createDemoAnalysis('test-inspection-id');
    const parseResult = PackageAnalysisSchema.safeParse(analysis);
    expect(parseResult.success).toBe(true);
    expect(analysis.provider).toBe('MOCK');
    expect(analysis.modelName).toBe('lm-vision-demo-fixture-v1');
  });

  it('extracts mandatory statutory declarations matching ABC Shampoo 500ml demo specification', () => {
    const { declarations } = createDemoAnalysis('test-inspection-id');
    expect(declarations.length).toBe(6);

    for (const decl of declarations) {
      expect(DeclarationSchema.safeParse(decl).success).toBe(true);
    }

    const types = declarations.map((d) => d.type);
    expect(types).toContain('GENERIC_NAME');
    expect(types).toContain('NET_QUANTITY');
    expect(types).toContain('MRP');
    expect(types).toContain('MANUFACTURER_NAME_ADDRESS');
    expect(types).toContain('CONSUMER_CARE_DETAILS');
    expect(types).toContain('DATE_OF_PACKAGING');

    const netQty = declarations.find((d) => d.type === 'NET_QUANTITY');
    expect(netQty?.normalizedValue).toBe(500);
    expect(netQty?.unit).toBe('ml');

    const mrp = declarations.find((d) => d.type === 'MRP');
    expect(mrp?.normalizedValue).toBe(249);
    expect(mrp?.unit).toBe('INR');
  });

  it('produces valid findings adhering to FindingSchema', () => {
    const { findings } = createDemoAnalysis('test-inspection-id');
    expect(findings.length).toBe(3);

    for (const finding of findings) {
      expect(FindingSchema.safeParse(finding).success).toBe(true);
    }
  });

  it('satisfies Directive 4: Calibrated MRP Cross-Source Finding', () => {
    const { findings } = createDemoAnalysis('test-inspection-id');
    const mrpFinding = findings.find((f) => f.ruleId === 'TEST_FIXTURE_CROSS_SOURCE_MRP_MATCH');

    expect(mrpFinding).toBeDefined();
    // Directive 4: title must be 'MRP mismatch detected'
    expect(mrpFinding?.title).toBe('MRP mismatch detected');
    // Directive 4: source must be clearly attributed to demo cross-source fixture
    expect(mrpFinding?.ruleCitation).toBe('Demo cross-source fixture');
    // Directive 4: status must be SUSPECTED_NON_COMPLIANCE
    expect(mrpFinding?.status).toBe('SUSPECTED_NON_COMPLIANCE');
    expect(mrpFinding?.severity).toBe('CRITICAL');
    // Directive 4: verification requires inspector review
    expect(mrpFinding?.description).toContain('Verification:\nInspector review required');
    expect(mrpFinding?.description).toContain('Physical package label displays printed MRP of Rs. 249');
    expect(mrpFinding?.description).toContain('Demo cross-source fixture indicates online listed MRP of Rs. 299');
    expect(mrpFinding?.description).toContain('Automated statutory cross-source determination is deferred in MVP');
  });

  it('satisfies Directive 3: Preserves the legal/AI boundary without claiming production OCR/CV/Rules ran', () => {
    const { analysis } = createDemoAnalysis('test-inspection-id');
    expect(analysis.provider).toBe('MOCK');
    // Model identifier clearly indicates demo fixture
    expect(analysis.modelName).toBe('lm-vision-demo-fixture-v1');
  });
});

describe('Phase 4: Directive 2 - Durable Inspection Persistence', () => {
  beforeEach(() => {
    mockAsyncStorageMap.clear();
  });

  it('persists completed inspections to durable storage in DEMO MODE', async () => {
    const storage = new InspectionStorageService();
    const draft = createLocalInspectionDraft({
      category: 'PERSONAL_CARE_COSMETICS',
      packageType: 'BOTTLE',
      productName: 'ABC Herbal Shampoo',
    });

    const saveResult = await storage.saveInspection(draft);
    expect(saveResult.success).toBe(true);
    expect(saveResult.savedRemotely).toBe(false);
    expect(saveResult.localId).toBe(draft.localId);

    // Verify storage map has data
    expect(mockAsyncStorageMap.size).toBe(1);

    // Retrieve by ID
    const retrieved = await storage.getInspectionById(draft.localId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.localId).toBe(draft.localId);
    expect(retrieved?.productName).toBe('ABC Herbal Shampoo');
  });

  it('survives simulated app restarts: a fresh storage instance rehydrates saved records', async () => {
    const draft1 = createLocalInspectionDraft({
      category: 'PERSONAL_CARE_COSMETICS',
      packageType: 'BOTTLE',
      productName: 'Shampoo Bottle 500ml',
    });
    const draft2 = createLocalInspectionDraft({
      category: 'FOOD_BEVERAGE',
      packageType: 'BOX',
      productName: 'Cereal Pack 1kg',
    });

    // Session 1: Inspector saves two inspections
    const session1Storage = new InspectionStorageService();
    await session1Storage.saveInspection(draft1);
    await session1Storage.saveInspection(draft2);

    // Simulated app close & restart: Session 2 creates fresh service instance
    const session2Storage = new InspectionStorageService();
    const rehydrated = await session2Storage.loadInspections();

    expect(rehydrated.length).toBe(2);
    const names = rehydrated.map((i) => i.productName);
    expect(names).toContain('Shampoo Bottle 500ml');
    expect(names).toContain('Cereal Pack 1kg');
  });

  it('falls back to durable local storage when Supabase client throws or network is offline', async () => {
    const storage = new InspectionStorageService();
    const draft = createLocalInspectionDraft({
      category: 'PERSONAL_CARE_COSMETICS',
      packageType: 'BOTTLE',
    });

    // Mock failing Supabase client
    const failingSupabase = {
      auth: {
        getSession: vi.fn().mockRejectedValue(new Error('Network offline')),
      },
    };

    const saveResult = await storage.saveInspection(draft, failingSupabase as never);
    // Even when remote sync fails, local save succeeds
    expect(saveResult.success).toBe(true);
    expect(saveResult.savedRemotely).toBe(false);

    // Stored locally
    const retrieved = await storage.getInspectionById(draft.localId);
    expect(retrieved).not.toBeNull();
  });
});

describe('Phase 4: Statutory Legal Gate & Inspector Decision', () => {
  it('strictly validates inspector decisions against InspectorDecisionSchema', () => {
    const now = new Date().toISOString();
    const decision = {
      id: '44444444-4444-4444-8444-444444444444',
      inspectionId: '11111111-1111-4111-8111-111111111111',
      inspectorUserId: '00000000-0000-4000-8000-000000000001',
      decision: 'NOTICE_ISSUED' as const,
      summaryNotes: 'Notice to Show Cause issued for non-conforming packaging declarations.',
      violationsFound: true,
      verifiedFindingIds: ['22222222-2222-4222-8222-222222222221'],
      dismissedFindingIds: [],
      decidedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const parseResult = InspectorDecisionSchema.safeParse(decision);
    expect(parseResult.success).toBe(true);
  });

  it('rejects inspector decision without summary notes', () => {
    const now = new Date().toISOString();
    const invalidDecision = {
      id: '44444444-4444-4444-8444-444444444444',
      inspectionId: '11111111-1111-4111-8111-111111111111',
      inspectorUserId: '00000000-0000-4000-8000-000000000001',
      decision: 'NOTICE_ISSUED' as const,
      summaryNotes: '', // Empty notes
      violationsFound: true,
      decidedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    expect(InspectorDecisionSchema.safeParse(invalidDecision).success).toBe(false);
  });
});

describe('Phase 4: Backward Compatibility & Route Boundaries', () => {
  it('preserves all Phase 3 FUTURE_INSPECTION_ROUTES', () => {
    expect(FUTURE_INSPECTION_ROUTES).toEqual(
      expect.arrayContaining(['SmartScan', 'CameraCapture', 'AIProcessing', 'Report'])
    );
  });

  it('ensures mobile config never leaks server secrets', () => {
    const config = getMobileConfig({
      SUPABASE_SERVICE_ROLE_KEY: 'secret-role-key',
      EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
    expect(config).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
    expect(config.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
  });
});

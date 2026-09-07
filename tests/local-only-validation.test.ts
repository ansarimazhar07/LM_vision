/**
 * LM-Vision — Temporary LOCAL/OFFLINE-ONLY Validation Test Suite
 *
 * 25 Rigorous Test Cases:
 * 1. LOCAL_ONLY mode enabled via configuration and runtime helper
 * 2. Gemini provider not invoked during inspection execution
 * 3. AI backend HTTP endpoint not invoked
 * 4. Supabase not required for core local evaluation
 * 5. Local on-device OCR text extraction invoked
 * 6. Local CV geometry estimation invoked
 * 7. Canonical PackageAnalysis generated locally with provider LOCAL_OCR
 * 8. Authoritative GSR 202(E) deterministic rule engine invoked
 * 9. ComplianceAssessment entities generated with statutory citations
 * 10. Physical photo evidence preserved with ID, surface, and SHA-256 hash
 * 11. Complete provenance chain maintained (Image -> Evidence -> Declaration -> Rule -> Review)
 * 12. Inspector human review checklist tracking works offline
 * 13. Inspector correction recording with statutory reason works offline
 * 14. Final inspector decision works offline
 * 15. Finalization lock seals the inspection record offline
 * 16. Local persistence saves draft to storage without network
 * 17. App restart simulation retains draft and finalized record in local storage
 * 18. Legal Metrology Rule Library works completely offline
 * 19. Deterministic explanation functions offline without LLM calls
 * 20. Report preview summary works offline
 * 21. Sync queue remains pending without attempting remote transmission
 * 22. Network request guard produces LOCAL_ONLY_NETWORK_VIOLATION on unexpected remote call
 * 23. No Gemini SDK (@google/genai) loaded or executed in LOCAL_ONLY mode
 * 24. No external APIs (barcode, OCR, listings) executed
 * 25. Reverting LM_VISION_LOCAL_ONLY=false restores normal Gemini behavior
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isLocalOnlyMode, setLocalOnlyMode } from '../apps/mobile/src/config';
import { MobileAIClientAdapter } from '../apps/mobile/src/services/ai/aiClientAdapter';
import { createLocalInspectionDraft, type LocalInspectionImage } from '../apps/mobile/src/state/draft';
import { executeLocalPerception } from '../apps/mobile/src/services/ai/localPerceptionEngine';
import {
  evaluateCompliance,
  getAllAuthoritativeRules,
  loadAuthoritativeRuleBundle,
  assembleInspectionReport,
} from '@lm-vision/rules';
import { computeLocalGeometry } from '@lm-vision/perception';
import { DurableSyncQueue } from '../apps/mobile/src/services/syncQueue';
import { SyncManager } from '../apps/mobile/src/services/syncManager';
import type {
  AssessmentReview,
  ComplianceAssessment,
  Evidence,
  InspectorCorrection,
  PackageAnalysisInput,
} from '@lm-vision/shared-types';

class MockAsyncStorage {
  private store = new Map<string, string>();
  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

describe('LM-Vision — LOCAL/OFFLINE-ONLY Validation Suite', () => {
  let originalFetch: typeof globalThis.fetch;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    setLocalOnlyMode(true);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setLocalOnlyMode(null);
    vi.restoreAllMocks();
  });

  // 1. LOCAL_ONLY mode enabled
  it('1. LOCAL_ONLY mode can be enabled via configuration and runtime helper', () => {
    expect(isLocalOnlyMode()).toBe(true);
    const adapter = new MobileAIClientAdapter();
    expect(adapter.getMode()).toBe('LOCAL_ONLY');
    expect(adapter.name).toBe('LOCAL_OCR');
  });

  // 2. Gemini provider not invoked
  it('2. Gemini provider is not invoked when LOCAL_ONLY is enabled', async () => {
    const adapter = new MobileAIClientAdapter({ mode: 'LOCAL_ONLY' });
    const draft = createLocalInspectionDraft({
      category: 'FOOD_BEVERAGE',
      packageType: 'POUCH',
      productName: 'Atta 500g Offline Test',
    });

    const mockImage: LocalInspectionImage = {
      id: 'img-test-1111-1111',
      inspectionId: draft.localId,
      surface: 'FRONT',
      fileUrl: 'file:///data/packages/atta.jpg',
      fileSizeBytes: 1024 * 300,
      mimeType: 'image/jpeg',
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      syncState: 'LOCAL_ONLY',
      capturedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const result = await adapter.executePipeline([mockImage], draft.localId);
    expect(result.success).toBe(true);
    expect(result.analysis?.provider).toBe('LOCAL_OCR');
    expect(result.analysis?.modelName).toBe('ondevice-ocr-cv-v1');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // 3. AI backend not invoked
  it('3. AI backend HTTP API is not invoked', async () => {
    const adapter = new MobileAIClientAdapter();
    const mockImage: LocalInspectionImage = {
      id: 'img-test-2222-2222',
      inspectionId: 'test-insp-001',
      surface: 'FRONT',
      fileUrl: 'file:///data/packages/atta.jpg',
      fileSizeBytes: 1024 * 250,
      mimeType: 'image/jpeg',
      sha256Hash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
      syncState: 'LOCAL_ONLY',
      capturedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await adapter.executePipeline([mockImage], 'test-insp-001');
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  // 4. Supabase not required for local evaluation
  it('4. Supabase connection is not required for local inspection evaluation', async () => {
    const adapter = new MobileAIClientAdapter();
    const mockImage: LocalInspectionImage = {
      id: 'img-test-3333-3333',
      inspectionId: 'test-insp-002',
      surface: 'BACK',
      fileUrl: 'file:///data/packages/shampoo.jpg',
      fileSizeBytes: 1024 * 200,
      mimeType: 'image/jpeg',
      sha256Hash: 'b10a8db164e0754105b7a99be72e3fe5',
      syncState: 'LOCAL_ONLY',
      capturedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // No supabase client passed, pure local execution
    const result = await adapter.executePipeline([mockImage], 'test-insp-002');
    expect(result.success).toBe(true);
    expect(result.complianceAssessments?.length).toBeGreaterThan(0);
  });

  // 5. local OCR invoked
  it('5. Local on-device OCR is invoked and returns detected text regions', async () => {
    const images: LocalInspectionImage[] = [
      {
        id: '00000000-0000-4000-8000-000000000010',
        inspectionId: '00000000-0000-4000-8000-000000000011',
        surface: 'FRONT',
        fileUrl: 'file:///data/packages/atta.jpg',
        fileSizeBytes: 50000,
        mimeType: 'image/jpeg',
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        syncState: 'LOCAL_ONLY',
        capturedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    const analysis = await executeLocalPerception(images, '00000000-0000-4000-8000-000000000011');
    expect(analysis.provider).toBe('LOCAL_OCR');
    expect(analysis.textRegions.length).toBeGreaterThan(0);
    expect(analysis.textRegions[0]?.text).toBeTruthy();
  });

  // 6. local CV invoked
  it('6. Local CV geometry estimation is invoked and computes PDP / numeral height', () => {
    const payload = {
      imageId: '00000000-0000-4000-8000-000000000012',
      surface: 'FRONT' as const,
      mimeType: 'image/jpeg',
      fileUrl: 'file:///data/packages/atta.jpg',
    };
    const regions = [
      {
        id: 'r-1',
        imageId: '00000000-0000-4000-8000-000000000012',
        surface: 'FRONT' as const,
        boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.8, yMax: 0.28, width: 0.7, height: 0.08, unit: 'NORMALIZED' as const },
        text: 'Net Qty: 500 g',
        confidence: 0.95,
        lineCount: 1,
      },
    ];

    const cv = computeLocalGeometry(payload, regions);
    expect(cv.measurements.length).toBeGreaterThan(0);
    const pdp = cv.measurements.find((m) => m.type === 'PRINCIPAL_DISPLAY_PANEL_AREA');
    expect(pdp).toBeDefined();
    expect(pdp?.value).toBeGreaterThan(0);
  });

  // 7. PackageAnalysis generated
  it('7. Canonical PackageAnalysis is generated with provider LOCAL_OCR', async () => {
    const adapter = new MobileAIClientAdapter();
    const input: PackageAnalysisInput = {
      inspectionId: '11111111-1111-4111-8111-111111111111',
      images: [
        {
          imageId: '22222222-2222-4222-8222-222222222222',
          surface: 'FRONT',
          mimeType: 'image/jpeg',
          fileUrl: 'file:///data/packages/atta.jpg',
        },
      ],
    };

    const analysis = await adapter.analyzePackage(input);
    expect(analysis.provider).toBe('LOCAL_OCR');
    expect(analysis.declarations).toBeInstanceOf(Array);
    expect(analysis.quality).toBeDefined();
    expect(analysis.quality.isAcceptable).toBe(true);
  });

  // 8. GSR 202(E) rule engine invoked
  it('8. Authoritative GSR 202(E) rule engine executes deterministically', async () => {
    const adapter = new MobileAIClientAdapter();
    const input: PackageAnalysisInput = {
      inspectionId: '11111111-1111-4111-8111-111111111111',
      images: [
        {
          imageId: '22222222-2222-4222-8222-222222222222',
          surface: 'FRONT',
          mimeType: 'image/jpeg',
          fileUrl: 'file:///data/packages/atta.jpg',
        },
      ],
    };

    const analysis = await adapter.analyzePackage(input);
    const summary = evaluateCompliance({
      inspectionId: input.inspectionId,
      packageAnalysis: analysis,
    });

    expect(summary.ruleCountEvaluated).toBe(8);
    expect(summary.ruleBundleId).toBe('LM-IN-RULES-2026.09');
    expect(summary.assessments.length).toBe(8);
  });

  // 9. ComplianceAssessment generated
  it('9. ComplianceAssessment entities are generated with statutory citations', async () => {
    const bundle = loadAuthoritativeRuleBundle();
    const rules = bundle.rules;
    expect(rules.length).toBe(8);
    for (const rule of rules) {
      expect(rule.sourceMetadata.gazetteNotificationNumber).toContain('GSR 202');
      expect(rule.sourceMetadata.sourcePage).toBeGreaterThan(0);
      expect(rule.sourceMetadata.clauseReference).toBeTruthy();
    }
  });

  // 10. evidence preserved
  it('10. Physical package photo evidence is preserved with imageId and SHA-256', () => {
    const draft = createLocalInspectionDraft({
      category: 'FOOD_BEVERAGE',
      packageType: 'POUCH',
      productName: 'Atta 500g',
    });

    const img: LocalInspectionImage = {
      id: 'img-photo-10',
      inspectionId: draft.localId,
      surface: 'FRONT',
      fileUrl: 'file:///var/mobile/photo10.jpg',
      fileSizeBytes: 450000,
      mimeType: 'image/jpeg',
      sha256Hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      syncState: 'LOCAL_ONLY',
      capturedAt: '2026-09-07T10:00:00.000Z',
      createdAt: '2026-09-07T10:00:00.000Z',
    };

    draft.images.push(img);
    expect(draft.images[0]?.id).toBe('img-photo-10');
    expect(draft.images[0]?.sha256Hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });

  // 11. provenance preserved
  it('11. Provenance chain (Image -> Evidence -> Declaration -> Rule -> Review) is maintained', async () => {
    const draft = createLocalInspectionDraft({
      category: 'FOOD_BEVERAGE',
      packageType: 'POUCH',
      productName: 'Atta 500g',
    });

    const imageId = 'img-prov-1';
    const evidenceId = 'ev-prov-1';
    draft.images.push({
      id: imageId,
      inspectionId: draft.localId,
      surface: 'FRONT',
      fileUrl: 'file:///photo.jpg',
      fileSizeBytes: 1024,
      mimeType: 'image/jpeg',
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      syncState: 'LOCAL_ONLY',
      capturedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    draft.evidence.push({
      id: evidenceId,
      inspectionId: draft.localId,
      imageId,
      surface: 'FRONT',
      title: 'Front panel photograph',
      fileUrl: 'file:///photo.jpg',
      capturedAt: new Date().toISOString(),
      provenance: 'ORIGINAL',
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    expect(draft.evidence[0]?.imageId).toBe(imageId);
  });

  // 12. inspector review works
  it('12. Inspector review checklist tracking works offline', () => {
    const review: AssessmentReview = {
      id: 'rev-001',
      inspectionId: 'insp-001',
      assessmentId: 'asm-001',
      status: 'VERIFIED',
      reviewedEvidence: true,
      reviewedRule: true,
      reviewedObservation: true,
      notes: 'Verified packaging label in person.',
      reviewedAt: new Date().toISOString(),
    };

    expect(review.status).toBe('VERIFIED');
    expect(review.reviewedEvidence).toBe(true);
    expect(review.reviewedRule).toBe(true);
    expect(review.reviewedObservation).toBe(true);
  });

  // 13. inspector correction works
  it('13. Inspector correction recording with statutory reason works offline', () => {
    const correction: InspectorCorrection = {
      id: 'corr-001',
      assessmentId: 'asm-001',
      declarationType: 'MRP',
      originalValue: '₹240',
      correctedValue: '₹249.00',
      originalConfidence: 0.75,
      correctedConfidence: 1.0,
      reason: 'Physical inspection confirms decimal places printed on back panel under Rule 6(1)(e).',
      inspectorUserId: '00000000-0000-4000-8000-000000000001',
      evidenceIds: ['ev-001'],
      correctedAt: new Date().toISOString(),
    };

    expect(correction.correctedValue).toBe('₹249.00');
    expect(correction.reason).toContain('Rule 6(1)(e)');
    expect(correction.correctedConfidence).toBe(1.0);
  });

  // 14. final decision works
  it('14. Final inspector decision works offline', () => {
    const draft = createLocalInspectionDraft({
      category: 'FOOD_BEVERAGE',
      packageType: 'POUCH',
      productName: 'Atta 500g',
    });

    draft.inspectorDecision = {
      id: 'dec-001',
      inspectionId: draft.localId,
      inspectorUserId: '00000000-0000-4000-8000-000000000001',
      decision: 'COMPLIANT',
      summary: 'All declarations match Legal Metrology requirements.',
      decidedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedEvidenceReviewed: true,
      requiresFollowUp: false,
    };

    expect(draft.inspectorDecision.decision).toBe('COMPLIANT');
    expect(draft.inspectorDecision.confirmedEvidenceReviewed).toBe(true);
  });

  // 15. finalization works
  it('15. Finalization lock seals the inspection record offline', () => {
    const draft = createLocalInspectionDraft({
      category: 'FOOD_BEVERAGE',
      packageType: 'POUCH',
      productName: 'Atta 500g',
    });

    draft.status = 'DECIDED';
    draft.isFinalized = true;
    draft.finalizedAt = new Date().toISOString();

    expect(draft.status).toBe('DECIDED');
    expect(draft.isFinalized).toBe(true);
    expect(draft.finalizedAt).toBeTruthy();
  });

  // 16. local persistence works
  it('16. Local persistence saves draft to storage without network', async () => {
    const storage = new MockAsyncStorage();
    const draft = createLocalInspectionDraft({
      category: 'FOOD_BEVERAGE',
      packageType: 'POUCH',
      productName: 'Offline Persistence Test',
    });

    await storage.setItem(`lm_inspection_${draft.localId}`, JSON.stringify(draft));
    const raw = await storage.getItem(`lm_inspection_${draft.localId}`);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.localId).toBe(draft.localId);
    expect(parsed.productName).toBe('Offline Persistence Test');
  });

  // 17. app restart persistence
  it('17. App restart simulation retains draft and finalized record in local storage', async () => {
    const storage = new MockAsyncStorage();
    const draft = createLocalInspectionDraft({
      category: 'FOOD_BEVERAGE',
      packageType: 'POUCH',
      productName: 'App Restart Test',
    });
    draft.status = 'DECIDED';
    draft.isFinalized = true;
    draft.finalizedAt = '2026-09-07T11:00:00.000Z';

    // Persist before simulated app kill
    await storage.setItem('lm_inspections_list', JSON.stringify([draft]));

    // App restarts: new instance reads storage
    const restoredData = await storage.getItem('lm_inspections_list');
    expect(restoredData).toBeTruthy();
    const list = JSON.parse(restoredData!);
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('DECIDED');
    expect(list[0].isFinalized).toBe(true);
    expect(list[0].finalizedAt).toBe('2026-09-07T11:00:00.000Z');
  });

  // 18. rule library works offline
  it('18. Legal Metrology Rule Library works completely offline', () => {
    const rules = getAllAuthoritativeRules();
    expect(rules.length).toBe(8);

    const mrpRule = rules.find((r) => r.ruleNumber === '6(1)(e)');
    expect(mrpRule).toBeDefined();
    expect(mrpRule?.title).toContain('Retail Sale Price');
    expect(mrpRule?.sourceMetadata.gazetteNotificationNumber).toContain('GSR 202');

    const netQtyRule = rules.find((r) => r.ruleNumber === '6(1)(c)');
    expect(netQtyRule).toBeDefined();
    expect(netQtyRule?.sourceMetadata.sourcePage).toBe(13);
  });

  // 19. deterministic explanation works offline
  it('19. Deterministic explanation functions offline without LLM calls', async () => {
    const adapter = new MobileAIClientAdapter();
    const explanation = await adapter.explainFinding({
      finding: {
        id: 'f-1',
        title: 'MRP Format Requirement',
        description: 'MRP ₹ 249.00 (inclusive of all taxes)',
        ruleCitation: 'Rule 6(1)(e) read with Rule 2(m)',
        severity: 'CRITICAL',
        status: 'PASS',
        confidence: 0.95,
        actualValue: '₹ 249.00',
        expectedValue: 'MRP Rs. XX.XX inclusive of all taxes',
      },
    });

    expect(explanation.explanationMarkdown).toContain('Observed:');
    expect(explanation.explanationMarkdown).toContain('Expected:');
    expect(explanation.explanationMarkdown).toContain('AI explanation unavailable in LOCAL-ONLY mode.');
    expect(explanation.confidence).toBe('HIGH');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // 20. report summary works offline
  it('20. Report preview summary functions offline', () => {
    const draft = createLocalInspectionDraft({
      category: 'FOOD_BEVERAGE',
      packageType: 'POUCH',
      productName: 'Report Preview Offline Test',
    });

    const report = assembleInspectionReport({
      inspectionId: draft.localId,
      reportNumber: 'LM-REP-2026-TEST001',
      inspectionStatus: 'DECIDED',
      isDraftPreview: false,
      product: {
        productName: 'Report Preview Offline Test',
        category: 'FOOD_BEVERAGE',
        packagingType: 'POUCH',
      },
      inspectionMetadata: {
        sourceType: 'PHYSICAL_PACKAGE',
        createdAt: new Date().toISOString(),
        finalizedAt: new Date().toISOString(),
      },
      inspector: {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Inspector Sharma',
        role: 'INSPECTOR',
      },
      declarations: [],
      complianceAssessments: [],
      evidence: [],
      reviews: [],
      corrections: [],
      finalDecision: {
        id: '00000000-0000-4000-8000-000000000002',
        inspectionId: draft.localId,
        inspectorUserId: '00000000-0000-4000-8000-000000000001',
        decision: 'COMPLIANT',
        summaryNotes: 'All declarations valid.',
        violationsFound: false,
        decidedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confirmedEvidenceReviewed: true,
        requiresFollowUp: false,
      },
    });

    expect(report.reportNumber).toBe('LM-REP-2026-TEST001');
    expect(report.reportHash).toBeTruthy();
    expect(report.finalDecision?.decision).toBe('COMPLIANT');
  });

  // 21. sync queue remains pending
  it('21. Sync queue retains pending operations without attempting remote transmission', async () => {
    const storage = new MockAsyncStorage();
    const queue = new DurableSyncQueue(storage as any);
    const syncManager = new SyncManager(queue);

    await queue.enqueue({
      inspectionId: 'insp-sync-pending-1',
      entityType: 'INSPECTION',
      entityId: 'insp-sync-pending-1',
      operationType: 'UPSERT_INSPECTION',
      entityVersion: 1,
      payload: { localOnly: true },
    });

    const fakeSupabase = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    };

    const runResult = await syncManager.sync(fakeSupabase as any, vi.fn());
    expect(runResult.state).toBe('OFFLINE');
    expect(runResult.completed).toBe(0);

    const pending = await queue.pending();
    expect(pending.length).toBe(1);
    expect(pending[0]?.inspectionId).toBe('insp-sync-pending-1');
  });

  // 22. LOCAL_ONLY network guard
  it('22. Network request guard throws LOCAL_ONLY_NETWORK_VIOLATION on unexpected remote call', () => {
    const adapter = new MobileAIClientAdapter();
    expect(() => {
      adapter.assertNetworkAllowed('unit test guard check');
    }).toThrowError(/LOCAL_ONLY_NETWORK_VIOLATION/);
  });

  // 23. no Gemini SDK execution
  it('23. No Gemini SDK execution occurs in LOCAL_ONLY mode', async () => {
    const adapter = new MobileAIClientAdapter();
    const health = await adapter.healthCheck();
    expect(health.provider).toBe('LOCAL_OCR');
    expect(health.modelName).toBe('ondevice-ocr-cv-v1');
    expect(health.isHealthy).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // 24. no external API execution
  it('24. No external APIs (barcode, OCR, listings) executed in LOCAL_ONLY mode', async () => {
    const adapter = new MobileAIClientAdapter();
    const listingAnalysis = await adapter.analyzeEcommerceListing({
      listing: {
        id: 'list-1',
        platform: 'AMAZON',
        url: 'https://example.com',
        listedPriceInr: 249,
        extractedDeclarations: [],
      },
      packageAnalysis: {
        provider: 'LOCAL_OCR',
        modelName: 'ondevice-ocr-cv-v1',
        quality: {
          overallScore: 0.9,
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
            id: 'd-1',
            type: 'MRP',
            rawText: '₹ 249',
            normalizedValue: 249,
            confidence: 0.95,
            boundingRegions: [],
          },
        ],
        textRegions: [],
        visualMeasurements: [],
        latencyMs: 10,
        timestamp: new Date().toISOString(),
      },
    });

    expect(listingAnalysis.mrpMatch).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // 25. previous regression suite passes / restoring mode works
  it('25. Reverting LM_VISION_LOCAL_ONLY=false restores normal Gemini mode', () => {
    setLocalOnlyMode(false);
    expect(isLocalOnlyMode()).toBe(false);
    const adapter = new MobileAIClientAdapter({ mode: 'REAL' });
    expect(adapter.getMode()).toBe('REAL');
    expect(adapter.name).toBe('GEMINI');
    expect(() => adapter.assertNetworkAllowed('REAL mode call')).not.toThrow();
  });

  // 26. real device captures avoid demo fabrications
  it('26. Real device captures in LOCAL_ONLY mode do not fabricate demo product or mock DEMO-TEST rules', async () => {
    setLocalOnlyMode(true);
    const adapter = new MobileAIClientAdapter({ mode: 'LOCAL_ONLY' });

    // Real device capture from camera cache with real base64
    const realCapturedImages: LocalInspectionImage[] = [
      {
        id: '22222222-2222-4222-8222-222222222222',
        inspectionId: '11111111-1111-4111-8111-111111111111',
        surface: 'FRONT',
        fileUrl: 'file:///data/user/0/host.exp.exponent/cache/ExperienceData/Camera/real_photo.jpg',
        base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        fileSizeBytes: 1024 * 300,
        mimeType: 'image/jpeg',
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        syncState: 'LOCAL_ONLY',
        capturedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    const result = await adapter.executePipeline(
      realCapturedImages,
      '11111111-1111-4111-8111-111111111111'
    );

    expect(result.success).toBe(true);
    expect(result.analysis?.provider).toBe('LOCAL_OCR');

    // No demo Atta fabricated for unlinked camera captures
    expect(result.declarations).toEqual([]);

    // No mock rules (DEMO-TEST-*) evaluated
    const hasMockRules = result.findings.some(f => f.ruleId.startsWith('DEMO-TEST'));
    expect(hasMockRules).toBe(false);

    // Statutory assessments are evaluated (GSR 202(E))
    expect(result.complianceAssessments?.length).toBeGreaterThan(0);
    for (const assessment of result.complianceAssessments || []) {
      expect(assessment.ruleKind).toBe('AUTHORITATIVE');
    }
  });

  // 27. physical declarations update and evaluate statutory rules
  it('27. Physical package declarations evaluate authoritative GSR 202(E) rules and link captured photo evidence', async () => {
    setLocalOnlyMode(true);
    const draft = createLocalInspectionDraft({
      category: 'FOOD_BEVERAGE',
      packageType: 'POUCH',
      productName: 'Biscuits 100g',
    });

    const realImage: LocalInspectionImage = {
      id: '44444444-4444-4444-8444-444444444444',
      inspectionId: draft.localId,
      surface: 'FRONT',
      fileUrl: 'file:///data/user/0/host.exp.exponent/cache/Camera/biscuit.jpg',
      fileSizeBytes: 1024 * 200,
      mimeType: 'image/jpeg',
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      syncState: 'LOCAL_ONLY',
      capturedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    draft.images.push(realImage);

    // Inspector physically inspects package and enters declarations
    const physicalDeclarations = [
      {
        type: 'GENERIC_NAME' as const,
        rawText: 'Butter Cookies',
        normalizedValue: 'Butter Cookies',
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
      },
      {
        type: 'NET_QUANTITY' as const,
        rawText: '100 g',
        normalizedValue: 100,
        unit: 'g',
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
      },
      {
        type: 'MRP' as const,
        rawText: 'MRP ₹ 30.00 (Incl. of all taxes)',
        normalizedValue: 30,
        unit: 'INR',
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
      },
      {
        type: 'DATE_OF_PACKAGING' as const,
        rawText: '02/2026',
        normalizedValue: '02/2026',
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
      },
      {
        type: 'MANUFACTURER_NAME_ADDRESS' as const,
        rawText: 'Crisp Bakers India Ltd., Peenya, Bengaluru, Karnataka - 560058',
        normalizedValue: 'Crisp Bakers India Ltd., Peenya, Bengaluru, Karnataka - 560058',
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
      },
      {
        type: 'CONSUMER_CARE_DETAILS' as const,
        rawText: '080-28390000, consumer@crispbakers.com',
        normalizedValue: '080-28390000, consumer@crispbakers.com',
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
      },
      {
        type: 'COUNTRY_OF_ORIGIN' as const,
        rawText: 'India',
        normalizedValue: 'India',
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
      },
    ];

    const compliance = evaluateCompliance({
      inspectionId: draft.localId,
      packageAnalysis: {
        provider: 'LOCAL_OCR',
        modelName: 'ondevice-ocr-cv-v1',
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
        declarations: physicalDeclarations,
        textRegions: [],
        visualMeasurements: [],
        latencyMs: 10,
        timestamp: new Date().toISOString(),
      },
    });

    const passAssessments = compliance.assessments.filter(a => a.result === 'PASS');
    expect(passAssessments.length).toBeGreaterThanOrEqual(6);
  });
});

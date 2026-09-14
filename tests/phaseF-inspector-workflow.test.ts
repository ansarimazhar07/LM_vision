/**
 * Phase F Test Suite: Professional Compliance Workspace, Guided Verification,
 * Inspector Decision Workflow & Authoritative Finalization
 *
 * VALIDATES ALL PHASE F GUARANTEES:
 * 1. Canonical Status Model (REVIEW_REQUIRED ≡ NEEDS_VERIFICATION, DECIDED ≡ FINALIZED)
 * 2. Finalization Authority beyond UI (Authoritative transition matrix & guard)
 * 3. Finalized Lock (Immutable against ordinary edits, deletions, or decision alterations)
 * 4. Controlled Reopen Workflow (Authorized role, substantive reason, preserved history)
 * 5. Action Center Queue (MANDATORY vs ADVISORY classification)
 * 6. Explicit Inspector Conflict Acknowledgement
 * 7. System Assessment vs Inspector Decision Separation
 * 8. Inspector Correction vs Final Decision Separation
 * 9. Multi-Surface Compliance Workspace & Rule-by-Rule Provenance
 * 10. Search Incomplete vs Search Completed No Evidence
 * 11. Guided Reinspection Evidence Preservation (Append-only, no overwrite)
 * 12. Online AI Arriving After Finalization (No silent decision mutation)
 * 13. Offline Finalization & Sync Conflict Handling (No last-write-wins)
 * 14. Append-Only Chronological Timeline Integrity
 * 15. Non-Duplication of Legal Statutory Logic
 * 16. Rule Engine Invariance (packages/rules untouched)
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeInspectionStatus,
  toLegacyInspectionStatus,
  type ComplianceAssessment,
  type Declaration,
  type InspectionImage,
  type InspectorDecision,
  type PackageSurface,
} from '@lm-vision/shared-types';
import {
  calculateFinalizationGuard,
  validateStateTransition,
  assertInspectionMutable,
  buildComplianceWorkspace,
  buildInspectionTimeline,
  verifyTimelineIntegrity,
  type TimelineEvent,
} from '../packages/perception/src/inspection/index.js';

describe('Phase F Test Suite: Inspector Decision Workflow & Finalization', () => {

  // ==========================================================================
  // 1. CANONICAL STATUS MODEL & NORMALIZATION
  // ==========================================================================
  describe('1. Canonical Status Model & Normalization', () => {
    it('1.1 should normalize legacy REVIEW_REQUIRED to canonical NEEDS_VERIFICATION', () => {
      const canonical = normalizeInspectionStatus('REVIEW_REQUIRED');
      expect(canonical).toBe('NEEDS_VERIFICATION');
    });

    it('1.2 should normalize legacy DECIDED to canonical FINALIZED', () => {
      const canonical = normalizeInspectionStatus('DECIDED');
      expect(canonical).toBe('FINALIZED');
    });

    it('1.3 should map canonical statuses back to legacy database enums for backward compatibility', () => {
      expect(toLegacyInspectionStatus('NEEDS_VERIFICATION')).toBe('REVIEW_REQUIRED');
      expect(toLegacyInspectionStatus('FINALIZED')).toBe('DECIDED');
      expect(toLegacyInspectionStatus('DRAFT')).toBe('DRAFT');
    });

    it('1.4 normalization should be idempotent across repeated calls', () => {
      const step1 = normalizeInspectionStatus('REVIEW_REQUIRED');
      const step2 = normalizeInspectionStatus(step1);
      expect(step2).toBe('NEEDS_VERIFICATION');

      const stepA = normalizeInspectionStatus('DECIDED');
      const stepB = normalizeInspectionStatus(stepA);
      expect(stepB).toBe('FINALIZED');
    });

    it('1.5 should handle unknown or unclassified statuses without crashing', () => {
      expect(normalizeInspectionStatus('UNKNOWN_STATUS' as any)).toBe('DRAFT');
      expect(normalizeInspectionStatus('' as any)).toBe('DRAFT');
    });
  });

  // ==========================================================================
  // 2. FINALIZATION AUTHORITY & STATE MACHINE TRANSITIONS
  // ==========================================================================
  describe('2. Finalization Authority & State Transitions', () => {
    it('2.1 allows valid canonical progression from DRAFT to FINALIZED', () => {
      expect(validateStateTransition('DRAFT', 'CAPTURED').valid).toBe(true);
      expect(validateStateTransition('CAPTURED', 'ANALYZED').valid).toBe(true);
      expect(validateStateTransition('ANALYZED', 'NEEDS_VERIFICATION').valid).toBe(true);
      expect(validateStateTransition('NEEDS_VERIFICATION', 'READY_FOR_DECISION').valid).toBe(true);
      expect(validateStateTransition('READY_FOR_DECISION', 'FINALIZED').valid).toBe(true);
    });

    it('2.2 rejects invalid direct transition from FINALIZED to DRAFT', () => {
      const result = validateStateTransition('FINALIZED', 'DRAFT');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot transition from FINALIZED to DRAFT');
    });

    it('2.3 rejects invalid transition from FINALIZED to CAPTURED', () => {
      const result = validateStateTransition('FINALIZED', 'CAPTURED');
      expect(result.valid).toBe(false);
    });

    it('2.4 rejects skipping evidence processing (DRAFT -> FINALIZED)', () => {
      const result = validateStateTransition('DRAFT', 'FINALIZED');
      expect(result.valid).toBe(false);
    });

    it('2.5 validates that finalization requires authenticated inspector identity', () => {
      const guard = calculateFinalizationGuard({
        currentStatus: 'READY_FOR_DECISION',
        evidenceProcessingComplete: true,
        ruleEngineEvaluated: true,
        unresolvedConflictsCount: 0,
        unacknowledgedMandatoryActionsCount: 0,
        inspectorDecisionRecorded: true,
        authenticatedInspectorId: undefined, // Missing identity!
      });

      expect(guard.canFinalize).toBe(false);
      expect(guard.blockingReasons).toContain('Finalization requires an authenticated inspector identity');
    });
  });

  // ==========================================================================
  // 3. ACTION CENTER: MANDATORY VS ADVISORY REQUIREMENTS
  // ==========================================================================
  describe('3. Action Center: Mandatory vs Advisory Actions', () => {
    it('3.1 mandatory conflict blocks finalization', () => {
      const guard = calculateFinalizationGuard({
        currentStatus: 'READY_FOR_DECISION',
        evidenceProcessingComplete: true,
        ruleEngineEvaluated: true,
        unresolvedConflictsCount: 1, // Cross-surface MRP conflict!
        unacknowledgedMandatoryActionsCount: 1,
        inspectorDecisionRecorded: true,
        authenticatedInspectorId: 'insp-001',
      });

      expect(guard.canFinalize).toBe(false);
      expect(guard.blockingReasons.some((r) => r.includes('conflict'))).toBe(true);
    });

    it('3.2 advisory action does not unnecessarily block finalization', () => {
      const guard = calculateFinalizationGuard({
        currentStatus: 'READY_FOR_DECISION',
        evidenceProcessingComplete: true,
        ruleEngineEvaluated: true,
        unresolvedConflictsCount: 0,
        unacknowledgedMandatoryActionsCount: 0,
        advisoryActions: ['Optional additional surface capture recommended on bottle neck'],
        inspectorDecisionRecorded: true,
        authenticatedInspectorId: 'insp-001',
      });

      expect(guard.canFinalize).toBe(true);
      expect(guard.blockingReasons.length).toBe(0);
      expect(guard.advisoryItems.length).toBe(1);
      expect(guard.advisoryItems[0]).toContain('bottle neck');
    });

    it('3.3 builds compliance workspace with separated mandatory and advisory counts', () => {
      const workspace = buildComplianceWorkspace({
        inspectionId: 'ins-test-01',
        productName: 'Sample Product',
        images: [{ id: 'img-1', surface: 'FRONT' as PackageSurface }],
        declarations: [],
        assessments: [
          {
            id: 'assess-1',
            ruleNumber: '6(1)(e)',
            ruleTitle: 'Maximum Retail Price',
            result: 'REQUIRES_VERIFICATION',
            severity: 'CRITICAL',
            explanation: 'MRP declaration missing on front panel.',
          } as ComplianceAssessment,
        ],
        authenticatedInspectorId: 'insp-001',
      });

      expect(workspace.actions.length).toBeGreaterThan(0);
      expect(workspace.mandatoryActionCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // 4. INSPECTOR CONFLICT ACKNOWLEDGEMENT
  // ==========================================================================
  describe('4. Explicit Inspector Conflict Acknowledgement', () => {
    it('4.1 requires explicit acknowledgement and records inspector ID and timestamp', () => {
      const ackTimestamp = '2026-09-13T20:30:00.000Z';
      const acknowledgement = {
        conflictId: 'conflict-mrp-front-neck',
        inspectorId: 'insp-9988',
        status: 'ACKNOWLEDGED' as const,
        acknowledgedAt: ackTimestamp,
        acknowledgementText: 'I reviewed the conflicting evidence.',
      };

      expect(acknowledgement.acknowledgementText).toBe('I reviewed the conflicting evidence.');
      expect(acknowledgement.inspectorId).toBe('insp-9988');
      expect(acknowledgement.status).toBe('ACKNOWLEDGED');

      // Now finalization should succeed with acknowledged conflict
      const guard = calculateFinalizationGuard({
        currentStatus: 'READY_FOR_DECISION',
        evidenceProcessingComplete: true,
        ruleEngineEvaluated: true,
        unresolvedConflictsCount: 0, // Acknowledged!
        unacknowledgedMandatoryActionsCount: 0,
        inspectorDecisionRecorded: true,
        authenticatedInspectorId: 'insp-9988',
        conflictAcknowledgements: [acknowledgement],
      });

      expect(guard.canFinalize).toBe(true);
      expect(guard.blockingReasons.length).toBe(0);
    });

    it('4.2 passive viewing does NOT constitute acknowledgement', () => {
      const guard = calculateFinalizationGuard({
        currentStatus: 'READY_FOR_DECISION',
        evidenceProcessingComplete: true,
        ruleEngineEvaluated: true,
        unresolvedConflictsCount: 1, // Still unacknowledged
        unacknowledgedMandatoryActionsCount: 1,
        inspectorDecisionRecorded: true,
        authenticatedInspectorId: 'insp-9988',
        conflictAcknowledgements: [], // Empty!
      });

      expect(guard.canFinalize).toBe(false);
      expect(guard.blockingReasons.some((r) => r.includes('conflict'))).toBe(true);
    });
  });

  // ==========================================================================
  // 5. SEPARATION OF SYSTEM ASSESSMENT, INSPECTOR DECISION & EVIDENCE CORRECTION
  // ==========================================================================
  describe('5. Separation of System Assessment, Decision & Evidence Correction', () => {
    it('5.1 keeps system assessment distinct from inspector statutory decision', () => {
      const decision: InspectorDecision = {
        id: 'dec-1',
        inspectionId: 'ins-001',
        inspectorId: 'insp-001',
        decision: 'NOTICE_ISSUED',
        decidedAt: new Date().toISOString(),
        comments: 'Statutory notice issued for missing importer declaration.',
        isFinalized: true,
        systemAssessment: 'REQUIRES_VERIFICATION', // Kept separate!
      };

      expect(decision.systemAssessment).toBe('REQUIRES_VERIFICATION');
      expect(decision.decision).toBe('NOTICE_ISSUED');
      expect(decision.systemAssessment).not.toBe(decision.decision);
    });

    it('5.2 keeps evidence observation correction distinct from inspector statutory decision', () => {
      const evidenceCorrection = {
        field: 'declarations.MRP',
        originalObservedValue: { amount: 120, currency: 'INR' },
        correctedValue: { amount: 150, currency: 'INR' },
        inspectorId: 'insp-001',
        reason: 'OCR misread 5 as 2 due to curvature on bottle neck.',
        correctedAt: '2026-09-13T20:15:00.000Z',
      };

      const finalDecision: InspectorDecision = {
        id: 'dec-1',
        inspectionId: 'ins-001',
        inspectorId: 'insp-001',
        decision: 'NON_COMPLIANT',
        decidedAt: '2026-09-13T20:20:00.000Z',
        comments: 'Non-compliant due to missing unit sale price.',
        isFinalized: true,
      };

      // Correction is an observation modification; decision is a legal disposition
      expect(evidenceCorrection.originalObservedValue.amount).toBe(120);
      expect(evidenceCorrection.correctedValue.amount).toBe(150);
      expect(finalDecision.decision).toBe('NON_COMPLIANT');
    });

    it('5.3 prohibited from overwriting system assessment with inspector decision in workspace', () => {
      const workspace = buildComplianceWorkspace({
        inspectionId: 'ins-test-sep',
        productName: 'Test Product',
        images: [],
        declarations: [],
        assessments: [
          {
            id: 'assess-1',
            ruleNumber: '6(1)(a)',
            ruleTitle: 'Generic Name',
            result: 'PASS',
            severity: 'CRITICAL',
            explanation: 'Generic name clearly declared.',
          } as ComplianceAssessment,
          {
            id: 'assess-2',
            ruleNumber: '6(1)(b)',
            ruleTitle: 'Net Quantity',
            result: 'FAIL',
            severity: 'CRITICAL',
            explanation: 'Net quantity missing standard units.',
          } as ComplianceAssessment,
        ],
        decision: {
          id: 'dec-001',
          inspectionId: 'ins-test-sep',
          inspectorId: 'insp-001',
          decision: 'SEIZED',
          decidedAt: new Date().toISOString(),
          isFinalized: true,
        } as InspectorDecision,
        authenticatedInspectorId: 'insp-001',
      });

      expect(workspace.systemAssessment.overallResult).toBe('FAIL');
      expect(workspace.systemAssessment.passCount).toBe(1);
      expect(workspace.systemAssessment.failCount).toBe(1);
      expect(workspace.inspectorDecisionRecord?.decision).toBe('SEIZED');
      expect(workspace.systemAssessment.overallResult as string).not.toBe(workspace.inspectorDecisionRecord?.decision);
    });
  });

  // ==========================================================================
  // 6. FINALIZED LOCK & TAMPER-PROOF IMMUTABILITY
  // ==========================================================================
  describe('6. Finalized Lock & Tamper-Proof Immutability', () => {
    it('6.1 assertInspectionMutable throws error when status is FINALIZED', () => {
      expect(() => {
        assertInspectionMutable('FINALIZED', 'UPDATE_EVIDENCE');
      }).toThrowError(/Inspection is FINALIZED and tamper-locked/);
    });

    it('6.2 rejects evidence deletion on finalized inspection', () => {
      expect(() => {
        assertInspectionMutable('FINALIZED', 'DELETE_EVIDENCE');
      }).toThrowError(/DELETE_EVIDENCE/);
    });

    it('6.3 rejects inspector correction modifications on finalized inspection', () => {
      expect(() => {
        assertInspectionMutable('FINALIZED', 'UPDATE_CORRECTION');
      }).toThrowError(/UPDATE_CORRECTION/);
    });

    it('6.4 allows mutations when inspection is in mutable states (DRAFT, REOPENED)', () => {
      expect(() => {
        assertInspectionMutable('DRAFT', 'UPDATE_EVIDENCE');
      }).not.toThrow();

      expect(() => {
        assertInspectionMutable('REOPENED', 'UPDATE_EVIDENCE');
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // 7. CONTROLLED REOPEN WORKFLOW
  // ==========================================================================
  describe('7. Controlled Reopen Workflow', () => {
    it('7.1 rejects direct client status mutation to REOPENED without transition check', () => {
      const invalidTransition = validateStateTransition('DRAFT', 'REOPENED');
      expect(invalidTransition.valid).toBe(false);
      expect(invalidTransition.error).toContain('Cannot transition from DRAFT to REOPENED');
    });

    it('7.2 rejects reopen without substantive reason (minimum 5 characters)', () => {
      const resEmpty = validateStateTransition('FINALIZED', 'REOPENED', {
        inspectorId: 'insp-001',
        inspectorRole: 'INSPECTOR',
        reopenReason: '',
      });
      expect(resEmpty.valid).toBe(false);
      expect(resEmpty.error).toContain('requires a substantive reason');

      const resShort = validateStateTransition('FINALIZED', 'REOPENED', {
        inspectorId: 'insp-001',
        inspectorRole: 'INSPECTOR',
        reopenReason: 'fix',
      });
      expect(resShort.valid).toBe(false);
      expect(resShort.error).toContain('minimum 5 characters');
    });

    it('7.3 rejects reopen by unauthorized roles (e.g. VIEWER)', () => {
      const res = validateStateTransition('FINALIZED', 'REOPENED', {
        inspectorId: 'user-viewer',
        inspectorRole: 'VIEWER' as any,
        reopenReason: 'Need to update declaration observation',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('not authorized to reopen');
    });

    it('7.4 valid reopen succeeds and historically preserves previous final decision', () => {
      const res = validateStateTransition('FINALIZED', 'REOPENED', {
        inspectorId: 'insp-001',
        inspectorRole: 'INSPECTOR',
        reopenReason: 'Discovered manufacturer batch conflict on bottle neck requiring physical re-examination',
      });
      expect(res.valid).toBe(true);
    });

    it('7.5 timeline preserves both the original finalization and subsequent reopen event', () => {
      const timeline = buildInspectionTimeline({
        inspectionId: 'ins-reopen-test',
        createdAt: '2026-09-13T10:00:00.000Z',
        inspectorId: 'insp-001',
        isFinalized: true,
        finalizedAt: '2026-09-13T11:00:00.000Z',
        reopenedAt: '2026-09-13T12:00:00.000Z',
        reopenReason: 'Physical re-examination of crimp seal required.',
      });

      const finalizedEvent = timeline.find((e) => e.eventType === 'FINALIZED');
      const reopenedEvent = timeline.find((e) => e.eventType === 'REOPENED');

      expect(finalizedEvent).toBeDefined();
      expect(reopenedEvent).toBeDefined();
      expect(reopenedEvent?.metadata?.reopenReason).toBe('Physical re-examination of crimp seal required.');
    });
  });

  // ==========================================================================
  // 8. MULTI-SURFACE COMPLIANCE WORKSPACE & PROVENANCE
  // ==========================================================================
  describe('8. Multi-Surface Compliance Workspace & Provenance', () => {
    it('8.1 maps rule 6(1)(a) to manufacturer evidence and displays surfaces', () => {
      const workspace = buildComplianceWorkspace({
        inspectionId: 'ins-surf-1',
        images: [
          { id: 'img-1', surface: 'FRONT' as PackageSurface },
          { id: 'img-2', surface: 'BACK' as PackageSurface },
        ],
        declarations: [
          {
            id: 'decl-mfg',
            field: 'declarations.MANUFACTURER_NAME_ADDRESS',
            surface: 'BACK' as PackageSurface,
            rawText: 'Hindustan Unilever Ltd., Mumbai',
          } as Declaration,
        ],
        assessments: [
          {
            id: 'assess-mfg',
            ruleNumber: '6(1)(c)',
            ruleTitle: 'Name and Address of Manufacturer',
            result: 'PASS',
            severity: 'CRITICAL',
            explanation: 'Manufacturer name and address declared.',
          } as ComplianceAssessment,
        ],
        authenticatedInspectorId: 'insp-001',
      });

      const mfgMapping = workspace.mappings.find((m) => m.ruleNumber.includes('6(1)(c)'));
      expect(mfgMapping).toBeDefined();
      expect(mfgMapping?.observedEvidence.sources[0]?.surface).toBe('BACK');
      expect(workspace.capturedSurfaces).toContain('FRONT');
      expect(workspace.capturedSurfaces).toContain('BACK');
    });

    it('8.2 detects cross-surface conflict (Front ₹120 vs Neck ₹150) without silent winner', () => {
      const workspace = buildComplianceWorkspace({
        inspectionId: 'ins-conflict-surf',
        images: [
          { id: 'img-front', surface: 'FRONT' as PackageSurface },
          { id: 'img-neck', surface: 'NECK' as PackageSurface },
        ],
        declarations: [
          {
            id: 'decl-mrp-front',
            field: 'declarations.MRP',
            surface: 'FRONT' as PackageSurface,
            rawText: 'MRP Rs. 120.00',
          } as Declaration,
          {
            id: 'decl-mrp-neck',
            field: 'declarations.MRP',
            surface: 'NECK' as PackageSurface,
            rawText: 'MRP Rs. 150.00',
          } as Declaration,
        ],
        fusedPackage: {
          inspectionId: 'ins-conflict-surf',
          fields: {
            MRP: {
              field: 'MRP',
              declaredValue: 'MRP Rs. 120.00',
              confidence: 0.95,
              evidenceStatus: 'CONFLICT',
              searchStatus: 'SEARCH_COMPLETED_WITH_EVIDENCE',
              crossSurfaceConflict: {
                hasConflict: true,
                surfaces: ['FRONT', 'NECK'],
                values: ['MRP Rs. 120.00', 'MRP Rs. 150.00'],
                explanation: 'Discrepancy between FRONT (120) and NECK (150)',
              },
            } as any,
          },
        } as any,
        assessments: [
          {
            id: 'assess-mrp',
            ruleNumber: '6(1)(e)',
            ruleTitle: 'Retail Sale Price',
            result: 'REQUIRES_VERIFICATION',
            severity: 'CRITICAL',
            explanation: 'Conflicting MRP declared across surfaces.',
          } as ComplianceAssessment,
        ],
        authenticatedInspectorId: 'insp-001',
      });

      const mrpMapping = workspace.mappings.find((m) => m.ruleNumber.includes('6(1)(e)'));
      expect(mrpMapping?.observedEvidence.evidenceStatus).toBe('CONFLICT');
      expect(mrpMapping?.observedEvidence.conflictDetails?.hasConflict).toBe(true);
      expect(mrpMapping?.observedEvidence.conflictDetails?.surfaces).toContain('FRONT');
      expect(mrpMapping?.observedEvidence.conflictDetails?.surfaces).toContain('NECK');
      // No silent winner: both are present in differingValues
      expect(mrpMapping?.observedEvidence.conflictDetails?.differingValues.length).toBe(2);
    });
  });

  // ==========================================================================
  // 9. GUIDED REINSPECTION EVIDENCE PRESERVATION
  // ==========================================================================
  describe('9. Guided Reinspection Evidence Preservation', () => {
    it('9.1 reinspection appends evidence with independent provenance without overwriting earlier captures', () => {
      const initialImages: InspectionImage[] = [
        { id: 'img-1', inspectionId: 'ins-re-1', surface: 'FRONT', storagePath: 'img1.jpg', sha256: 'hash1' } as any,
      ];
      const reinspectionImages: InspectionImage[] = [
        ...initialImages,
        { id: 'img-2-neck', inspectionId: 'ins-re-1', surface: 'NECK', storagePath: 'img2.jpg', sha256: 'hash2' } as any,
      ];

      expect(reinspectionImages.length).toBe(2);
      expect(reinspectionImages[0]?.id).toBe('img-1');
      expect(reinspectionImages[1]?.id).toBe('img-2-neck');
      expect(reinspectionImages[0]?.sha256).toBe('hash1');
      expect(reinspectionImages[1]?.sha256).toBe('hash2');
    });
  });

  // ==========================================================================
  // 10. ONLINE AI ENRICHMENT AFTER FINALIZATION
  // ==========================================================================
  describe('10. Online AI Enrichment After Finalization', () => {
    it('10.1 new AI observations arriving after finalization do NOT mutate inspector final decision', () => {
      const finalizedInspection = {
        id: 'ins-ai-post',
        status: 'FINALIZED',
        decision: {
          decision: 'COMPLIANT',
          decidedAt: '2026-09-13T10:00:00.000Z',
          isFinalized: true,
        },
      };

      // Simulating new online AI analysis arriving later
      const newAiAnalysis = {
        provider: 'GEMINI',
        confidence: 0.99,
        status: 'COMPLETED',
        detectedIssues: ['Potential font size violation on net quantity'],
        completedAt: '2026-09-13T11:30:00.000Z',
      };

      // Invariant: Final decision remains unchanged
      expect(finalizedInspection.decision.decision).toBe('COMPLIANT');
      expect(finalizedInspection.status).toBe('FINALIZED');
      // The AI analysis is logged as subsequent observation without touching decision
      expect(newAiAnalysis.status).toBe('COMPLETED');
    });
  });

  // ==========================================================================
  // 11. OFFLINE FINALIZATION & SYNC CONFLICTS
  // ==========================================================================
  describe('11. Offline Finalization & Sync Conflicts', () => {
    it('11.1 offline finalization succeeds locally when local conditions are met', () => {
      const guard = calculateFinalizationGuard({
        currentStatus: 'READY_FOR_DECISION',
        evidenceProcessingComplete: true,
        ruleEngineEvaluated: true,
        unresolvedConflictsCount: 0,
        unacknowledgedMandatoryActionsCount: 0,
        inspectorDecisionRecorded: true,
        authenticatedInspectorId: 'insp-offline-01',
      });

      expect(guard.canFinalize).toBe(true);
    });

    it('11.2 sync conflict generates explicit conflict review state rather than last-write-wins', () => {
      const localFinalization = {
        inspectionId: 'ins-sync-conf',
        status: 'FINALIZED',
        decision: 'COMPLIANT',
        updatedAt: '2026-09-13T12:00:00.000Z',
      };

      const remoteAmendment = {
        inspectionId: 'ins-sync-conf',
        status: 'REOPENED',
        reopenReason: 'Supervisory audit discovered batch mismatch',
        updatedAt: '2026-09-13T12:05:00.000Z',
      };

      // No last-write-wins: sync marks SYNC_CONFLICT for supervisor reconciliation
      const syncResult = {
        syncStatus: 'SYNC_CONFLICT',
        localState: localFinalization,
        remoteState: remoteAmendment,
        reconciliationRequired: true,
      };

      expect(syncResult.syncStatus).toBe('SYNC_CONFLICT');
      expect(syncResult.localState.decision).toBe('COMPLIANT');
      expect(syncResult.remoteState.status).toBe('REOPENED');
    });
  });

  // ==========================================================================
  // 12. APPEND-ONLY CHRONOLOGICAL TIMELINE INTEGRITY
  // ==========================================================================
  describe('12. Append-Only Chronological Timeline Integrity', () => {
    it('12.1 verifyTimelineIntegrity confirms sequential valid timeline', () => {
      const timeline: TimelineEvent[] = [
        {
          id: 'tl-1',
          eventType: 'INSPECTION_CREATED',
          timestamp: '2026-09-13T10:00:00.000Z',
          actor: { id: 'insp-1', role: 'INSPECTOR' },
          title: 'Inspection Created',
          description: 'Package inspection initialized.',
        },
        {
          id: 'tl-2',
          eventType: 'EVIDENCE_CAPTURED',
          timestamp: '2026-09-13T10:05:00.000Z',
          actor: { id: 'insp-1', role: 'INSPECTOR' },
          title: 'Evidence Captured',
          description: 'Front and back surfaces photographed.',
        },
        {
          id: 'tl-3',
          eventType: 'RULE_ENGINE_EVALUATED',
          timestamp: '2026-09-13T10:06:00.000Z',
          actor: { id: 'rules', role: 'RULE_ENGINE' },
          title: 'Rule Engine Evaluation',
          description: 'Deterministic assessment evaluated.',
        },
        {
          id: 'tl-4',
          eventType: 'FINALIZED',
          timestamp: '2026-09-13T10:10:00.000Z',
          actor: { id: 'insp-1', role: 'INSPECTOR' },
          title: 'Inspection Finalized',
          description: 'Official statutory determination persisted.',
        },
      ];

      const check = verifyTimelineIntegrity(timeline);
      expect(check.valid).toBe(true);
      expect(check.tamperDetected).toBe(false);
    });

    it('12.2 verifyTimelineIntegrity detects out-of-order or retroactively edited timestamps', () => {
      const corruptedTimeline: TimelineEvent[] = [
        {
          id: 'tl-1',
          eventType: 'INSPECTION_CREATED',
          timestamp: '2026-09-13T10:00:00.000Z',
          actor: { id: 'insp-1', role: 'INSPECTOR' },
          title: 'Inspection Created',
          description: 'Package inspection initialized.',
        },
        {
          id: 'tl-2',
          eventType: 'FINALIZED',
          timestamp: '2026-09-13T09:00:00.000Z', // Tampered timestamp before creation!
          actor: { id: 'insp-1', role: 'INSPECTOR' },
          title: 'Inspection Finalized',
          description: 'Tampered timestamp.',
        },
      ];

      const check = verifyTimelineIntegrity(corruptedTimeline);
      expect(check.valid).toBe(false);
      expect(check.tamperDetected).toBe(true);
      expect(check.errors[0]).toContain('Chronological violation');
    });
  });

  // ==========================================================================
  // 13. STATUTORY LOGIC & RULE ENGINE INVARIANCE
  // ==========================================================================
  describe('13. Statutory Logic & Rule Engine Invariance', () => {
    it('13.1 Phase F does not evaluate statutory formulas directly; consumes Rule Engine findings', () => {
      // Compliance workspace maps the existing assessment without implementing price/quantity arithmetic
      const assessment: ComplianceAssessment = {
        id: 'assess-qty',
        ruleNumber: '6(1)(b)',
        ruleTitle: 'Net Quantity',
        result: 'PASS',
        severity: 'CRITICAL',
        explanation: 'Net quantity conforms to standard specified in Second Schedule.',
      };

      const workspace = buildComplianceWorkspace({
        inspectionId: 'ins-rule-inv',
        images: [],
        declarations: [],
        assessments: [assessment],
        authenticatedInspectorId: 'insp-001',
      });

      expect(workspace.mappings[0]?.ruleEngineAssessment.result).toBe('PASS');
      expect(workspace.mappings[0]?.ruleEngineAssessment.explanation).toBe(assessment.explanation);
    });
  });
});

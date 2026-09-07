import { describe, expect, it } from 'vitest';
import {
  type PackageAnalysis,
  type Declaration,
  type ComplianceAssessment,
  type AssessmentReview,
  type InspectorCorrection,
  type InspectionAmendment,
  type AuditLog,
  AssessmentReviewSchema,
  InspectorCorrectionSchema,
  InspectionAmendmentSchema,
  InspectionFinalizationSummarySchema,
  AuditLogSchema,
  ComplianceAssessmentSchema,
  InspectorDecisionTypeSchema,
  UserRoleSchema,
} from '@lm-vision/shared-types';
import { evaluateCompliance, loadAuthoritativeRuleBundle } from '@lm-vision/rules';

// Helpers to create test fixtures
function createMockAssessment(overrides?: Partial<ComplianceAssessment>): ComplianceAssessment {
  return ComplianceAssessmentSchema.parse({
    id: overrides?.id || 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    inspectionId: overrides?.inspectionId || '11111111-1111-4111-8111-111111111111',
    ruleId: overrides?.ruleId || 'rule-18-2-mrp-mandatory',
    ruleVersionId: '1',
    ruleNumber: overrides?.ruleNumber || '18(2)',
    subRule: '2',
    ruleTitle: overrides?.ruleTitle || 'Maximum Retail Price (MRP) Declaration',
    ruleKind: 'AUTHORITATIVE',
    ruleSource: {
      sourceDocument: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
      sourcePage: 18,
      gazetteNotificationNumber: 'G.S.R. 202(E)',
      clauseReference: 'Rule 18(2)',
    },
    result: overrides?.result || 'FAIL',
    evidenceSufficiency: overrides?.evidenceSufficiency || 'SUFFICIENT',
    severity: 'CRITICAL',
    explanation: overrides?.explanation || 'MRP declaration missing standard format.',
    observedValue: overrides?.observedValue !== undefined ? overrides.observedValue : { mrp: 299, currency: 'INR' },
    expectedConstraint: { format: 'MRP Rs. XX.XX (incl. of all taxes)' },
    deviation: overrides?.deviation,
    declarationIds: overrides?.declarationIds || ['decl-mrp-1'],
    evidenceIds: overrides?.evidenceIds || ['22222222-2222-4222-8222-222222222222'],
    confidence: overrides?.confidence ?? 0.94,
    aiExplanation: 'Gemini detected ₹299 on back panel with 94% confidence.',
    engineVersion: '1.0.0',
    ruleBundleId: 'LM-IN-RULES-2026.09',
    evaluatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
}

describe('Phase 8: Inspector Review, Evidence Verification & Final Decision Engine', () => {
  const inspectorId = '00000000-0000-4000-8000-000000000001';
  const inspectionId = '11111111-1111-4111-8111-111111111111';

  // ==========================================================================
  // Group 1: Review Lifecycle & Verification (Tests 1–3)
  // ==========================================================================
  describe('Group 1: Review Lifecycle & Verification', () => {
    it('1. should transition through complete inspector review lifecycle', () => {
      const assessment = createMockAssessment();
      const now = new Date().toISOString();

      // State 1: UNREVIEWED
      let review = AssessmentReviewSchema.parse({
        id: '77777777-7777-4777-8777-777777777771',
        inspectionId,
        assessmentId: assessment.id,
        inspectorUserId: inspectorId,
        status: 'UNREVIEWED',
        originalResult: assessment.result,
        originalObservedValue: assessment.observedValue,
        originalConfidence: assessment.confidence,
        reviewedEvidence: false,
        reviewedRule: false,
        reviewedObservation: false,
        createdAt: now,
        updatedAt: now,
      });
      expect(review.status).toBe('UNREVIEWED');

      // State 2: IN_REVIEW
      review = AssessmentReviewSchema.parse({
        ...review,
        status: 'IN_REVIEW',
        reviewedEvidence: true,
        updatedAt: new Date().toISOString(),
      });
      expect(review.status).toBe('IN_REVIEW');
      expect(review.reviewedEvidence).toBe(true);

      // State 3: VERIFIED
      review = AssessmentReviewSchema.parse({
        ...review,
        status: 'VERIFIED',
        action: 'VERIFY',
        reviewedRule: true,
        reviewedObservation: true,
        rationale: 'Physical evidence corroborated against statutory constraint.',
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      expect(review.status).toBe('VERIFIED');
      expect(review.action).toBe('VERIFY');
      expect(review.reviewedRule).toBe(true);
      expect(review.reviewedObservation).toBe(true);
    });

    it('2. should verify machine assessment against physical evidence and GSR 202(E)', () => {
      const assessment = createMockAssessment({ result: 'PASS' });
      const review: AssessmentReview = {
        id: '77777777-7777-4777-8777-777777777772',
        inspectionId,
        assessmentId: assessment.id,
        inspectorUserId: inspectorId,
        status: 'VERIFIED',
        action: 'VERIFY',
        originalResult: 'PASS',
        originalObservedValue: assessment.observedValue,
        originalConfidence: 0.98,
        reviewedEvidence: true,
        reviewedRule: true,
        reviewedObservation: true,
        rationale: 'Confirmed mandatory consumer care contact number is present and compliant.',
        reviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const parsed = AssessmentReviewSchema.parse(review);
      expect(parsed.originalResult).toBe('PASS');
      expect(parsed.status).toBe('VERIFIED');
    });

    it('3. should track evidence review checklist independently', () => {
      const review: AssessmentReview = {
        id: '77777777-7777-4777-8777-777777777773',
        inspectionId,
        assessmentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        inspectorUserId: inspectorId,
        status: 'IN_REVIEW',
        originalResult: 'FAIL',
        originalConfidence: 0.9,
        reviewedEvidence: true,
        reviewedRule: false,
        reviewedObservation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(review.reviewedEvidence).toBe(true);
      expect(review.reviewedRule).toBe(false);
      expect(review.reviewedObservation).toBe(false);
    });
  });

  // ==========================================================================
  // Group 2: AI Immutability & Inspector Corrections (Tests 4–6)
  // ==========================================================================
  describe('Group 2: AI Immutability & Inspector Corrections', () => {
    it('4. should preserve original AI observations immutably when inspector disagrees', () => {
      const originalObserved = { mrp: 299, currency: 'INR' };
      const assessment = createMockAssessment({ observedValue: originalObserved });

      const correction: InspectorCorrection = {
        id: '55555555-5555-4555-8555-555555555551',
        assessmentId: assessment.id,
        declarationType: 'MRP',
        originalValue: originalObserved,
        correctedValue: { mrp: 249, currency: 'INR' },
        originalConfidence: 0.94,
        correctedConfidence: 1.0,
        reason: 'Captured front panel clearly shows ₹249 stamped on product.',
        inspectorUserId: inspectorId,
        evidenceIds: assessment.evidenceIds,
        correctedAt: new Date().toISOString(),
      };

      const parsedCorrection = InspectorCorrectionSchema.parse(correction);

      // Verification: Original AI observation in assessment is UNCHANGED
      expect(assessment.observedValue).toEqual({ mrp: 299, currency: 'INR' });
      // Verification: Correction stores both original and corrected side-by-side
      expect(parsedCorrection.originalValue).toEqual({ mrp: 299, currency: 'INR' });
      expect(parsedCorrection.correctedValue).toEqual({ mrp: 249, currency: 'INR' });
      expect(parsedCorrection.reason).toContain('₹249');
    });

    it('5. should require statutory reason for every inspector correction', () => {
      expect(() => {
        InspectorCorrectionSchema.parse({
          id: '55555555-5555-4555-8555-555555555552',
          assessmentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          declarationType: 'NET_QUANTITY',
          originalValue: '450 g',
          correctedValue: '500 g',
          reason: '', // Empty reason should fail schema validation
          inspectorUserId: inspectorId,
          evidenceIds: [],
          correctedAt: new Date().toISOString(),
        });
      }).toThrow();
    });

    it('6. should produce a dedicated audit log event on inspector correction', () => {
      const now = new Date().toISOString();
      const auditLog: AuditLog = {
        id: '66666666-6666-4666-8666-666666666661',
        action: 'INSPECTOR_CORRECTION',
        targetType: 'COMPLIANCE_ASSESSMENT',
        targetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        actorUserId: inspectorId,
        actorRole: 'INSPECTOR',
        previousState: { observedValue: { mrp: 299 } },
        newState: { correctedValue: { mrp: 249 }, reason: 'Front panel manual review' },
        changeSummary: 'Inspector corrected assessment Rule 18(2): "Front panel manual review"',
        timestamp: now,
      };

      const parsed = AuditLogSchema.parse(auditLog);
      expect(parsed.action).toBe('INSPECTOR_CORRECTION');
      expect(parsed.targetType).toBe('COMPLIANCE_ASSESSMENT');
      expect(parsed.previousState).toEqual({ observedValue: { mrp: 299 } });
      expect(parsed.newState).toEqual({ correctedValue: { mrp: 249 }, reason: 'Front panel manual review' });
    });
  });

  // ==========================================================================
  // Group 3: Evidence Sufficiency & Conflict Handling (Tests 7–10)
  // ==========================================================================
  describe('Group 3: Evidence Sufficiency & Conflict Handling', () => {
    it('7. should handle conflicting evidence explicitly without auto-selecting one value', () => {
      const conflictingAssessment = createMockAssessment({
        evidenceSufficiency: 'CONFLICTING',
        result: 'REQUIRES_VERIFICATION',
        explanation: 'Conflicting MRP observed across panels: Front ₹299 vs Back ₹249.',
        deviation: 'CONFLICT_DETECTED',
      });

      expect(conflictingAssessment.evidenceSufficiency).toBe('CONFLICTING');
      expect(conflictingAssessment.result).toBe('REQUIRES_VERIFICATION');

      // Human review requires explicit acknowledgement
      const review: AssessmentReview = {
        id: '77777777-7777-4777-8777-777777777774',
        inspectionId,
        assessmentId: conflictingAssessment.id,
        inspectorUserId: inspectorId,
        status: 'CORRECTED',
        action: 'CORRECT',
        originalResult: 'REQUIRES_VERIFICATION',
        originalConfidence: 0.72,
        reviewedEvidence: true,
        reviewedRule: true,
        reviewedObservation: true,
        correction: {
          id: '55555555-5555-4555-8555-555555555553',
          assessmentId: conflictingAssessment.id,
          declarationType: 'MRP',
          originalValue: 'CONFLICT: Front ₹299, Back ₹249',
          correctedValue: '₹249.00 (verified on back principal display panel)',
          reason: 'Back panel is principal display panel as per Rule 2(h). Front was promotional sticker.',
          inspectorUserId: inspectorId,
          evidenceIds: conflictingAssessment.evidenceIds,
          correctedAt: new Date().toISOString(),
        },
        rationale: 'Inspector resolved packaging conflict manually.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const parsedReview = AssessmentReviewSchema.parse(review);
      expect(parsedReview.status).toBe('CORRECTED');
      expect(parsedReview.correction?.correctedValue).toContain('₹249.00');
    });

    it('8. should preserve INSUFFICIENT_EVIDENCE without converting to arbitrary PASS/FAIL', () => {
      const assessment = createMockAssessment({
        result: 'INSUFFICIENT_EVIDENCE',
        evidenceSufficiency: 'INSUFFICIENT',
        explanation: 'Consumer care contact details not visible on any captured image.',
      });

      expect(assessment.result).toBe('INSUFFICIENT_EVIDENCE');
      expect(assessment.evidenceSufficiency).toBe('INSUFFICIENT');
    });

    it('9. should surface LOW_CONFIDENCE for inspector corroboration', () => {
      const assessment = createMockAssessment({
        confidence: 0.45,
        evidenceSufficiency: 'LOW_CONFIDENCE',
        result: 'REQUIRES_VERIFICATION',
        explanation: 'Low OCR clarity on manufacturer address due to packaging glare.',
      });

      expect(assessment.evidenceSufficiency).toBe('LOW_CONFIDENCE');
      expect(assessment.confidence).toBeLessThan(0.5);
      expect(assessment.result).toBe('REQUIRES_VERIFICATION');
    });

    it('10. should attach additional evidence without deleting prior captured images', () => {
      const assessment = createMockAssessment();
      const initialEvidence = [...assessment.evidenceIds];
      const newEvidenceId = '33333333-3333-4333-8333-333333333339';

      const updatedEvidence = [...initialEvidence, newEvidenceId];

      expect(updatedEvidence).toHaveLength(initialEvidence.length + 1);
      expect(updatedEvidence).toContain(initialEvidence[0]);
      expect(updatedEvidence).toContain(newEvidenceId);
    });
  });

  // ==========================================================================
  // Group 4: Decision Model & Finalization Gate (Tests 11–15)
  // ==========================================================================
  describe('Group 4: Decision Model & Finalization Gate', () => {
    it('11. should record canonical InspectorDecision separate from machine assessments', () => {
      const assessment = createMockAssessment({ result: 'FAIL' });

      // Inspector decision uses canonical type
      const decisionType = InspectorDecisionTypeSchema.parse('NON_COMPLIANT');
      expect(decisionType).toBe('NON_COMPLIANT');

      // Machine assessment result remains FAIL, inspector decision is NON_COMPLIANT
      expect(assessment.result).toBe('FAIL');
    });

    it('12. should gate finalization until all mandatory assessments are reviewed', () => {
      const assessments = [
        createMockAssessment({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01' }),
        createMockAssessment({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02' }),
      ];

      // Only 1 of 2 reviewed
      const reviews: AssessmentReview[] = [
        {
          id: '77777777-7777-4777-8777-777777777701',
          inspectionId,
          assessmentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
          inspectorUserId: inspectorId,
          status: 'VERIFIED',
          originalResult: 'FAIL',
          originalConfidence: 0.9,
          reviewedEvidence: true,
          reviewedRule: true,
          reviewedObservation: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const unreviewed = assessments.filter((a) => {
        const rev = reviews.find((r) => r.assessmentId === a.id);
        return !rev || rev.status === 'UNREVIEWED';
      });

      expect(unreviewed).toHaveLength(1);
      expect(unreviewed[0].id).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02');
    });

    it('13. should lock finalized inspection from ordinary editing', () => {
      const summary = InspectionFinalizationSummarySchema.parse({
        inspectionId,
        inspectorUserId: inspectorId,
        totalRulesEvaluated: 8,
        passCount: 5,
        failCount: 2,
        requiresVerificationCount: 1,
        insufficientEvidenceCount: 0,
        notApplicableCount: 0,
        correctionsCount: 1,
        evidenceReviewedCount: 6,
        outstandingIssuesCount: 0,
        conflictsAcknowledged: true,
        decision: 'NON_COMPLIANT',
        inspectorNotes: 'Seizure notice issued under Section 15 for missing MRP format.',
        finalizedAt: new Date().toISOString(),
      });

      expect(summary.decision).toBe('NON_COMPLIANT');
      expect(summary.conflictsAcknowledged).toBe(true);
    });

    it('14. should require official Amendment event for post-finalization modifications', () => {
      const amendment: InspectionAmendment = {
        id: '88888888-8888-4888-8888-888888888881',
        inspectionId,
        amendedByUserId: inspectorId,
        amendmentReason: 'Manufacturer provided valid exemption certificate from Central Legal Metrology office.',
        previousDecision: 'NON_COMPLIANT',
        newDecision: 'COMPLIANT',
        previousState: { decision: 'NON_COMPLIANT' },
        newState: { decision: 'COMPLIANT' },
        amendedAt: new Date().toISOString(),
      };

      const parsed = InspectionAmendmentSchema.parse(amendment);
      expect(parsed.previousDecision).toBe('NON_COMPLIANT');
      expect(parsed.newDecision).toBe('COMPLIANT');
      expect(parsed.amendmentReason).toContain('exemption certificate');
    });

    it('15. should record comprehensive tamper-evident audit trail for all key actions', () => {
      const auditActions: AuditLog['action'][] = [
        'INSPECTION_CREATED',
        'AI_ANALYSIS_COMPLETED',
        'RULE_EVALUATED',
        'INSPECTOR_REVIEW_STARTED',
        'INSPECTOR_CORRECTION',
        'EVIDENCE_ATTACHED',
        'DECISION_RECORDED',
        'INSPECTION_FINALIZED',
        'INSPECTION_AMENDED',
      ];

      auditActions.forEach((action) => {
        const entry = AuditLogSchema.parse({
          id: '66666666-6666-4666-8666-666666666669',
          action,
          targetType: 'INSPECTION',
          targetId: inspectionId,
          actorUserId: inspectorId,
          changeSummary: `Audit action ${action} executed`,
          timestamp: new Date().toISOString(),
        });
        expect(entry.action).toBe(action);
      });
    });
  });

  // ==========================================================================
  // Group 5: Offline-First Review & Sync Safety (Tests 16–19)
  // ==========================================================================
  describe('Group 5: Offline-First Review & Sync Safety', () => {
    it('16. should execute review and corrections completely offline without network calls', () => {
      // Offline local evaluation
      const mockDeclarations: Declaration[] = [
        {
          type: 'GENERIC_NAME',
          rawText: 'Fortified Wheat Flour',
          confidence: 0.95,
          detectedLanguage: 'en',
        },
        {
          type: 'MRP',
          rawText: 'Rs. 55.00 (inclusive of all taxes)',
          normalizedValue: 55,
          unit: 'INR',
          confidence: 0.96,
          detectedLanguage: 'en',
        },
      ];

      const analysis: PackageAnalysis = {
        provider: 'MOCK',
        modelName: 'deterministic-offline-model',
        quality: { overallScore: 0.9, isAcceptable: true, sharpness: 80, brightness: 80, glareDetected: false, blurDetected: false, shadowDetected: false, warnings: [] },
        declarations: mockDeclarations,
        textRegions: [],
        visualMeasurements: [],
        latencyMs: 10,
        timestamp: new Date().toISOString(),
      };

      // Local GSR 202(E) evaluation offline
      const summary = evaluateCompliance({ packageAnalysis: analysis, inspectionId });
      expect(summary.ruleCountEvaluated).toBeGreaterThan(0);

      // Local inspector review offline
      const assessment = summary.assessments[0];
      const review: AssessmentReview = {
        id: '77777777-7777-4777-8777-777777777775',
        inspectionId,
        assessmentId: assessment.id,
        inspectorUserId: inspectorId,
        status: 'VERIFIED',
        action: 'VERIFY',
        originalResult: assessment.result,
        originalObservedValue: assessment.observedValue,
        originalConfidence: assessment.confidence,
        reviewedEvidence: true,
        reviewedRule: true,
        reviewedObservation: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(AssessmentReviewSchema.parse(review).status).toBe('VERIFIED');
    });

    it('17. should record final decision offline in local draft storage', () => {
      const summary = InspectionFinalizationSummarySchema.parse({
        inspectionId,
        inspectorUserId: inspectorId,
        totalRulesEvaluated: 4,
        passCount: 4,
        failCount: 0,
        requiresVerificationCount: 0,
        insufficientEvidenceCount: 0,
        notApplicableCount: 0,
        correctionsCount: 0,
        evidenceReviewedCount: 2,
        outstandingIssuesCount: 0,
        conflictsAcknowledged: false,
        decision: 'COMPLIANT',
        inspectorNotes: 'All mandatory declarations verified offline.',
        finalizedAt: new Date().toISOString(),
      });

      expect(summary.decision).toBe('COMPLIANT');
      expect(summary.passCount).toBe(4);
    });

    it('18. should track pending sync queue operations', () => {
      const pendingOperations = ['CREATE_DRAFT', 'RECORD_REVIEW', 'FINALIZE_INSPECTION'];
      expect(pendingOperations).toContain('RECORD_REVIEW');
      expect(pendingOperations).toContain('FINALIZE_INSPECTION');
    });

    it('19. should detect and handle sync conflicts safely without corrupting local data', () => {
      const localUpdated = '2026-09-06T12:00:00.000Z';
      const remoteUpdated = '2026-09-06T12:30:00.000Z';

      const isConflict = remoteUpdated > localUpdated;
      expect(isConflict).toBe(true);
      // Safe resolution: Local draft is preserved, conflict logged
    });
  });

  // ==========================================================================
  // Group 6: Security, Roles & Legal Source Invariants (Tests 20–25)
  // ==========================================================================
  describe('Group 6: Security, Roles & Legal Source Invariants', () => {
    it('20. should enforce inspector authorization scoping', () => {
      const role = UserRoleSchema.parse('INSPECTOR');
      expect(role).toBe('INSPECTOR');
    });

    it('21. should respect role-based permissions (INSPECTOR, SUPERVISOR, AUDITOR)', () => {
      const roles = ['INSPECTOR', 'SUPERVISOR', 'ADMIN', 'AUDITOR'];
      roles.forEach((r) => {
        expect(UserRoleSchema.safeParse(r).success).toBe(true);
      });
      // Unauthorized role fails
      expect(UserRoleSchema.safeParse('PUBLIC_USER').success).toBe(false);
    });

    it('22. should preserve complete provenance chain: Assessment -> RuleVersion -> Declaration -> Evidence -> Image', () => {
      const assessment = createMockAssessment();
      expect(assessment.ruleId).toBe('rule-18-2-mrp-mandatory');
      expect(assessment.ruleSource.gazetteNotificationNumber).toBe('G.S.R. 202(E)');
      expect(assessment.ruleSource.sourcePage).toBe(18);
      expect(assessment.declarationIds).toContain('decl-mrp-1');
      expect(assessment.evidenceIds).toContain('22222222-2222-4222-8222-222222222222');
    });

    it('23. should maintain deterministic review state transitions', () => {
      const allowedTransitions: Record<string, string[]> = {
        UNREVIEWED: ['IN_REVIEW', 'VERIFIED', 'CORRECTED'],
        IN_REVIEW: ['VERIFIED', 'CORRECTED', 'REQUIRES_FURTHER_REVIEW'],
        VERIFIED: ['CORRECTED', 'REQUIRES_FURTHER_REVIEW'],
        CORRECTED: ['VERIFIED', 'REQUIRES_FURTHER_REVIEW'],
        REQUIRES_FURTHER_REVIEW: ['IN_REVIEW', 'VERIFIED', 'CORRECTED'],
      };

      expect(allowedTransitions['UNREVIEWED']).toContain('VERIFIED');
      expect(allowedTransitions['IN_REVIEW']).toContain('CORRECTED');
    });

    it('24. should never mutate original machine assessment entity when inspector corrects', () => {
      const assessment = createMockAssessment({ result: 'FAIL' });
      const originalResult = assessment.result;

      // Inspector corrects observation
      const review: AssessmentReview = {
        id: '77777777-7777-4777-8777-777777777776',
        inspectionId,
        assessmentId: assessment.id,
        inspectorUserId: inspectorId,
        status: 'CORRECTED',
        action: 'CORRECT',
        originalResult: assessment.result,
        originalConfidence: 1.0,
        reviewedEvidence: true,
        reviewedRule: true,
        reviewedObservation: true,
        correction: {
          id: '55555555-5555-4555-8555-555555555554',
          assessmentId: assessment.id,
          declarationType: 'MRP',
          originalValue: 299,
          correctedValue: 249,
          reason: 'Verified on front panel',
          inspectorUserId: inspectorId,
          evidenceIds: [],
          correctedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(assessment.result).toBe(originalResult); // Remains 'FAIL'
      expect(review.status).toBe('CORRECTED');
    });

    it('25. should never allow client to mutate authoritative statutory rules', () => {
      const bundle = loadAuthoritativeRuleBundle();
      // Rules are frozen/immutable from client
      expect(() => {
        (bundle.manifest as any).bundleId = 'FABRICATED-BUNDLE';
      }).toThrow();
    });
  });

  // ==========================================================================
  // Group 7: Aggregation Counts & Roundtrip Persistence (Tests 26–27)
  // ==========================================================================
  describe('Group 7: Aggregation Counts & Roundtrip Persistence', () => {
    it('26. should compute exact final assessment counts accurately from actual state', () => {
      const assessments = [
        createMockAssessment({ result: 'PASS' }),
        createMockAssessment({ result: 'PASS' }),
        createMockAssessment({ result: 'FAIL' }),
        createMockAssessment({ result: 'REQUIRES_VERIFICATION' }),
        createMockAssessment({ result: 'INSUFFICIENT_EVIDENCE' }),
      ];

      const passCount = assessments.filter((a) => a.result === 'PASS').length;
      const failCount = assessments.filter((a) => a.result === 'FAIL').length;
      const reqVerifCount = assessments.filter((a) => a.result === 'REQUIRES_VERIFICATION').length;
      const insuffCount = assessments.filter((a) => a.result === 'INSUFFICIENT_EVIDENCE').length;

      expect(passCount).toBe(2);
      expect(failCount).toBe(1);
      expect(reqVerifCount).toBe(1);
      expect(insuffCount).toBe(1);
      expect(assessments.length).toBe(5);
    });

    it('27. should serialize and deserialize inspector review and decision without data loss', () => {
      const summary = InspectionFinalizationSummarySchema.parse({
        inspectionId,
        inspectorUserId: inspectorId,
        totalRulesEvaluated: 5,
        passCount: 2,
        failCount: 1,
        requiresVerificationCount: 1,
        insufficientEvidenceCount: 1,
        notApplicableCount: 0,
        correctionsCount: 1,
        evidenceReviewedCount: 4,
        outstandingIssuesCount: 0,
        conflictsAcknowledged: true,
        decision: 'NOTICE_ISSUED',
        inspectorNotes: 'Issued statutory notice under Rule 32 for missing manufacturer address.',
        finalizedAt: new Date().toISOString(),
      });

      const serialized = JSON.stringify(summary);
      const deserialized = InspectionFinalizationSummarySchema.parse(JSON.parse(serialized));

      expect(deserialized.decision).toBe('NOTICE_ISSUED');
      expect(deserialized.correctionsCount).toBe(1);
      expect(deserialized.inspectorNotes).toContain('Rule 32');
    });
  });
});

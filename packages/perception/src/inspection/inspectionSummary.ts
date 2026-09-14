/**
 * Phase E: Professional Inspection Summary & Report Data Assembly
 *
 * ARCHITECTURAL GUARDRAILS & INVARIANTS:
 * 1. STRICT SEPARATION between SYSTEM ASSESSMENT and INSPECTOR FINAL DECISION.
 *    Never merge them; never visually imply AI made the final decision.
 * 2. Statutory Assessment counts derived strictly from deterministic Rule Engine assessments.
 * 3. Never fabricate numbers or statistics.
 * 4. Exposes SHA-256 evidence integrity fingerprints:
 *    Explicitly labeled as an integrity/fingerprint mechanism, NOT encryption.
 */

import type {
  ComplianceAssessment,
  ComplianceResult,
  InspectorDecision,
} from '@lm-vision/shared-types';
import type { FusedEvidencePackage } from '../fusion/evidenceSchema.js';
import type {
  ExplainableFinding,
  InspectionQualityScoreBreakdown,
  InspectionSummaryReport,
  InspectorActionItem,
} from './findingSchema.js';

export interface GenerateInspectionSummaryInput {
  readonly inspectionId: string;
  readonly productName?: string;
  readonly category?: string;
  readonly inspectorName?: string;
  readonly evaluatedAt?: string;
  readonly assessments: readonly ComplianceAssessment[];
  readonly findings: readonly ExplainableFinding[];
  readonly qualityScore: InspectionQualityScoreBreakdown;
  readonly actionQueue: readonly InspectorActionItem[];
  readonly fusedPackage?: FusedEvidencePackage;
  readonly inspectorDecision?: InspectorDecision | null;
  readonly imageHashes?: ReadonlyArray<{ imageId: string; surface: string; hash: string }>;
}

export function generateInspectionSummary(
  input: GenerateInspectionSummaryInput
): InspectionSummaryReport {
  const {
    inspectionId,
    productName = 'Packaged Commodity',
    category = 'General Commodity',
    inspectorName = 'Authorized Inspector',
    evaluatedAt = new Date().toISOString(),
    assessments,
    qualityScore,
    actionQueue,
    fusedPackage,
    inspectorDecision,
    imageHashes = [],
  } = input;

  // 1. Calculate Authoritative Statutory Assessment Counts from Rule Engine
  let passCount = 0;
  let failCount = 0;
  let requiresVerificationCount = 0;
  let notApplicableCount = 0;
  let insufficientEvidenceCount = 0;

  assessments.forEach((a) => {
    switch (a.result) {
      case 'PASS':
        passCount++;
        break;
      case 'FAIL':
        failCount++;
        break;
      case 'REQUIRES_VERIFICATION':
        requiresVerificationCount++;
        break;
      case 'NOT_APPLICABLE':
        notApplicableCount++;
        break;
      case 'INSUFFICIENT_EVIDENCE':
        insufficientEvidenceCount++;
        break;
    }
  });

  // Overall system assessment determination
  let overallSystemStatus: ComplianceResult = 'PASS';
  if (failCount > 0) {
    overallSystemStatus = 'FAIL';
  } else if (requiresVerificationCount > 0) {
    overallSystemStatus = 'REQUIRES_VERIFICATION';
  } else if (insufficientEvidenceCount > 0) {
    overallSystemStatus = 'INSUFFICIENT_EVIDENCE';
  } else if (passCount === 0 && notApplicableCount > 0) {
    overallSystemStatus = 'NOT_APPLICABLE';
  }

  // 2. Unresolved conflicts
  const unresolvedConflictsCount = fusedPackage?.hasConflicts
    ? fusedPackage.conflictingFieldCount || 1
    : 0;

  // 3. Pending inspector actions
  const pendingInspectorActionsCount = actionQueue.filter((a) => !a.resolved).length;

  // 4. Inspector Final Decision (strictly separated from System Assessment)
  const inspectorFinalDecision: InspectionSummaryReport['inspectorFinalDecision'] =
    inspectorDecision && inspectorDecision.decision
      ? {
          status: 'DECIDED',
          decision: inspectorDecision.decision,
          decidedAt: inspectorDecision.decidedAt,
          inspectorNotes: inspectorDecision.summaryNotes,
        }
      : {
          status: 'PENDING_INSPECTOR_DECISION',
        };


  return {
    inspectionId,
    productName,
    category,
    inspectorName,
    evaluatedAt,
    evidenceQualityScore: qualityScore,
    systemAssessment: {
      overallStatus: overallSystemStatus,
      passCount,
      failCount,
      requiresVerificationCount,
      notApplicableCount,
      insufficientEvidenceCount,
      totalEvaluated: assessments.length,
    },
    inspectorFinalDecision,
    unresolvedConflictsCount,
    pendingInspectorActionsCount,
    evidenceIntegrityFingerprint: {
      algorithm: 'SHA-256',
      hashes: imageHashes,
      isIntegrityMechanism: true,
      notEncryptionNotice:
        'SHA-256 cryptographic digests verify evidence file integrity and tamper-evidence. This is a hashing and provenance verification mechanism, not data encryption.',
    },
  };
}

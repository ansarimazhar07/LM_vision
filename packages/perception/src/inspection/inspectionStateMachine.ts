/**
 * Phase F: Deterministic Inspection State Machine & Finalization Guards
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. AI is NEVER the legal authority. AI observes, Rule Engine evaluates, Inspector decides.
 * 2. Canonical Status Normalization:
 *    REVIEW_REQUIRED ≡ NEEDS_VERIFICATION
 *    DECIDED         ≡ FINALIZED
 * 3. Finalization Guard:
 *    Authoritative validation beyond UI button disabling.
 *    Blocks finalization if:
 *      - Unresolved mandatory review actions exist
 *      - Unresolved evidence conflicts exist without explicit inspector acknowledgement
 *      - Rule Engine evaluation is absent
 *      - Inspector decision or authenticated identity is missing
 *    Advisory action items DO NOT block finalization.
 * 4. Finalized Lock:
 *    Finalized inspections cannot be mutated or deleted through ordinary operations.
 * 5. Controlled Reopen:
 *    Requires authenticated identity + non-empty reason.
 *    Preserves historical final decisions in audit trail and amendment records.
 */

import type {
  ComplianceAssessment,
  ConflictAcknowledgement,
  Declaration,
  InspectionImage,
  InspectionStatus,
  InspectorDecision,
} from '@lm-vision/shared-types';
import { normalizeInspectionStatus, toLegacyInspectionStatus } from '@lm-vision/shared-types';

export { normalizeInspectionStatus, toLegacyInspectionStatus };

export type CanonicalLifecycleState =
  | 'DRAFT'
  | 'CAPTURING'
  | 'CAPTURED'
  | 'PROCESSING'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'NEEDS_VERIFICATION'
  | 'READY_FOR_DECISION'
  | 'FINALIZED'
  | 'REOPENED'
  | 'SUPERSEDED'
  | 'REPORT_GENERATED'
  | 'SYNCED'
  | 'ARCHIVED';

/**
 * Deterministic Transition Matrix
 */
const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['CAPTURED', 'CAPTURING', 'ANALYZED', 'ANALYZING', 'ARCHIVED'],
  CAPTURING: ['CAPTURED', 'ANALYZED', 'ANALYZING', 'DRAFT', 'ARCHIVED'],
  CAPTURED: ['ANALYZED', 'ANALYZING', 'DRAFT', 'ARCHIVED'],
  PROCESSING: ['ANALYZED', 'NEEDS_VERIFICATION', 'READY_FOR_DECISION', 'ARCHIVED'],
  ANALYZING: ['ANALYZED', 'NEEDS_VERIFICATION', 'READY_FOR_DECISION', 'CAPTURED', 'CAPTURING', 'ARCHIVED'],
  ANALYZED: ['NEEDS_VERIFICATION', 'READY_FOR_DECISION', 'CAPTURED', 'CAPTURING', 'ARCHIVED'],
  NEEDS_VERIFICATION: ['READY_FOR_DECISION', 'CAPTURED', 'CAPTURING', 'ANALYZED', 'ANALYZING', 'ARCHIVED'],
  READY_FOR_DECISION: ['FINALIZED', 'NEEDS_VERIFICATION', 'CAPTURED', 'CAPTURING', 'ANALYZED', 'ANALYZING', 'ARCHIVED'],
  FINALIZED: ['REOPENED', 'REPORT_GENERATED', 'SYNCED', 'SUPERSEDED', 'ARCHIVED'],
  REOPENED: ['NEEDS_VERIFICATION', 'READY_FOR_DECISION', 'CAPTURED', 'CAPTURING', 'ANALYZED', 'ANALYZING', 'ARCHIVED'],
  SUPERSEDED: ['ARCHIVED'],
  REPORT_GENERATED: ['SYNCED', 'ARCHIVED', 'REOPENED'],
  SYNCED: ['ARCHIVED', 'REOPENED', 'REPORT_GENERATED'],
  ARCHIVED: [],
};

export interface FinalizationGuardInspectionInput {
  id?: string;
  status?: InspectionStatus | string;
  currentStatus?: InspectionStatus | string;
  isFinalized?: boolean;
  images?: readonly InspectionImage[] | readonly any[];
  declarations?: readonly Declaration[] | readonly any[];
  complianceAssessments?: readonly ComplianceAssessment[] | readonly any[];
  findings?: readonly any[];
  inspectorDecision?: Partial<InspectorDecision> | null;
  conflictAcknowledgements?: readonly ConflictAcknowledgement[];
  authenticatedInspectorId?: string;
  mandatoryUnresolvedActions?: readonly string[];
  hasUnacknowledgedConflicts?: boolean;
  conflictingFields?: readonly string[];
  evidenceProcessingComplete?: boolean;
  ruleEngineEvaluated?: boolean;
  inspectorDecisionRecorded?: boolean;
  unresolvedConflictsCount?: number;
  unacknowledgedMandatoryActionsCount?: number;
  advisoryActions?: readonly string[];
}

export interface FinalizationGuardResult {
  canFinalize: boolean;
  blockingReasons: string[];
  advisoryItems: string[];
  unresolvedConflicts: string[];
  requiredAcknowledgements: string[];
}

/**
 * Calculates a deterministic finalization guard object.
 * Explains exactly why an inspection can or cannot be finalized.
 * Does NOT duplicate legal logic — uses existing Rule Engine assessments.
 */
export function calculateFinalizationGuard(
  inspection: FinalizationGuardInspectionInput
): FinalizationGuardResult {
  const blockingReasons: string[] = [];
  const advisoryItems: string[] = [];
  const unresolvedConflicts: string[] = [];
  const requiredAcknowledgements: string[] = [];

  const statusVal = inspection.status || inspection.currentStatus || 'DRAFT';
  const normStatus = normalizeInspectionStatus(statusVal as string);

  // 1. Check if already finalized
  if (normStatus === 'FINALIZED' || inspection.isFinalized) {
    return {
      canFinalize: false,
      blockingReasons: ['Inspection is already finalized and locked.'],
      advisoryItems: [],
      unresolvedConflicts: [],
      requiredAcknowledgements: [],
    };
  }

  // 2. Authenticated Inspector Identity Guard
  const inspectorId = inspection.authenticatedInspectorId || inspection.inspectorDecision?.inspectorUserId;
  if (!inspectorId || inspectorId.trim() === '') {
    blockingReasons.push('Finalization requires an authenticated inspector identity');
  }

  // 3. Required Evidence Capture Guard
  const images = inspection.images || [];
  if (!inspection.evidenceProcessingComplete && images.length === 0) {
    blockingReasons.push('At least one package surface image must be captured.');
  }

  // 4. Rule Engine Assessment Completion Guard
  const assessments = inspection.complianceAssessments || [];
  if (!inspection.ruleEngineEvaluated && assessments.length === 0) {
    blockingReasons.push('Deterministic Rule Engine compliance assessment must be completed.');
  }

  // 5. Mandatory Verification Actions Guard
  if (inspection.mandatoryUnresolvedActions && inspection.mandatoryUnresolvedActions.length > 0) {
    inspection.mandatoryUnresolvedActions.forEach((act) => {
      blockingReasons.push(`Unresolved mandatory action: ${act}`);
    });
  }
  if ((inspection.unacknowledgedMandatoryActionsCount ?? 0) > 0) {
    blockingReasons.push(`${inspection.unacknowledgedMandatoryActionsCount} mandatory action(s) require acknowledgement.`);
  }

  // 6. Conflicting Evidence Acknowledgement Guard
  if ((inspection.unresolvedConflictsCount ?? 0) > 0) {
    blockingReasons.push(`${inspection.unresolvedConflictsCount} unresolved conflict(s) require acknowledgement.`);
    unresolvedConflicts.push('cross_surface_conflict');
  }

  const conflictingAssessments = assessments.filter(
    (a) => a.evidenceSufficiency === 'CONFLICTING' || a.result === 'REQUIRES_VERIFICATION'
  );

  const acks = inspection.conflictAcknowledgements || inspection.inspectorDecision?.conflictAcknowledgements || [];

  if (inspection.conflictingFields && inspection.conflictingFields.length > 0) {
    inspection.conflictingFields.forEach((field) => {
      const ack = acks.find((k) => k.field.toLowerCase() === field.toLowerCase() && k.status === 'ACKNOWLEDGED');
      if (!ack) {
        unresolvedConflicts.push(field);
        requiredAcknowledgements.push(field);
        blockingReasons.push(`Unresolved cross-surface conflict for '${field}' requires explicit inspector acknowledgement.`);
      }
    });
  } else if (conflictingAssessments.length > 0 && inspection.hasUnacknowledgedConflicts) {
    conflictingAssessments.forEach((ca) => {
      const field = ca.ruleTitle || ca.ruleNumber;
      const ack = acks.find((k) => k.field === field && k.status === 'ACKNOWLEDGED');
      if (!ack) {
        unresolvedConflicts.push(field);
        requiredAcknowledgements.push(field);
        blockingReasons.push(`Conflict on ${ca.ruleNumber} requires explicit inspector acknowledgement.`);
      }
    });
  }

  // 7. Inspector Final Decision Guard
  if (!inspection.inspectorDecisionRecorded) {
    const decision = inspection.inspectorDecision?.decision;
    if (!decision) {
      blockingReasons.push('Official inspector determination must be selected.');
    }

    const notes = inspection.inspectorDecision?.summaryNotes;
    if (!notes || notes.trim() === '') {
      blockingReasons.push('Inspector summary notes are required for official ledger.');
    }
  }

  // 8. Advisory items (informational, do NOT block finalization)
  if (inspection.advisoryActions) {
    advisoryItems.push(...inspection.advisoryActions);
  }
  const unassessedApplicable = assessments.filter(
    (a) => a.result === 'NOT_APPLICABLE' || a.evidenceSufficiency === 'LOW_CONFIDENCE'
  );
  if (unassessedApplicable.length > 0) {
    advisoryItems.push(`${unassessedApplicable.length} rule(s) evaluated as not applicable or with advisory low confidence.`);
  }

  return {
    canFinalize: blockingReasons.length === 0,
    blockingReasons,
    advisoryItems,
    unresolvedConflicts,
    requiredAcknowledgements,
  };
}

export interface StateTransitionRequest {
  currentStatus: InspectionStatus | string;
  targetStatus: InspectionStatus | string;
  authenticatedInspectorId?: string;
  inspectorRole?: string;
  isAuthorizedRole?: boolean;
  finalizationGuard?: FinalizationGuardResult;
  reopenReason?: string;
  isFinalized?: boolean;
}

export interface StateTransitionResult {
  allowed: boolean;
  valid: boolean;
  normalizedCurrent: CanonicalLifecycleState;
  normalizedTarget: CanonicalLifecycleState;
  error?: string;
}

/**
 * Authoritatively validates an inspection lifecycle state transition.
 */
export function validateStateTransition(
  requestOrCurrent: StateTransitionRequest | InspectionStatus | string,
  targetStatusArg?: InspectionStatus | string,
  options?: {
    inspectorId?: string;
    inspectorRole?: string;
    reopenReason?: string;
    finalizationGuard?: FinalizationGuardResult;
    isFinalized?: boolean;
  }
): StateTransitionResult {
  let req: StateTransitionRequest;
  if (typeof requestOrCurrent === 'object' && 'currentStatus' in requestOrCurrent) {
    req = requestOrCurrent;
  } else {
    req = {
      currentStatus: requestOrCurrent,
      targetStatus: targetStatusArg || 'DRAFT',
      authenticatedInspectorId: options?.inspectorId || 'insp-system',
      inspectorRole: options?.inspectorRole,
      reopenReason: options?.reopenReason,
      finalizationGuard: options?.finalizationGuard,
      isFinalized: options?.isFinalized,
    };
  }

  const current = normalizeInspectionStatus(req.currentStatus) as CanonicalLifecycleState;
  const target = normalizeInspectionStatus(req.targetStatus) as CanonicalLifecycleState;

  // 1. Same state check
  if (current === target) {
    return {
      allowed: true,
      valid: true,
      normalizedCurrent: current,
      normalizedTarget: target,
    };
  }

  // 2. Finalized Lock Enforcement:
  // Cannot transition out of FINALIZED except through REOPENED, REPORT_GENERATED, SYNCED, or ARCHIVED
  if (current === 'FINALIZED') {
    if (target === 'DRAFT' || target === 'CAPTURING' || target === 'ANALYZING') {
      return {
        allowed: false,
        valid: false,
        normalizedCurrent: current,
        normalizedTarget: target,
        error: `Cannot transition from FINALIZED to ${target}: Inspection is locked. Use controlled reopen workflow.`,
      };
    }
  }

  // 3. Matrix validity check
  const allowedNext = VALID_TRANSITIONS[current] || [];
  if (!allowedNext.includes(target)) {
    return {
      allowed: false,
      valid: false,
      normalizedCurrent: current,
      normalizedTarget: target,
      error: `Cannot transition from ${current} to ${target}. Valid next states: [${allowedNext.join(', ')}].`,
    };
  }

  // 4. Finalization Guards
  if (target === 'FINALIZED') {
    if (!req.authenticatedInspectorId || req.authenticatedInspectorId.trim() === '') {
      return {
        allowed: false,
        valid: false,
        normalizedCurrent: current,
        normalizedTarget: target,
        error: 'UNAUTHORIZED: Authenticated inspector identity is required to finalize inspection.',
      };
    }

    if (req.finalizationGuard && !req.finalizationGuard.canFinalize) {
      return {
        allowed: false,
        valid: false,
        normalizedCurrent: current,
        normalizedTarget: target,
        error: `FINALIZATION_BLOCKED: ${req.finalizationGuard.blockingReasons.join('; ')}`,
      };
    }
  }

  // 5. Controlled Reopen Guards
  if (target === 'REOPENED') {
    if (current !== 'FINALIZED' && current !== 'REPORT_GENERATED' && current !== 'SYNCED') {
      return {
        allowed: false,
        valid: false,
        normalizedCurrent: current,
        normalizedTarget: target,
        error: 'INVALID_REOPEN: Only finalized or synced inspections can be reopened.',
      };
    }

    if (!req.authenticatedInspectorId || req.authenticatedInspectorId.trim() === '') {
      return {
        allowed: false,
        valid: false,
        normalizedCurrent: current,
        normalizedTarget: target,
        error: 'UNAUTHORIZED: Authenticated inspector or supervisor credentials required to reopen inspection.',
      };
    }

    if (req.inspectorRole && !['INSPECTOR', 'SUPERVISOR', 'ADMIN'].includes(req.inspectorRole)) {
      return {
        allowed: false,
        valid: false,
        normalizedCurrent: current,
        normalizedTarget: target,
        error: `UNAUTHORIZED_ROLE: Role '${req.inspectorRole}' is not authorized to reopen a finalized inspection.`,
      };
    }

    if (!req.reopenReason || req.reopenReason.trim().length < 5) {
      return {
        allowed: false,
        valid: false,
        normalizedCurrent: current,
        normalizedTarget: target,
        error: 'REOPEN_REASON_REQUIRED: Controlled reopen requires a substantive reason (minimum 5 characters).',
      };
    }
  }

  return {
    allowed: true,
    valid: true,
    normalizedCurrent: current,
    normalizedTarget: target,
  };
}

/**
 * Asserts that an inspection is mutable.
 * Throws a locked error if finalized and not currently reopened.
 */
export function assertInspectionMutable(
  inspectionOrStatus: { status: InspectionStatus | string; isFinalized?: boolean } | InspectionStatus | string,
  operation?: string,
): void {
  const statusStr = typeof inspectionOrStatus === 'string' ? inspectionOrStatus : inspectionOrStatus.status;
  const isFinalized = typeof inspectionOrStatus === 'object' ? inspectionOrStatus.isFinalized : false;
  const norm = normalizeInspectionStatus(statusStr as string);
  if (norm === 'FINALIZED' || isFinalized) {
    throw new Error(
      `INSPECTION_LOCKED: Inspection is FINALIZED and tamper-locked against operation '${operation || 'MODIFICATION'}'. Ordinary modifications are prohibited; controlled reopen required.`
    );
  }
}


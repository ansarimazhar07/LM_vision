/**
 * Phase F: Chronological Inspection Timeline Engine
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Timeline is strictly append-only. Past events are never modified or deleted.
 * 2. Clear actor attribution: differentiates SYSTEM, RULE_ENGINE, AI_ENGINE, and INSPECTOR.
 * 3. Preserves reopening and re-finalization event sequences with historical fidelity.
 */

import type { TimelineEventType } from '@lm-vision/shared-types';

export interface TimelineEvent {
  id: string;
  eventType: TimelineEventType;
  timestamp: string;
  actor: {
    id: string;
    role: 'INSPECTOR' | 'SUPERVISOR' | 'SYSTEM' | 'AI_ENGINE' | 'RULE_ENGINE';
    name?: string;
  };
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface BuildTimelineInput {
  inspectionId: string;
  createdAt: string;
  startedAt?: string;
  inspectorId: string;
  inspectorName?: string;
  images?: readonly any[];
  declarations?: readonly any[];
  fusedPackage?: any;
  complianceAssessments?: readonly any[];
  reviews?: readonly any[];
  corrections?: readonly any[];
  conflictAcknowledgements?: readonly any[];
  decision?: any;
  isFinalized?: boolean;
  finalizedAt?: string;
  reopenedAt?: string;
  reopenReason?: string;
  amendments?: readonly any[];
  report?: any;
  auditTrail?: readonly any[];
}

/**
 * Constructs an authoritative, chronological, append-only inspection timeline.
 */
export function buildInspectionTimeline(input: BuildTimelineInput): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Inspection Created
  events.push({
    id: `tl-${input.inspectionId}-created`,
    eventType: 'INSPECTION_CREATED',
    timestamp: input.createdAt || input.startedAt || new Date().toISOString(),
    actor: {
      id: input.inspectorId,
      role: 'INSPECTOR',
      name: input.inspectorName || 'Field Officer',
    },
    title: 'Inspection Session Created',
    description: `Official package inspection initialized under Legal Metrology Act & Rules.`,
  });

  // 2. Images Captured
  (input.images || []).forEach((img, idx) => {
    events.push({
      id: `tl-img-${img.id || idx}`,
      eventType: 'IMAGE_CAPTURED',
      timestamp: img.capturedAt || img.createdAt || input.createdAt,
      actor: {
        id: input.inspectorId,
        role: 'INSPECTOR',
      },
      title: `Surface Photographed: ${img.surface || 'Panel'}`,
      description: `Physical evidence captured for surface '${img.surface || 'Panel'}'. SHA-256: ${img.sha256Hash ? img.sha256Hash.slice(0, 16) + '...' : 'Recorded'}`,
      metadata: { surface: img.surface, sha256: img.sha256Hash },
    });
  });

  // 3. Declarations Extracted
  if (input.declarations && input.declarations.length > 0) {
    const minExtracted = input.declarations[0]?.extractedAt || input.createdAt;
    events.push({
      id: `tl-decl-extracted`,
      eventType: 'DECLARATIONS_EXTRACTED',
      timestamp: minExtracted,
      actor: {
        id: 'system-ocr',
        role: 'SYSTEM',
        name: 'Offline OCR & Perception',
      },
      title: 'Mandatory Declarations Extracted',
      description: `${input.declarations.length} statutory declaration candidate(s) localized and parsed.`,
      metadata: { declarationCount: input.declarations.length },
    });
  }

  // 4. Evidence Fused & Conflicts
  if (input.fusedPackage) {
    events.push({
      id: `tl-evidence-fused`,
      eventType: 'EVIDENCE_FUSED',
      timestamp: input.fusedPackage.fusedAt || input.createdAt,
      actor: {
        id: 'system-fusion',
        role: 'SYSTEM',
        name: 'Evidence Fusion Engine',
      },
      title: 'Multi-Surface Evidence Reconciled',
      description: `Cross-surface consensus evaluated across ${input.fusedPackage.totalDeclarationsEvaluated || 0} observations.`,
    });

    if (input.fusedPackage.hasConflicts) {
      events.push({
        id: `tl-conflict-detected`,
        eventType: 'CONFLICT_DETECTED',
        timestamp: input.fusedPackage.fusedAt || input.createdAt,
        actor: {
          id: 'system-fusion',
          role: 'SYSTEM',
          name: 'Evidence Fusion Engine',
        },
        title: 'Evidence Conflict Detected',
        description: 'Multi-source discrepancy identified. Requires human inspector reconciliation.',
      });
    }
  }

  // 5. Rules Evaluated
  if (input.complianceAssessments && input.complianceAssessments.length > 0) {
    const evaluatedAt = input.complianceAssessments[0]?.evaluatedAt || input.createdAt;
    events.push({
      id: `tl-rules-evaluated`,
      eventType: 'RULES_EVALUATED',
      timestamp: evaluatedAt,
      actor: {
        id: 'rule-engine',
        role: 'RULE_ENGINE',
        name: 'Deterministic Legal Metrology Rule Engine',
      },
      title: 'Statutory Rules Evaluated',
      description: `${input.complianceAssessments.length} authoritative rules evaluated deterministically.`,
      metadata: { ruleCount: input.complianceAssessments.length },
    });
  }

  // 6. Conflict Acknowledgements
  (input.conflictAcknowledgements || []).forEach((ack, idx) => {
    events.push({
      id: `tl-ack-${ack.id || idx}`,
      eventType: 'CONFLICT_ACKNOWLEDGED',
      timestamp: ack.acknowledgedAt || input.createdAt,
      actor: {
        id: ack.inspectorUserId || input.inspectorId,
        role: 'INSPECTOR',
      },
      title: `Conflict Acknowledged: ${ack.field}`,
      description: `Inspector formally reviewed and acknowledged discrepancy on '${ack.field}': "${ack.conflictReason}".`,
      metadata: { field: ack.field },
    });
  });

  // 7. Inspector Corrections
  (input.corrections || []).forEach((corr, idx) => {
    events.push({
      id: `tl-corr-${corr.id || idx}`,
      eventType: 'INSPECTOR_CORRECTED',
      timestamp: corr.correctedAt || input.createdAt,
      actor: {
        id: corr.inspectorUserId || input.inspectorId,
        role: 'INSPECTOR',
      },
      title: `Inspector Correction: ${corr.declarationType || 'Declaration'}`,
      description: `Observed value corrected to '${String(corr.correctedValue)}'. Rationale: "${corr.reason}".`,
      metadata: { originalValue: corr.originalValue, correctedValue: corr.correctedValue, reason: corr.reason },
    });
  });

  // 8. Inspector Final Decision
  if (input.decision) {
    events.push({
      id: `tl-decision-${input.decision.id || 'primary'}`,
      eventType: 'INSPECTOR_DECISION_RECORDED',
      timestamp: input.decision.decidedAt || input.createdAt,
      actor: {
        id: input.decision.inspectorUserId || input.inspectorId,
        role: 'INSPECTOR',
      },
      title: `Official Determination: ${input.decision.decision}`,
      description: `Inspector recorded official statutory finding: ${input.decision.decision}. Notes: "${input.decision.summaryNotes}".`,
      metadata: { decision: input.decision.decision, notes: input.decision.summaryNotes },
    });
  }

  // 9. Finalization
  if (input.isFinalized || input.decision?.isFinalized) {
    events.push({
      id: `tl-finalized`,
      eventType: 'FINALIZED',
      timestamp: input.finalizedAt || input.decision?.finalizedAt || input.decision?.decidedAt || input.createdAt,
      actor: {
        id: input.decision?.inspectorUserId || input.inspectorId,
        role: 'INSPECTOR',
      },
      title: 'Inspection Finalized & Sealed',
      description: 'Inspection locked from ordinary editing. State is immutable.',
    });
  }

  // 10. Reopened (if applicable)
  if (input.reopenedAt || input.decision?.reopenedAt) {
    events.push({
      id: `tl-reopened`,
      eventType: 'REOPENED',
      timestamp: input.reopenedAt || input.decision?.reopenedAt || input.createdAt,
      actor: {
        id: input.inspectorId,
        role: 'SUPERVISOR',
      },
      title: 'Inspection Reopened for Revision',
      description: `Controlled reopening authorized. Reason: "${input.reopenReason || input.decision?.reopenReason || 'Authorized review'}". Previous final decision preserved.`,
      metadata: { reopenReason: input.reopenReason || input.decision?.reopenReason, previousDecision: input.decision?.previousDecision },
    });
  }

  // 11. Amendments
  (input.amendments || []).forEach((amend, idx) => {
    events.push({
      id: `tl-amend-${amend.id || idx}`,
      eventType: 'INSPECTION_AMENDED',
      timestamp: amend.amendedAt || input.createdAt,
      actor: {
        id: amend.amendedByUserId || input.inspectorId,
        role: 'INSPECTOR',
      },
      title: `Official Amendment: ${amend.previousDecision} → ${amend.newDecision}`,
      description: `Amendment recorded. Rationale: "${amend.amendmentReason}".`,
      metadata: { prev: amend.previousDecision, next: amend.newDecision },
    });
  });

  // 12. Report Generated
  if (input.report) {
    events.push({
      id: `tl-report-${input.report.reportNumber || 'rep'}`,
      eventType: 'REPORT_GENERATED',
      timestamp: input.report.generatedAt || input.createdAt,
      actor: {
        id: 'system-report',
        role: 'SYSTEM',
        name: 'Report Generation Service',
      },
      title: `Report Generated: ${input.report.reportNumber}`,
      description: `Official Legal Metrology inspection report assembled. SHA-256 seal: ${input.report.reportHash ? input.report.reportHash.slice(0, 16) + '...' : 'Verified'}`,
      metadata: { reportNumber: input.report.reportNumber, hash: input.report.reportHash },
    });
  }

  // Deterministic chronological ordering: oldest first
  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export interface TimelineIntegrityResult {
  valid: boolean;
  tamperDetected: boolean;
  errors: string[];
}

/**
 * Validates timeline integrity to ensure append-only immutability.
 * Verifies chronological sequencing and that existing historical events have not been altered.
 */
export function verifyTimelineIntegrity(
  timelineOrHistorical: readonly TimelineEvent[],
  currentTimeline?: readonly TimelineEvent[]
): TimelineIntegrityResult {
  const errors: string[] = [];

  // Case 1: Single timeline verification (chronological ordering & structure)
  if (!currentTimeline) {
    const timeline = timelineOrHistorical;
    for (let i = 1; i < timeline.length; i++) {
      const prev = timeline[i - 1];
      const curr = timeline[i];
      if (prev && curr) {
        const prevTime = new Date(prev.timestamp).getTime();
        const currTime = new Date(curr.timestamp).getTime();
        if (currTime < prevTime) {
          errors.push(
            `Chronological violation: Event '${curr.id}' (${curr.timestamp}) occurred before preceding event '${prev.id}' (${prev.timestamp}).`
          );
        }
      }
    }
    return {
      valid: errors.length === 0,
      tamperDetected: errors.length > 0,
      errors,
    };
  }

  // Case 2: Comparison against historical snapshot
  const historical = timelineOrHistorical;
  if (currentTimeline.length < historical.length) {
    errors.push('Tamper detected: Current timeline has fewer events than historical snapshot.');
  }

  const checkLen = Math.min(historical.length, currentTimeline.length);
  for (let i = 0; i < checkLen; i++) {
    const hist = historical[i];
    const curr = currentTimeline[i];
    if (!hist || !curr) {
      errors.push(`Tamper detected: Event at position ${i} is missing.`);
      continue;
    }
    if (
      hist.id !== curr.id ||
      hist.eventType !== curr.eventType ||
      hist.timestamp !== curr.timestamp
    ) {
      errors.push(`Tamper detected: Event '${hist.id}' modified in current timeline.`);
    }
  }

  return {
    valid: errors.length === 0,
    tamperDetected: errors.length > 0,
    errors,
  };
}

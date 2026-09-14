/**
 * Phase F: Compliance Workspace & Rule-by-Rule Evidence Mapping
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. AI observes. OCR extracts. Evidence fuses. Rules evaluate. Inspector decides.
 * 2. Every statutory assessment is traceable to its physical evidence and surface.
 * 3. NO silent winner in conflicts: Front vs Neck conflicts preserve both observations.
 * 4. SEARCH_INCOMPLETE vs SEARCH_COMPLETED_NO_EVIDENCE are strictly distinguished.
 * 5. Re-inspection appends new evidence with provenance; NEVER overwrites previous captures.
 * 6. System Assessment and Inspector Final Decision are permanently kept separate.
 */

import type {
  ActionClass,
  ActionItemType,
  ComplianceAssessment,
  ComplianceResult,
  ConflictAcknowledgement,
  Declaration,
  DeclarationType,
  EvidenceSufficiency,
  FieldSearchStatus,
  InspectionImage,
  InspectorDecision,
  PackageSurface,
  Severity,
} from '@lm-vision/shared-types';
import type { FusedEvidencePackage, FusedFieldEvidence } from '../fusion/evidenceSchema.js';
import {
  calculateFinalizationGuard,
  type FinalizationGuardResult,
} from './inspectionStateMachine.js';

export interface RuleEvidenceSource {
  sourceId: string;
  surface: PackageSurface;
  fileUrl?: string;
  confidence: number;
  sourceType: string;
  rawText?: string;
  extractedAt?: string;
}

export interface RuleEvidenceMappingItem {
  ruleId: string;
  ruleNumber: string;
  subRule?: string;
  ruleTitle: string;
  requirementDescription: string;
  statutorySource: string;
  sourcePage?: number;
  declarationField?: DeclarationType | string;
  
  // Observed Evidence & Multi-Surface Provenance
  observedEvidence: {
    value: unknown;
    rawText?: string;
    unit?: string | null;
    searchStatus: FieldSearchStatus;
    evidenceStatus: 'AGREEMENT' | 'CONFLICT' | 'SINGLE_SOURCE' | 'NO_EVIDENCE' | 'INSPECTOR_CORRECTED';
    sources: RuleEvidenceSource[];
    conflictDetails?: {
      hasConflict: boolean;
      surfaces: PackageSurface[];
      differingValues: unknown[];
      reconciliationNotice: string;
    };
  };

  // Deterministic Rule Engine Assessment
  ruleEngineAssessment: {
    result: ComplianceResult;
    explanation: string;
    severity: Severity;
    evidenceSufficiency: EvidenceSufficiency;
    evaluatedAt: string;
  };

  // Inspector Action Status
  inspectorAction: {
    required: boolean;
    actionClass: ActionClass;
    status: 'PENDING' | 'VERIFIED' | 'CORRECTED' | 'ACKNOWLEDGED';
    suggestedAction: string;
    guidedReinspectionAdvice?: string;
  };

  // Human Correction Provenance (if corrected)
  inspectorCorrection?: {
    originalValue: unknown;
    correctedValue: unknown;
    inspectorId: string;
    reason: string;
    correctedAt: string;
  };
}

export interface WorkspaceActionItem {
  id: string;
  type: ActionItemType;
  actionClass: ActionClass;
  title: string;
  description: string;
  priority: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_ADVISORY';
  relatedRuleNumber?: string;
  relatedField?: DeclarationType | string;
  suggestedAction: string;
  guidedReinspectionPrompt?: string;
  targetSurface?: PackageSurface;
  resolved: boolean;
}

export interface ComplianceWorkspaceView {
  inspectionId: string;
  productName: string;
  category: string;
  
  // Surfaces and Evidence Summary
  capturedSurfaces: PackageSurface[];
  surfaceEvidenceCount: Record<PackageSurface, number>;
  
  // Rule-by-rule mappings
  mappings: RuleEvidenceMappingItem[];
  
  // Action Center Queue
  actions: WorkspaceActionItem[];
  mandatoryActionCount: number;
  advisoryActionCount: number;

  // Finalization Guard
  finalizationGuard: FinalizationGuardResult;

  // Separation of Authority
  systemAssessment: {
    overallResult: ComplianceResult;
    passCount: number;
    failCount: number;
    verificationRequiredCount: number;
    notApplicableCount: number;
    summaryText: string;
  };
  
  inspectorDecisionRecord?: {
    decision: string;
    summaryNotes: string;
    inspectorUserId: string;
    decidedAt: string;
    isFinalized: boolean;
    reopenedAt?: string;
    reopenReason?: string;
    previousDecision?: string;
  };

  conflictAcknowledgements: ConflictAcknowledgement[];
}

export interface BuildComplianceWorkspaceInput {
  inspectionId: string;
  productName?: string;
  category?: string;
  status?: string;
  images: readonly InspectionImage[] | readonly any[];
  declarations: readonly Declaration[] | readonly any[];
  assessments: readonly ComplianceAssessment[] | readonly any[];
  fusedPackage?: FusedEvidencePackage | null;
  conflictAcknowledgements?: readonly ConflictAcknowledgement[];
  corrections?: readonly any[];
  decision?: InspectorDecision | null;
  authenticatedInspectorId?: string;
}

/**
 * Builds the comprehensive Phase F Compliance Workspace View.
 */
export function buildComplianceWorkspace(
  input: BuildComplianceWorkspaceInput
): ComplianceWorkspaceView {
  const {
    inspectionId,
    productName = 'Packaged Commodity',
    category = 'COMMODITY',
    status = 'DRAFT',
    images = [],
    declarations = [],
    assessments = [],
    fusedPackage,
    conflictAcknowledgements = [],
    corrections = [],
    decision,
    authenticatedInspectorId,
  } = input;

  // 1. Gather captured surfaces
  const capturedSurfaces: PackageSurface[] = [];
  const surfaceEvidenceCount: Partial<Record<PackageSurface, number>> = {};

  images.forEach((img) => {
    const s = (img.surface || img.surfaceType || 'FRONT') as PackageSurface;
    if (!capturedSurfaces.includes(s)) capturedSurfaces.push(s);
    surfaceEvidenceCount[s] = (surfaceEvidenceCount[s] || 0) + 1;
  });

  // 2. Build Rule-by-Rule Mappings
  const mappings: RuleEvidenceMappingItem[] = assessments.map((assessment) => {
    // Associate declaration field based on rule number / title
    const ruleTitle = (assessment.ruleTitle || '').toUpperCase();
    const ruleNum = assessment.ruleNumber || '';
    let declarationField: DeclarationType | undefined;

    if (ruleTitle.includes('MANUFACTURER') || ruleTitle.includes('PACKER') || ruleTitle.includes('IMPORTER')) {
      declarationField = 'MANUFACTURER_NAME_ADDRESS';
    } else if (ruleTitle.includes('GENERIC NAME') || ruleTitle.includes('COMMODITY') || ruleTitle.includes('PRODUCT NAME')) {
      declarationField = 'GENERIC_NAME';
    } else if (ruleTitle.includes('NET QUANTITY') || ruleTitle.includes('WEIGHT') || ruleTitle.includes('VOLUME') || ruleTitle.includes('NUMERAL')) {
      declarationField = 'NET_QUANTITY';
    } else if (ruleTitle.includes('DATE') || ruleTitle.includes('MONTH AND YEAR') || ruleTitle.includes('MANUFACTURE') || ruleTitle.includes('PRE-PACKING')) {
      declarationField = 'DATE_OF_MANUFACTURE';
    } else if (ruleTitle.includes('MRP') || ruleTitle.includes('RETAIL PRICE') || ruleTitle.includes('SALE PRICE')) {
      declarationField = 'MRP';
    } else if (ruleTitle.includes('CONSUMER CARE') || ruleTitle.includes('COMPLAINT')) {
      declarationField = 'CONSUMER_CARE_DETAILS';
    } else if (ruleNum.includes('6(1)(a)')) {
      declarationField = 'GENERIC_NAME';
    } else if (ruleNum.includes('6(1)(b)')) {
      declarationField = 'MANUFACTURER_NAME_ADDRESS';
    } else if (ruleNum.includes('6(1)(c)')) {
      declarationField = 'NET_QUANTITY';
    } else if (ruleNum.includes('6(1)(d)')) {
      declarationField = 'DATE_OF_MANUFACTURE';
    } else if (ruleNum.includes('6(1)(e)')) {
      declarationField = 'MRP';
    } else if (ruleNum.includes('6(2)') || ruleNum.includes('6(1)(f)')) {
      declarationField = 'CONSUMER_CARE_DETAILS';
    } else if (ruleNum.includes('18')) {
      declarationField = 'MRP';
    }

    // Find declarations matching this field or rule
    const matchingDeclarations = declarations.filter((d) => {
      if (declarationField && (d.type === declarationField || d.field === `declarations.${declarationField}`)) return true;
      if ((declarationField === 'MANUFACTURER_NAME_ADDRESS' || ruleNum.includes('6(1)(a)') || ruleNum.includes('6(1)(b)')) && (d.type === 'PACKER_NAME_ADDRESS' || d.type === 'IMPORTER_NAME_ADDRESS' || d.type === 'MANUFACTURER_NAME_ADDRESS' || d.field === 'declarations.MANUFACTURER_NAME_ADDRESS')) return true;
      if ((declarationField === 'DATE_OF_MANUFACTURE' || ruleNum.includes('6(1)(d)')) && (d.type === 'DATE_OF_PACKAGING' || d.type === 'DATE_OF_IMPORT' || d.type === 'DATE_OF_MANUFACTURE' || d.field === 'declarations.DATE_OF_PACKAGING')) return true;
      if (d.ruleReference && d.ruleReference.includes(ruleNum)) return true;
      return false;
    });

    // Extract sources across surfaces
    const sources: RuleEvidenceSource[] = [];
    matchingDeclarations.forEach((d) => {
      const surface = (d.surface || d.surfaceType || 'FRONT') as PackageSurface;
      const img = images.find((i) => i.id === d.imageId || i.surface === surface);
      sources.push({
        sourceId: d.id,
        surface,
        fileUrl: img?.fileUrl,
        confidence: typeof d.confidence === 'number' ? d.confidence : 1.0,
        sourceType: (d as any).source || 'LOCAL_OCR',
        rawText: d.rawText || d.declaredValue,
        extractedAt: d.extractedAt || (d as any).createdAt,
      });
    });

    // Check Fused Package for cross-surface agreement / conflict
    const fusedField: FusedFieldEvidence | undefined = declarationField && fusedPackage?.fields
      ? fusedPackage.fields[declarationField]
      : undefined;

    let evidenceStatus: RuleEvidenceMappingItem['observedEvidence']['evidenceStatus'] = 'NO_EVIDENCE';
    let searchStatus: FieldSearchStatus = 'SEARCH_INCOMPLETE';
    let conflictDetails: RuleEvidenceMappingItem['observedEvidence']['conflictDetails'] | undefined;

    if (fusedField) {
      if (fusedField.inspectorCorrection || fusedField.evidenceStatus === 'INSPECTOR_CONFIRMED') {
        evidenceStatus = 'INSPECTOR_CORRECTED';
        searchStatus = 'INSPECTOR_CONFIRMED';
      } else if (fusedField.evidenceStatus === 'CONFLICT') {
        evidenceStatus = 'CONFLICT';
        searchStatus = 'CONFLICT';
        const anyField = fusedField as any;
        const differingValues = (anyField.sources && Array.isArray(anyField.sources))
          ? anyField.sources.map((s: any) => s.value)
          : (anyField.crossSurfaceConflict?.values ?? []);
        const conflictSurfaces = (anyField.crossSurfaceConflict?.surfaces && anyField.crossSurfaceConflict.surfaces.length > 0)
          ? anyField.crossSurfaceConflict.surfaces
          : (sources.length > 0 ? sources.map((s) => s.surface) : ['FRONT', 'NECK']);
        conflictDetails = {
          hasConflict: true,
          surfaces: conflictSurfaces,
          differingValues,
          reconciliationNotice: anyField.crossSurfaceConflict?.explanation ?? `Cross-surface discrepancy: Multiple conflicting readings observed. Authoritative review required.`,
        };
      } else if (fusedField.evidenceStatus === 'AGREEMENT') {
        evidenceStatus = 'AGREEMENT';
        searchStatus = 'FOUND';
      } else if (fusedField.evidenceStatus === 'PARTIAL') {
        evidenceStatus = sources.length > 1 ? 'AGREEMENT' : 'SINGLE_SOURCE';
        searchStatus = 'FOUND';
      } else if (fusedField.evidenceStatus === 'INSUFFICIENT') {
        evidenceStatus = 'NO_EVIDENCE';
        searchStatus = capturedSurfaces.length >= 3 ? 'SEARCH_COMPLETED_NO_EVIDENCE' : 'SEARCH_INCOMPLETE';
      }
    } else if (sources.length > 0) {
      evidenceStatus = sources.length > 1 ? 'AGREEMENT' : 'SINGLE_SOURCE';
      searchStatus = 'FOUND';
    } else {
      evidenceStatus = 'NO_EVIDENCE';
      searchStatus = capturedSurfaces.length >= 3 ? 'SEARCH_COMPLETED_NO_EVIDENCE' : 'SEARCH_INCOMPLETE';
    }

    // Check for correction
    const correction = corrections.find(
      (c) => c.assessmentId === assessment.id || (declarationField && c.declarationType === declarationField)
    );
    if (correction) {
      evidenceStatus = 'INSPECTOR_CORRECTED';
      searchStatus = 'INSPECTOR_CONFIRMED';
    }

    // Check for conflict acknowledgement
    const ack = conflictAcknowledgements.find(
      (a) => a.field === (declarationField || assessment.ruleNumber) && a.status === 'ACKNOWLEDGED'
    );

    // Inspector Action Determination
    let actionRequired = false;
    let actionClass: ActionClass = 'ADVISORY';
    let actionStatus: RuleEvidenceMappingItem['inspectorAction']['status'] = 'VERIFIED';
    let suggestedAction = 'Rule verified satisfactory.';
    let guidedReinspectionAdvice: string | undefined;

    if (correction) {
      actionStatus = 'CORRECTED';
      suggestedAction = 'Inspector corrected evidence observation recorded.';
    } else if (evidenceStatus === 'CONFLICT') {
      actionRequired = true;
      actionClass = 'MANDATORY';
      actionStatus = ack ? 'ACKNOWLEDGED' : 'PENDING';
      suggestedAction = ack
        ? 'Conflict acknowledged by inspector. Proceed to final determination.'
        : 'Review conflicting readings across captured surfaces and confirm authoritative value.';
      guidedReinspectionAdvice = 'Capture an additional well-lit photograph of the panel or enter a human correction.';
    } else if (assessment.result === 'REQUIRES_VERIFICATION') {
      actionRequired = true;
      actionClass = 'MANDATORY';
      actionStatus = 'PENDING';
      suggestedAction = assessment.explanation || 'Statutory condition requires manual inspector verification.';
      if (declarationField === 'MRP' && !capturedSurfaces.includes('NECK') && !capturedSurfaces.includes('CAP')) {
        guidedReinspectionAdvice = 'MRP not detected on currently captured surfaces. Capture the bottle neck or cap.';
      } else if (declarationField === 'DATE_OF_MANUFACTURE' && !capturedSurfaces.includes('CRIMP') && !capturedSurfaces.includes('SHOULDER')) {
        guidedReinspectionAdvice = 'Date marking unresolved. Capture shoulder/neck/crimp area.';
      }
    } else if (evidenceStatus === 'NO_EVIDENCE') {
      actionRequired = true;
      actionClass = assessment.result === 'NOT_APPLICABLE' ? 'ADVISORY' : 'MANDATORY';
      actionStatus = 'PENDING';
      if (searchStatus === 'SEARCH_INCOMPLETE') {
        suggestedAction = `Declaration not detected on currently captured surfaces. Capture remaining surfaces.`;
        if (declarationField === 'MRP') {
          guidedReinspectionAdvice = 'Capture the bottle neck, cap, or base.';
        } else if (declarationField === 'DATE_OF_MANUFACTURE') {
          guidedReinspectionAdvice = 'Capture the shoulder, seal, or crimp marking.';
        }
      } else {
        suggestedAction = `Declaration not detected after searching all applicable surfaces.`;
      }
    }

    return {
      ruleId: assessment.ruleId,
      ruleNumber: assessment.ruleNumber,
      subRule: assessment.subRule,
      ruleTitle: assessment.ruleTitle,
      requirementDescription: assessment.requirementDescription || assessment.ruleTitle,
      statutorySource: assessment.statutorySource || 'Legal Metrology (Packaged Commodities) Rules, 2011',
      sourcePage: assessment.sourcePage,
      declarationField,
      observedEvidence: {
        value: correction ? correction.correctedValue : (assessment.observedValue ?? fusedField?.fusedValue ?? '—'),
        rawText: sources[0]?.rawText,
        unit: assessment.observedUnit,
        searchStatus,
        evidenceStatus,
        sources,
        conflictDetails,
      },
      ruleEngineAssessment: {
        result: assessment.result,
        explanation: assessment.explanation,
        severity: assessment.severity,
        evidenceSufficiency: assessment.evidenceSufficiency,
        evaluatedAt: assessment.evaluatedAt,
      },
      inspectorAction: {
        required: actionRequired,
        actionClass,
        status: actionStatus,
        suggestedAction,
        guidedReinspectionAdvice,
      },
      inspectorCorrection: correction
        ? {
            originalValue: correction.originalValue,
            correctedValue: correction.correctedValue,
            inspectorId: correction.inspectorUserId,
            reason: correction.reason,
            correctedAt: correction.correctedAt,
          }
        : undefined,
    };
  });

  // 3. Build Action Center Queue
  const actions: WorkspaceActionItem[] = [];

  mappings.forEach((m, idx) => {
    if (m.observedEvidence.evidenceStatus === 'CONFLICT') {
      const ack = conflictAcknowledgements.find((a) => a.field === (m.declarationField || m.ruleNumber));
      actions.push({
        id: `act-conflict-${idx}`,
        type: 'CONFLICT_REQUIRES_VERIFICATION',
        actionClass: 'MANDATORY',
        title: `Evidence Conflict: ${m.ruleTitle}`,
        description: `Conflicting evidence detected across physical surfaces for ${m.ruleNumber}.`,
        priority: 'P1_CRITICAL',
        relatedRuleNumber: m.ruleNumber,
        relatedField: m.declarationField,
        suggestedAction: m.inspectorAction.suggestedAction,
        guidedReinspectionPrompt: m.inspectorAction.guidedReinspectionAdvice,
        resolved: Boolean(ack || m.inspectorCorrection),
      });
    } else if (m.inspectorAction.required && m.inspectorAction.actionClass === 'MANDATORY') {
      actions.push({
        id: `act-verify-${idx}`,
        type: m.observedEvidence.searchStatus === 'SEARCH_INCOMPLETE'
          ? 'SEARCH_INCOMPLETE'
          : 'INSPECTOR_CORRECTION_REQUIRED',
        actionClass: 'MANDATORY',
        title: `Mandatory Verification: ${m.ruleTitle}`,
        description: m.ruleEngineAssessment.explanation,
        priority: 'P2_HIGH',
        relatedRuleNumber: m.ruleNumber,
        relatedField: m.declarationField,
        suggestedAction: m.inspectorAction.suggestedAction,
        guidedReinspectionPrompt: m.inspectorAction.guidedReinspectionAdvice,
        resolved: m.inspectorAction.status === 'VERIFIED' || m.inspectorAction.status === 'CORRECTED',
      });
    } else if (m.inspectorAction.required && m.inspectorAction.actionClass === 'ADVISORY') {
      actions.push({
        id: `act-advisory-${idx}`,
        type: 'REVIEW_RECOMMENDED',
        actionClass: 'ADVISORY',
        title: `Advisory Review: ${m.ruleTitle}`,
        description: m.inspectorAction.suggestedAction,
        priority: 'P3_ADVISORY',
        relatedRuleNumber: m.ruleNumber,
        relatedField: m.declarationField,
        suggestedAction: m.inspectorAction.suggestedAction,
        guidedReinspectionPrompt: m.inspectorAction.guidedReinspectionAdvice,
        resolved: false,
      });
    }
  });

  // Check image quality issues for action queue
  images.forEach((img, idx) => {
    if (img.quality?.glareDetected) {
      actions.push({
        id: `act-glare-${idx}`,
        type: 'IMAGE_QUALITY_ISSUE',
        actionClass: 'ADVISORY',
        title: `Specular Glare on ${img.surface || 'Panel'}`,
        description: 'Specular reflection detected. Ensure text under glare is readable or retake photo.',
        priority: 'P3_ADVISORY',
        targetSurface: img.surface,
        suggestedAction: 'Angle package away from direct glare if needed.',
        resolved: false,
      });
    }
    if (img.quality?.blurDetected) {
      actions.push({
        id: `act-blur-${idx}`,
        type: 'LOW_EVIDENCE_QUALITY',
        actionClass: 'ADVISORY',
        title: `Motion Blur on ${img.surface || 'Panel'}`,
        description: 'Photographic sharpness is sub-optimal.',
        priority: 'P3_ADVISORY',
        targetSurface: img.surface,
        suggestedAction: 'Hold device steady and recapture if declarations are obscured.',
        resolved: false,
      });
    }
  });

  const mandatoryActionCount = actions.filter((a) => a.actionClass === 'MANDATORY' && !a.resolved).length;
  const advisoryActionCount = actions.filter((a) => a.actionClass === 'ADVISORY' && !a.resolved).length;

  // 4. Calculate Finalization Guard
  const conflictingFields = mappings
    .filter((m) => m.observedEvidence.evidenceStatus === 'CONFLICT')
    .map((m) => String(m.declarationField || m.ruleNumber));

  const unresolvedMandatoryList = actions
    .filter((a) => a.actionClass === 'MANDATORY' && !a.resolved)
    .map((a) => a.title);

  const finalizationGuard = calculateFinalizationGuard({
    id: inspectionId,
    status,
    images,
    declarations,
    complianceAssessments: assessments,
    inspectorDecision: decision,
    conflictAcknowledgements,
    authenticatedInspectorId,
    mandatoryUnresolvedActions: unresolvedMandatoryList,
    conflictingFields,
  });

  // 5. Separate System Assessment from Inspector Decision
  let passCount = 0;
  let failCount = 0;
  let verificationRequiredCount = 0;
  let notApplicableCount = 0;

  assessments.forEach((a) => {
    if (a.result === 'PASS') passCount++;
    else if (a.result === 'FAIL') failCount++;
    else if (a.result === 'REQUIRES_VERIFICATION') verificationRequiredCount++;
    else if (a.result === 'NOT_APPLICABLE') notApplicableCount++;
  });

  const overallSystemResult: ComplianceResult =
    failCount > 0
      ? 'FAIL'
      : verificationRequiredCount > 0
      ? 'REQUIRES_VERIFICATION'
      : passCount > 0
      ? 'PASS'
      : 'INSUFFICIENT_EVIDENCE';

  const systemAssessment = {
    overallResult: overallSystemResult,
    passCount,
    failCount,
    verificationRequiredCount,
    notApplicableCount,
    summaryText: `Deterministic Rule Engine evaluated ${assessments.length} statutory conditions: ${passCount} Passed, ${failCount} Violations, ${verificationRequiredCount} Verification Required.`,
  };

  const inspectorDecisionRecord = decision
    ? {
        decision: decision.decision,
        summaryNotes: decision.summaryNotes,
        inspectorUserId: decision.inspectorUserId,
        decidedAt: decision.decidedAt,
        isFinalized: Boolean(decision.isFinalized),
        reopenedAt: decision.reopenedAt,
        reopenReason: decision.reopenReason,
        previousDecision: decision.previousDecision,
      }
    : undefined;

  return {
    inspectionId,
    productName,
    category,
    capturedSurfaces,
    surfaceEvidenceCount: surfaceEvidenceCount as Record<PackageSurface, number>,
    mappings,
    actions,
    mandatoryActionCount,
    advisoryActionCount,
    finalizationGuard,
    systemAssessment,
    inspectorDecisionRecord,
    conflictAcknowledgements: [...conflictAcknowledgements],
  };
}

/**
 * Phase E: Deterministic Finding Explanation Engine
 *
 * ARCHITECTURAL GUARDRAILS & INVARIANTS:
 * 1. AI MUST NEVER become the legal decision-maker.
 * 2. Zero LLM calls for statutory explanations — 100% deterministic template generation.
 * 3. EXPLANATIONS MUST NOT BECOME A SECOND RULE ENGINE:
 *    Consumes existing Rule metadata + Rule Engine assessment result directly.
 *    Does NOT re-evaluate legal thresholds or duplicate statutory rules.
 * 4. Explains BOTH PASS and FAIL for all evaluated rules.
 * 5. Explains CONFLICTS with exact source values preserved (Local OCR vs Gemini).
 *    Never silently picks a winner; never labels a conflict an automatic violation.
 * 6. Explains INSUFFICIENT EVIDENCE: what could not be established, what was missing,
 *    and suggested capture action. Never guesses or hallucinates a value.
 * 7. Inspector corrections highlight human confirmation while preserving all source evidence.
 */

import type {
  ComplianceAssessment,
  Declaration,
  DeclarationType,
  Evidence,
  Finding,
} from '@lm-vision/shared-types';
import type {
  EvidenceSourceType,
  EvidenceStatus,
  FusedEvidencePackage,
  FusedFieldEvidence,
} from '../fusion/evidenceSchema.js';
import type {
  ExplainableFinding,
  FindingConflictDetail,
  FindingEvidenceUsage,
} from './findingSchema.js';

export interface GenerateExplainableFindingsInput {
  readonly inspectionId: string;
  readonly assessments: readonly ComplianceAssessment[];
  readonly fusedPackage?: FusedEvidencePackage;
  readonly declarations?: readonly Declaration[];
  readonly evidence?: readonly Evidence[];
  readonly findings?: readonly Finding[];
}

/**
 * Maps a declaration type to human-readable label.
 */
function getFieldLabel(type?: DeclarationType | string): string {
  switch (type) {
    case 'MRP':
      return 'Maximum Retail Price (MRP)';
    case 'NET_QUANTITY':
      return 'Net Quantity';
    case 'MANUFACTURER_NAME_ADDRESS':
      return 'Manufacturer / Packer / Importer Details';
    case 'DATE_OF_PACKAGING':
    case 'DATE_OF_MANUFACTURE':
    case 'EXPIRY_DATE':
      return 'Date Marking';
    case 'CONSUMER_CARE_DETAILS':
      return 'Consumer Care Helpline';
    case 'COUNTRY_OF_ORIGIN':
      return 'Country of Origin';
    case 'GENERIC_NAME':
      return 'Generic Name of Commodity';
    case 'BATCH_NUMBER':
      return 'Batch / Lot Number';
    default:
      return type ? String(type).replace(/_/g, ' ') : 'Statutory Declaration';
  }
}

/**
 * Generates deterministic explainable findings for all evaluated compliance assessments.
 */
export function generateExplainableFindings(
  input: GenerateExplainableFindingsInput
): ExplainableFinding[] {
  const { inspectionId, assessments, fusedPackage, declarations, evidence: _evidence } = input;

  return assessments.map((assessment) => {

    // 1. Resolve relevant declaration field from assessment metadata
    const fieldType = extractDeclarationTypeFromAssessment(assessment);

    // 2. Resolve fused evidence for this area
    const fusedField: FusedFieldEvidence | undefined = fieldType && fusedPackage
      ? fusedPackage.fields[fieldType]
      : undefined;

    // 3. Collect evidence items used
    const evidenceUsed: FindingEvidenceUsage[] = [];
    let primarySource: EvidenceSourceType | string = 'LOCAL_OCR';
    let evidenceStatus: EvidenceStatus = 'AGREEMENT';

    if (fusedField) {
      primarySource = fusedField.primarySource;
      evidenceStatus = fusedField.evidenceStatus;

      fusedField.sources.forEach((src) => {
        evidenceUsed.push({
          field: fieldType,
          value: src.value,
          rawText: src.rawText,
          unit: src.unit,
          source: src.sourceType,
          confidence: typeof src.nativeConfidence === 'number' ? src.nativeConfidence : 0.9,
          boundingBox: src.boundingBox,
        });
      });
    } else {
      // Fallback to declarations matching this field
      const matchingDecls = declarations?.filter((d) => d.type === fieldType) || [];
      matchingDecls.forEach((d) => {
        evidenceUsed.push({
          field: d.type,
          value: d.normalizedValue ?? d.rawText,
          rawText: d.rawText,
          unit: d.unit,
          source: (d as any).source || 'LOCAL_OCR',
          confidence: d.confidence ?? 0.9,
          boundingBox: d.region?.boundingBox,
        });
      });
    }

    // 4. Resolve Conflict Details if Phase D identified a conflict
    let conflictDetails: FindingConflictDetail | undefined;
    if (fusedField && (fusedField.evidenceStatus === 'CONFLICT' || fusedField.isAmbiguous)) {
      const localSource = fusedField.sources.find((s) => s.sourceType.startsWith('LOCAL'));
      const aiSource = fusedField.sources.find((s) => s.sourceType === 'GEMINI' || s.sourceType === 'OPENAI');

      conflictDetails = {
        hasConflict: true,
        localOcrValue: localSource?.value,
        aiObservationValue: aiSource?.value,
        sources: fusedField.sources.map((s) => ({
          source: s.sourceType,
          value: s.value,
          rawText: s.rawText,
          confidence: s.nativeConfidence ?? undefined,
        })),
        conflictExplanation: fusedField.discrepancyReason ||
          `Multi-source evidence discrepancy: Local OCR observed ${String(localSource?.value ?? 'N/A')} whereas Cloud AI observed ${String(aiSource?.value ?? 'N/A')}. The system could not safely reconcile these observations. Inspector verification is required.`,
        requiresInspectorResolution: true,
      };
    }

    // 5. Resolve Insufficient Evidence Details
    let insufficientEvidenceDetails: ExplainableFinding['insufficientEvidenceDetails'];
    if (assessment.result === 'INSUFFICIENT_EVIDENCE' || assessment.evidenceSufficiency === 'INSUFFICIENT') {
      insufficientEvidenceDetails = {
        missingAspect: `Physical evidence for ${assessment.ruleTitle} could not be established from current images.`,
        suggestedCaptureAction: getSuggestedCaptureAction(fieldType, assessment.ruleNumber),
      };
    }

    // 6. Build Deterministic Plain-Language Explanation
    const explanation = buildDeterministicExplanation({
      assessment,
      fieldType,
      fusedField,
      conflictDetails,
      insufficientDetails: insufficientEvidenceDetails,
    });

    // 7. Determine Inspector Action Requirement & Suggested Action
    const inspectorActionRequired =
      assessment.result === 'FAIL' ||
      assessment.result === 'REQUIRES_VERIFICATION' ||
      assessment.result === 'INSUFFICIENT_EVIDENCE' ||
      evidenceStatus === 'CONFLICT';

    const suggestedInspectorAction = buildSuggestedInspectorAction({
      assessment,
      evidenceStatus,
      hasConflict: Boolean(conflictDetails?.hasConflict),
      insufficientAction: insufficientEvidenceDetails?.suggestedCaptureAction,
    });

    return {
      id: assessment.id,
      inspectionId,
      ruleId: assessment.ruleId,
      ruleNumber: assessment.ruleNumber,
      subRule: assessment.subRule,
      ruleTitle: assessment.ruleTitle,
      ruleCitation: assessment.ruleSource?.gazetteNotificationNumber
        ? `${assessment.ruleSource.gazetteNotificationNumber} - Rule ${assessment.ruleNumber}`
        : `Rule ${assessment.ruleNumber}`,
      statutoryRequirement: getStatutoryRequirementDescription(assessment),
      legalAssessment: assessment.result,
      severity: assessment.severity,
      observedValue: assessment.observedValue,
      expectedConstraint: assessment.expectedConstraint,
      deviation: assessment.deviation,
      evidenceUsed,
      evidenceStatus,
      primarySource,
      explanation,
      confidence: assessment.confidence ?? 0.9,
      inspectorActionRequired,
      suggestedInspectorAction,
      conflictDetails,
      insufficientEvidenceDetails,
      inspectorCorrection: fusedField?.inspectorCorrection,
      evidenceIds: assessment.evidenceIds || [],
      targetRegionId: assessment.declarationIds?.[0],
      evaluatedAt: assessment.evaluatedAt,
    };
  });
}

/**
 * Extracts declaration type from assessment rule title or ruleNumber.
 */
function extractDeclarationTypeFromAssessment(
  assessment: ComplianceAssessment
): DeclarationType | undefined {
  const title = (assessment.ruleTitle || '').toUpperCase();
  const num = assessment.ruleNumber || '';

  // 1. Check title first (explicit semantic intent)
  if (title.includes('NET QUANTITY') || title.includes('WEIGHT') || title.includes('VOLUME') || title.includes('NUMERAL')) return 'NET_QUANTITY';
  if (title.includes('MANUFACTURER') || title.includes('PACKER') || title.includes('IMPORTER')) return 'MANUFACTURER_NAME_ADDRESS';
  if (title.includes('GENERIC NAME') || title.includes('COMMODITY')) return 'GENERIC_NAME';
  if (title.includes('DATE') || title.includes('MONTH AND YEAR') || title.includes('MANUFACTURE') || title.includes('PRE-PACKING')) return 'DATE_OF_PACKAGING';
  if (title.includes('MRP') || title.includes('MAXIMUM RETAIL PRICE') || title.includes('SALE PRICE')) return 'MRP';
  if (title.includes('CONSUMER CARE') || title.includes('COMPLAINT')) return 'CONSUMER_CARE_DETAILS';
  if (title.includes('COUNTRY OF ORIGIN')) return 'COUNTRY_OF_ORIGIN';

  // 2. Fallback to rule number (authoritative GSR 202(E) numbering)
  if (num.includes('6(1)(a)')) return 'GENERIC_NAME';
  if (num.includes('6(1)(b)')) return 'MANUFACTURER_NAME_ADDRESS';
  if (num.includes('6(1)(c)')) return 'NET_QUANTITY';
  if (num.includes('6(1)(d)')) return 'DATE_OF_PACKAGING';
  if (num.includes('6(1)(e)')) return 'MRP';
  if (num.includes('6(2)') || num.includes('6(1)(f)')) return 'CONSUMER_CARE_DETAILS';
  if (num.includes('18')) return 'MRP';
  if (num.includes('7(2)')) return 'NET_QUANTITY';
  return undefined;
}

/**
 * Returns plain-language statutory requirement description based on Rule Engine metadata.
 */
function getStatutoryRequirementDescription(assessment: ComplianceAssessment): string {
  const num = assessment.ruleNumber || '';
  if (num.includes('6(1)(a)')) {
    return 'Complete name and physical address of the manufacturer, packer, or importer must be clearly declared on the package.';
  }
  if (num.includes('6(1)(b)')) {
    return 'Generic or common name identifying the packaged commodity must be conspicuously declared on the package.';
  }
  if (num.includes('6(1)(c)')) {
    return 'Net quantity must be declared in standard metric units of mass (g, kg), volume (ml, l), length (cm, m), or number (count).';
  }
  if (num.includes('6(1)(d)')) {
    return 'Month and year of manufacture, packaging, or pre-packing must be declared on every packaged commodity.';
  }
  if (num.includes('6(1)(e)')) {
    return 'Retail sale price (MRP) must be clearly stated including all taxes in the prescribed format: "Maximum or Max. retail price inclusive of all taxes".';
  }
  if (num.includes('6(2)')) {
    return 'Name, address, telephone number, and email address of the person or office to be contacted in case of consumer complaints must be declared.';
  }
  if (num.includes('7(2)')) {
    return 'Height of numerals stating net quantity on the principal display panel must meet statutory minimum height thresholds specified in Table I.';
  }
  if (num.includes('18')) {
    return 'No retail dealer or other person shall sell any packaged commodity at a price exceeding the maximum retail price declared on the package.';
  }
  return assessment.ruleTitle || 'Statutory requirement under Legal Metrology (Packaged Commodities) Rules, 2011.';
}

/**
 * Builds deterministic plain-language explanation for all outcomes (PASS, FAIL, VERIFY, INSUFFICIENT).
 */
function buildDeterministicExplanation(params: {
  assessment: ComplianceAssessment;
  fieldType?: DeclarationType;
  fusedField?: FusedFieldEvidence;
  conflictDetails?: FindingConflictDetail;
  insufficientDetails?: { missingAspect: string };
}): string {
  const { assessment, fieldType, fusedField, conflictDetails, insufficientDetails } = params;
  const label = getFieldLabel(fieldType);

  // If inspector corrected/confirmed
  if (fusedField?.inspectorCorrection) {
    return `Inspector confirmed: ${String(fusedField.inspectorCorrection.correctedCandidate)}. Source observations (OCR: ${String(fusedField.sources.find((s) => s.sourceType.startsWith('LOCAL'))?.value ?? 'N/A')}, AI: ${String(fusedField.sources.find((s) => s.sourceType === 'GEMINI' || s.sourceType === 'OPENAI')?.value ?? 'N/A')}) were reconciled by the inspector under statutory authority.`;
  }

  // If evidence conflict exists
  if (conflictDetails?.hasConflict) {
    return `⚠ Evidence Conflict: Local OCR observed ${String(conflictDetails.localOcrValue ?? 'N/A')} whereas Cloud AI observed ${String(conflictDetails.aiObservationValue ?? 'N/A')}. The system could not safely reconcile these multi-source observations. Required action: Inspector manual verification.`;
  }

  // Insufficient evidence
  if (assessment.result === 'INSUFFICIENT_EVIDENCE' || assessment.evidenceSufficiency === 'INSUFFICIENT') {
    const detail = insufficientDetails?.missingAspect ? ` ${insufficientDetails.missingAspect}` : '';
    return `The package evidence does not provide sufficient data to reliably assess compliance with ${assessment.ruleTitle} (Rule ${assessment.ruleNumber}).${detail} ${assessment.explanation}`;
  }


  // PASS
  if (assessment.result === 'PASS') {
    const observed = assessment.observedValue !== undefined
      ? ` (${String(assessment.observedValue)})`
      : '';
    return `The package evidence contains a compliant ${label} declaration${observed}. The declared value satisfies statutory requirements under Rule ${assessment.ruleNumber} and is available for inspector review.`;
  }

  // FAIL
  if (assessment.result === 'FAIL') {
    const deviation = assessment.deviation ? ` Deviation: ${assessment.deviation}.` : '';
    const observed = assessment.observedValue !== undefined ? ` Observed: ${String(assessment.observedValue)}.` : '';
    const expected = assessment.expectedConstraint !== undefined ? ` Prescribed standard: ${String(assessment.expectedConstraint)}.` : '';
    return `The assessed evidence indicates non-compliance with Rule ${assessment.ruleNumber} (${assessment.ruleTitle}).${observed}${expected}${deviation} ${assessment.explanation}`;
  }

  // REQUIRES_VERIFICATION
  if (assessment.result === 'REQUIRES_VERIFICATION') {
    return `The assessed evidence requires human inspector verification under Rule ${assessment.ruleNumber}. ${assessment.explanation}`;
  }

  // NOT_APPLICABLE
  if (assessment.result === 'NOT_APPLICABLE') {
    return `Statutory requirement under Rule ${assessment.ruleNumber} is not applicable to this package category or packaging format.`;
  }

  return assessment.explanation;
}

/**
 * Returns advisory capture action when evidence is missing.
 */
function getSuggestedCaptureAction(fieldType?: DeclarationType, ruleNumber?: string): string {
  switch (fieldType) {
    case 'MRP':
      return 'Capture a closer, glare-free macro photograph of the retail price / MRP declaration.';
    case 'NET_QUANTITY':
      return 'Capture a closer image of the net quantity declaration on the Principal Display Panel.';
    case 'MANUFACTURER_NAME_ADDRESS':
      return 'Capture a sharp photograph of the manufacturer / packer address block on the back panel.';
    case 'DATE_OF_PACKAGING':
      return 'Capture the date marking (month/year of packaging) clearly, checking crimp or lid areas.';
    case 'CONSUMER_CARE_DETAILS':
      return 'Capture the consumer care contact details block.';
    default:
      return `Capture a clear, high-resolution photograph of the package area relevant to Rule ${ruleNumber || 'declaration'}.`;
  }
}

/**
 * Deterministically constructs suggested inspector action.
 */
function buildSuggestedInspectorAction(params: {
  assessment: ComplianceAssessment;
  evidenceStatus: EvidenceStatus;
  hasConflict: boolean;
  insufficientAction?: string;
}): string | undefined {
  const { assessment, evidenceStatus, hasConflict, insufficientAction } = params;

  if (hasConflict || evidenceStatus === 'CONFLICT') {
    return 'Inspect physical package and confirm true declared value to resolve observation discrepancy.';
  }

  if (assessment.result === 'INSUFFICIENT_EVIDENCE') {
    return insufficientAction || 'Capture additional physical evidence or verify declaration on product.';
  }

  if (assessment.result === 'FAIL') {
    return 'Verify physical declaration against statutory rule and record inspection decision or issue notice.';
  }

  if (assessment.result === 'REQUIRES_VERIFICATION') {
    return 'Verify declaration placement, font height, or wording directly on physical commodity.';
  }

  return undefined;
}

/**
 * Deterministic Inspection Report Assembler (Phase 9)
 *
 * Assembles a canonical InspectionReport from finalized state.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Fully downstream of Gemini and the GSR 202(E) Rule Engine.
 * 2. Never evaluates compliance on the fly.
 * 3. Enforces finalization gate: Final report generation requires status === 'DECIDED'.
 * 4. Preserves AI observations, deterministic assessments, and inspector corrections side-by-side.
 * 5. Deterministically sorts evidence, assessments, and declarations.
 * 6. Generates dual cryptographic seals: contentHash and reportHash.
 */

import type {
  Declaration,
  ComplianceAssessment,
  Evidence,
  AssessmentReview,
  InspectorCorrection,
  InspectorDecision,
  InspectionAmendment,
  AuditLog,
  InspectionReport,
  InspectionStatus,
} from '@lm-vision/shared-types';
import { InspectionReportSchema } from '@lm-vision/shared-types';
import { computeContentHash, computeReportHash } from './cryptoHasher.js';

export const REPORT_GENERATOR_VERSION = '1.0.0';
export const DEFAULT_RULE_BUNDLE_ID = 'LM-IN-RULES-2026.09';
export const DEFAULT_RULE_BUNDLE_VERSION = '2026.09';
export const DEFAULT_ENGINE_VERSION = '1.0.0';

/**
 * Cross-platform RFC 4122 v4 UUID generator (zero native dependencies)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface AssembleReportInput {
  reportId?: string;
  inspectionId: string;
  reportNumber?: string;
  inspectionStatus: InspectionStatus;
  isDraftPreview?: boolean;
  product: {
    id?: string;
    brandName?: string;
    productName?: string;
    genericName?: string;
    category?: string;
    packagingType?: string;
    barcode?: string;
    batchNumber?: string;
    declaredNetQuantityValue?: number;
    declaredNetQuantityUnit?: string;
    declaredMrp?: number;
    declaredUsp?: number;
    declaredUspUnit?: string;
    manufacturer?: {
      legalName?: string;
      address?: string;
      country?: string;
      fssaiLicenseNumber?: string;
    };
  };
  inspectionMetadata?: {
    sourceType?: 'PHYSICAL_PACKAGE' | 'ECOMMERCE_LISTING';
    location?: string;
    createdAt?: string;
    finalizedAt?: string;
    notes?: string;
  };
  inspector?: {
    id: string;
    name: string;
    role?: string;
  };
  declarations?: Declaration[];
  complianceAssessments?: ComplianceAssessment[];
  evidence?: Evidence[];
  reviews?: AssessmentReview[];
  corrections?: InspectorCorrection[];
  finalDecision?: InspectorDecision;
  amendments?: InspectionAmendment[];
  auditSummary?: AuditLog[];
  supersedesReportId?: string;
  generatedAt?: string;
  ruleBundleId?: string;
  ruleBundleVersion?: string;
  engineVersion?: string;
  reportGeneratorVersion?: string;
}

/**
 * Deterministically sorts evidence entries
 */
function sortEvidenceDeterministically(evidence: Evidence[]): Evidence[] {
  return [...evidence].sort((a, b) => {
    // Primary sort: capturedAt
    const timeA = new Date(a.capturedAt).getTime();
    const timeB = new Date(b.capturedAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    // Secondary sort: id
    return a.id.localeCompare(b.id);
  });
}

/**
 * Deterministically sorts compliance assessments
 */
function sortAssessmentsDeterministically(assessments: ComplianceAssessment[]): ComplianceAssessment[] {
  return [...assessments].sort((a, b) => {
    // Primary sort: ruleNumber
    const numCompare = (a.ruleNumber || '').localeCompare(b.ruleNumber || '', undefined, { numeric: true });
    if (numCompare !== 0) return numCompare;
    // Secondary sort: ruleId
    return a.ruleId.localeCompare(b.ruleId);
  });
}

/**
 * Deterministically sorts declarations
 */
function sortDeclarationsDeterministically(declarations: Declaration[]): Declaration[] {
  return [...declarations].sort((a, b) => {
    // Primary sort: declaration type
    const typeCompare = a.type.localeCompare(b.type);
    if (typeCompare !== 0) return typeCompare;
    // Secondary sort: rawText
    return a.rawText.localeCompare(b.rawText);
  });
}

/**
 * Assembles a canonical InspectionReport record
 */
export function assembleInspectionReport(input: AssembleReportInput): InspectionReport {
  const isDecided = input.inspectionStatus === 'DECIDED';

  // SECURITY ENFORCEMENT:
  // If not DECIDED and client specifically requested final report (isDraftPreview === false), reject.
  if (!isDecided && input.isDraftPreview === false) {
    throw new Error(
      `Cannot generate finalized inspection report: inspection status is '${input.inspectionStatus}', but must be 'DECIDED'.`
    );
  }

  // Determine draft vs finalized mode
  const isDraftPreview = !isDecided || input.isDraftPreview === true;
  const reportVersion = isDraftPreview ? '0.1.0-draft' : '1.0.0';
  const title = isDraftPreview
    ? 'DRAFT / PREVIEW INSPECTION REPORT'
    : 'FINALIZED INSPECTION REPORT';

  const reportId = input.reportId || generateUUID();
  const reportNumber =
    input.reportNumber ||
    `LM-REP-${new Date().getFullYear()}-${input.inspectionId.slice(0, 8).toUpperCase()}`;

  const generatedAt = input.generatedAt || new Date().toISOString();
  const inspectorId = input.inspector?.id || '00000000-0000-0000-0000-000000000001';
  const inspectorName = input.inspector?.name || 'Authorized Inspector';
  const inspectorRole = input.inspector?.role || 'INSPECTOR';

  // Sort components deterministically
  const sortedDeclarations = sortDeclarationsDeterministically(input.declarations || []);
  const sortedAssessments = sortAssessmentsDeterministically(input.complianceAssessments || []);
  const sortedEvidence = sortEvidenceDeterministically(input.evidence || []);
  const sortedReviews = [...(input.reviews || [])].sort((a, b) => a.id.localeCompare(b.id));
  const sortedCorrections = [...(input.corrections || [])].sort((a, b) => a.id.localeCompare(b.id));
  const sortedAmendments = [...(input.amendments || [])].sort((a, b) =>
    new Date(a.amendedAt).getTime() - new Date(b.amendedAt).getTime()
  );
  const sortedAuditSummary = [...(input.auditSummary || [])].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Count total violations found (FAIL results in compliance assessments)
  const totalViolationsFound = sortedAssessments.filter(a => a.result === 'FAIL').length;

  // Build product section
  const product = {
    id: input.product.id,
    brandName: input.product.brandName || 'Unknown Brand',
    productName: input.product.productName || 'Unknown Product',
    genericName: input.product.genericName,
    category: input.product.category || 'FOOD_BEVERAGE',
    packagingType: input.product.packagingType || 'BOX',
    barcode: input.product.barcode,
    batchNumber: input.product.batchNumber,
    declaredNetQuantityValue: input.product.declaredNetQuantityValue,
    declaredNetQuantityUnit: input.product.declaredNetQuantityUnit,
    declaredMrp: input.product.declaredMrp,
    declaredUsp: input.product.declaredUsp,
    declaredUspUnit: input.product.declaredUspUnit,
    manufacturer: input.product.manufacturer,
  };

  // Build metadata section
  const inspectionMetadata = {
    sourceType: input.inspectionMetadata?.sourceType || 'PHYSICAL_PACKAGE',
    location: input.inspectionMetadata?.location,
    createdAt: input.inspectionMetadata?.createdAt || new Date().toISOString(),
    finalizedAt: input.inspectionMetadata?.finalizedAt || (isDecided ? generatedAt : undefined),
    notes: input.inspectionMetadata?.notes,
  };

  // Base raw report object without hashes
  const rawReportPayload = {
    reportId,
    inspectionId: input.inspectionId,
    reportNumber,
    reportVersion,
    reportGeneratorVersion: input.reportGeneratorVersion || REPORT_GENERATOR_VERSION,
    engineVersion: input.engineVersion || DEFAULT_ENGINE_VERSION,
    ruleBundleId: input.ruleBundleId || DEFAULT_RULE_BUNDLE_ID,
    ruleBundleVersion: input.ruleBundleVersion || DEFAULT_RULE_BUNDLE_VERSION,
    inspectionStatus: input.inspectionStatus,
    status: isDraftPreview ? ('DRAFT' as const) : ('GENERATED' as const),
    isDraftPreview,
    title,
    generatedAt,
    generatedByUserId: inspectorId,
    inspectorId,
    inspectorName,
    inspectorRole,
    product,
    inspectionMetadata,
    declarations: sortedDeclarations,
    complianceAssessments: sortedAssessments,
    evidence: sortedEvidence,
    reviews: sortedReviews,
    corrections: sortedCorrections,
    finalDecision: input.finalDecision,
    amendments: sortedAmendments,
    auditSummary: sortedAuditSummary,
    totalViolationsFound,
    supersedesReportId: input.supersedesReportId,
  };

  // 1. Compute contentHash (hash of canonical content payload, excluding generatedAt & hashes)
  const contentHash = computeContentHash(rawReportPayload as unknown as Record<string, unknown>);

  // 2. Compute reportHash (hash of serialized report envelope including contentHash)
  const reportHash = computeReportHash({
    ...rawReportPayload,
    contentHash,
  });

  const fullReport: InspectionReport = {
    ...rawReportPayload,
    contentHash,
    reportHash,
  };

  // Validate assembled report against schema
  return InspectionReportSchema.parse(fullReport);
}

/**
 * Filter assessments by rule authority kind
 */
export function getAuthoritativeAssessments(report: InspectionReport): ComplianceAssessment[] {
  return report.complianceAssessments.filter(a => a.ruleKind === 'AUTHORITATIVE');
}

export function getTestOrDemoAssessments(report: InspectionReport): ComplianceAssessment[] {
  return report.complianceAssessments.filter(a => a.ruleKind !== 'AUTHORITATIVE');
}

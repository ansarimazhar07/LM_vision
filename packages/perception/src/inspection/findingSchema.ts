/**
 * Phase E: Explainable Inspection Finding Schemas & Heuristic Data Models
 *
 * ARCHITECTURAL GUARDRAILS & INVARIANTS:
 * 1. AI observes. OCR extracts. Evidence fuses. Rules evaluate. Inspector decides.
 * 2. ONLY the deterministic Rule Engine evaluates statutory compliance.
 * 3. AI MUST NEVER become the legal decision-maker.
 * 4. INSPECTION EVIDENCE QUALITY SCORE is explicitly labeled NON-STATUTORY.
 *    It is a product-defined deterministic heuristic, NOT an official Legal Metrology score.
 * 5. Applicability is strictly decoupled from evidence completeness.
 * 6. Package comparison validates comparability first; differences are observational, NOT violations.
 * 7. Heatmap overlays strictly expose source provenance without false coordinate precision.
 */

import type {
  BoundingBox,
  ComplianceAssessment,
  ComplianceResult,
  Declaration,
  DeclarationType,
  FieldSearchStatus,
  PackageSurface,
  Severity,
} from '@lm-vision/shared-types';
import type {
  ConfidenceTier,
  InspectorCorrectionProvenance,
} from '../intelligence/candidateSchema.js';
import type {
  EvidenceSourceType,
  EvidenceStatus,
  FusedEvidencePackage,
} from '../fusion/evidenceSchema.js';


/**
 * Status of evidence presence for a specific statutory area or declaration field.
 * Strictly separates observational presence from legal mandate applicability.
 */
export type EvidencePresenceStatus =
  | 'AVAILABLE'
  | 'MISSING_EVIDENCE'
  | 'NOT_ASSESSED'
  | 'NOT_APPLICABLE';

/**
 * Overall evidence completeness determination across an inspection.
 */
export type OverallCompletenessStatus = 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';

/**
 * Individual evidence completeness category assessment.
 */
export interface EvidenceCompletenessItem {
  readonly category: string;
  readonly fieldType?: DeclarationType;
  readonly presenceStatus: EvidencePresenceStatus;
  readonly isApplicable: boolean;
  readonly observedSource?: EvidenceSourceType | string;
  readonly confidence?: number | ConfidenceTier;
  readonly details?: string;
  readonly searchStatus?: FieldSearchStatus;
  readonly relevantSurfaces?: readonly PackageSurface[];
  readonly uncapturedRelevantSurfaces?: readonly PackageSurface[];
}

/**
 * Advisory recommendation for missing or suboptimal physical evidence capture.
 * Strictly advisory — automated capture without inspector consent is forbidden.
 */
export interface SmartCaptureRecommendation {
  readonly id: string;
  readonly triggerReason: string;
  readonly advisoryGuidance: string;
  readonly targetSurface?: PackageSurface;
  readonly targetField?: DeclarationType;
  readonly priority: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly isAdvisory: true;
}

/**
 * Result of the Evidence Completeness Analyzer.
 */
export interface EvidenceCompletenessAnalysis {
  readonly overallStatus: OverallCompletenessStatus;
  readonly items: readonly EvidenceCompletenessItem[];
  readonly availableCount: number;
  readonly missingCount: number;
  readonly notApplicableCount: number;
  readonly notAssessedCount: number;
  readonly smartRecommendations: readonly SmartCaptureRecommendation[];
  readonly disclaimer: string;
}

/**
 * Deterministic breakdown of the product-defined Inspection Evidence Quality Score.
 * 
 * GUARDRAIL:
 * This score is a product-defined deterministic heuristic evaluating photographic
 * and observational evidence quality. It is NOT a government score, legal compliance
 * percentage, or probability of statutory compliance.
 */
export interface InspectionQualityScoreBreakdown {
  readonly scoreLabel: 'INSPECTION EVIDENCE QUALITY SCORE — NON-STATUTORY';
  readonly isNonStatutory: true;
  readonly totalScore: number; // 0 to 100
  readonly rating: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'INSUFFICIENT';
  readonly completenessPoints: number; // 0 to 30
  readonly traceabilityPoints: number; // 0 to 20
  readonly imageQualityPoints: number; // 0 to 20
  readonly conflictResolutionPoints: number; // 0 to 15
  readonly reviewCompletionPoints: number; // 0 to 15
  readonly formulaDescription: string;
  readonly summaryExplanation: string;
}

/**
 * Detailed evidence item supporting an explainable finding.
 */
export interface FindingEvidenceUsage {
  readonly field?: string;
  readonly value: unknown;
  readonly rawText?: string;
  readonly unit?: string | null;
  readonly source: EvidenceSourceType | string;
  readonly confidence: number;
  readonly regionId?: string;
  readonly boundingBox?: BoundingBox;
}

/**
 * Evidence conflict explanation detail for side-by-side reconciliation.
 */
export interface FindingConflictDetail {
  readonly hasConflict: boolean;
  readonly localOcrValue?: unknown;
  readonly aiObservationValue?: unknown;
  readonly sources: ReadonlyArray<{
    source: EvidenceSourceType | string;
    value: unknown;
    rawText?: string;
    confidence?: number;
  }>;
  readonly conflictExplanation: string;
  readonly requiresInspectorResolution: boolean;
}

/**
 * Canonical Phase E Explainable Finding model.
 * 
 * Converts deterministic Rule Engine assessments and multi-source fused evidence
 * into a transparent, fully explainable finding for inspector review.
 */
export interface ExplainableFinding {
  readonly id: string;
  readonly inspectionId: string;
  readonly ruleId: string;
  readonly ruleNumber: string;
  readonly subRule?: string;
  readonly ruleTitle: string;
  readonly ruleCitation?: string;
  readonly statutoryRequirement: string;
  readonly legalAssessment: ComplianceResult;
  readonly severity: Severity;
  readonly observedValue?: unknown;
  readonly expectedConstraint?: unknown;
  readonly deviation?: string;
  readonly evidenceUsed: readonly FindingEvidenceUsage[];
  readonly evidenceStatus: EvidenceStatus;
  readonly primarySource: EvidenceSourceType | string;
  readonly explanation: string;
  readonly confidence: number;
  readonly inspectorActionRequired: boolean;
  readonly suggestedInspectorAction?: string;
  readonly conflictDetails?: FindingConflictDetail;
  readonly insufficientEvidenceDetails?: {
    missingAspect: string;
    suggestedCaptureAction: string;
  };
  readonly inspectorCorrection?: InspectorCorrectionProvenance;
  readonly evidenceIds: readonly string[];
  readonly targetRegionId?: string;
  readonly evaluatedAt: string;
}

/**
 * Package-to-package comparability determination.
 */
export type PackageComparabilityStatus =
  | 'COMPARABLE'
  | 'PARTIALLY_COMPARABLE'
  | 'NOT_COMPARABLE';

/**
 * Structured subject for package-to-package comparison.
 */
export interface PackageComparisonSubject {
  readonly inspectionId: string;
  readonly productName?: string;
  readonly brandName?: string;
  readonly category?: string;
  readonly packageType?: string;
  readonly batchNumber?: string;
  readonly sku?: string;
  readonly declarations: readonly Declaration[];
  readonly assessments?: readonly ComplianceAssessment[];
  readonly fusedPackage?: FusedEvidencePackage;
  readonly qualityScore?: number;
}

/**
 * Field-by-field observational difference between two packages.
 */
export interface FieldComparisonDifference {
  readonly fieldName: string;
  readonly valueA: unknown;
  readonly valueB: unknown;
  readonly hasDifference: boolean;
  readonly differenceDescription: string;
  readonly isStatutoryViolation: false; // Always false; difference ≠ illegal
}

/**
 * Complete result of package-to-package comparison.
 */
export interface PackageComparisonResult {
  readonly comparability: PackageComparabilityStatus;
  readonly comparabilityRationale: string;
  readonly packageA: { id: string; name: string; brand: string };
  readonly packageB: { id: string; name: string; brand: string };
  readonly differences: readonly FieldComparisonDifference[];
  readonly mrpComparison?: {
    valueA: number | null;
    valueB: number | null;
    diffAmount: number | null;
    percentDiff: number | null;
    direction: 'A_HIGHER' | 'B_HIGHER' | 'IDENTICAL' | 'UNKNOWN';
    description: string;
  };
  readonly quantityComparison?: {
    valueA: string | null;
    valueB: string | null;
    description: string;
  };
  readonly summary: string;
  readonly disclaimer: string;
}

/**
 * E-commerce discrepancy analysis result.
 */
export interface EcommerceDiscrepancyAnalysis {
  readonly platform: string;
  readonly productTitle: string;
  readonly productUrl?: string;
  readonly physicalMrp: number | null;
  readonly onlinePrice: number | null;
  readonly hasDiscrepancy: boolean;
  readonly priceDifference?: {
    amount: number;
    percentage: number;
    direction: 'ONLINE_PREMIUM' | 'ONLINE_DISCOUNT' | 'IDENTICAL';
  };
  readonly timestamp: string;
  readonly matchingConfidence: number;
  readonly source: string;
  readonly guardrailNotice: string;
}

/**
 * Inspector Action Queue item.
 */
export interface InspectorActionItem {
  readonly id: string;
  readonly type:
    | 'NEEDS_VERIFICATION'
    | 'LOW_EVIDENCE_QUALITY'
    | 'OCR_AI_CONFLICT'
    | 'MISSING_DECLARATION_EVIDENCE'
    | 'IMAGE_QUALITY_ISSUE'
    | 'ECOMMERCE_DISCREPANCY'
    | 'INSPECTOR_CORRECTION_REQUIRED';
  readonly title: string;
  readonly description: string;
  readonly priority: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_ADVISORY';
  readonly relatedRuleId?: string;
  readonly relatedField?: string;
  readonly suggestedAction: string;
  readonly resolved: boolean;
}

/**
 * Comprehensive Inspection Summary Report model.
 */
export interface InspectionSummaryReport {
  readonly inspectionId: string;
  readonly productName: string;
  readonly category: string;
  readonly inspectorName: string;
  readonly evaluatedAt: string;
  readonly evidenceQualityScore: InspectionQualityScoreBreakdown;
  readonly systemAssessment: {
    readonly overallStatus: ComplianceResult;
    readonly passCount: number;
    readonly failCount: number;
    readonly requiresVerificationCount: number;
    readonly notApplicableCount: number;
    readonly insufficientEvidenceCount: number;
    readonly totalEvaluated: number;
  };
  readonly inspectorFinalDecision: {
    readonly status: 'DECIDED' | 'PENDING_INSPECTOR_DECISION';
    readonly decision?: string;
    readonly decidedAt?: string;
    readonly inspectorNotes?: string;
  };
  readonly unresolvedConflictsCount: number;
  readonly pendingInspectorActionsCount: number;
  readonly evidenceIntegrityFingerprint: {
    readonly algorithm: 'SHA-256';
    readonly hashes: ReadonlyArray<{
      imageId: string;
      surface: string;
      hash: string;
    }>;
    readonly isIntegrityMechanism: true;
    readonly notEncryptionNotice: string;
  };
}

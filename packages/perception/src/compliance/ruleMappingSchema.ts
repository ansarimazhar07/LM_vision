/**
 * Phase F1: Legal Metrology Rule Applicability, Evidence Mapping & Compliance Assessment Schema
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. AI observes. OCR extracts. Evidence fuses. Rules evaluate. Inspector decides.
 * 2. Decouples Evidence Status (AGREEMENT, CONFLICT, PARTIAL, INSUFFICIENT, INSPECTOR_CONFIRMED)
 *    from Legal Status (PASS, FAIL, REQUIRES_VERIFICATION, NOT_APPLICABLE, INSUFFICIENT_EVIDENCE).
 * 3. 8-Level Traceability Guarantee:
 *    Rule -> Field -> Candidate -> Image -> Surface -> BoundingBox -> Normalization -> Validation -> Assessment.
 * 4. Extensible, versioned rule contract registry — not hardcoded to fixed static rules.
 */

import { z } from 'zod';
import type {
  BoundingBox,
  ComplianceAssessment,
  ComplianceEvaluationSummary,
  ComplianceResult,
  DeclarationType,
  EvidenceSufficiency,
  FieldSearchStatus,
  PackageSurface,
} from '@lm-vision/shared-types';

/**
 * Statutory Rule Applicability Classification
 */
export const RuleApplicabilityStatusSchema = z.enum([
  'APPLICABLE',
  'NOT_APPLICABLE',
  'UNKNOWN_APPLICABILITY',
]);
export type RuleApplicabilityStatus = z.infer<typeof RuleApplicabilityStatusSchema>;

/**
 * Evidence Status across multi-source / multi-surface observations
 */
export const RuleEvidenceStatusSchema = z.enum([
  'AGREEMENT',
  'CONFLICT',
  'PARTIAL',
  'INSUFFICIENT',
  'INSPECTOR_CONFIRMED',
  'SINGLE_SOURCE',
  'NO_EVIDENCE',
]);
export type RuleEvidenceStatus = z.infer<typeof RuleEvidenceStatusSchema>;

/**
 * Rule Evidence Sufficiency
 */
export const RuleEvidenceSufficiencySchema = z.enum([
  'SUFFICIENT',
  'INSUFFICIENT',
  'CONFLICTING',
  'LOW_CONFIDENCE',
]);
export type RuleEvidenceSufficiency = z.infer<typeof RuleEvidenceSufficiencySchema>;

/**
 * Explicit Evidence Contract defining required and supporting evidence for a rule
 */
export interface RuleEvidenceContract {
  readonly ruleId: string;
  readonly ruleNumber: string;
  readonly subRule?: string;
  readonly title: string;
  readonly requirement: string;
  readonly statutoryCitation: string;
  readonly requiredFields: readonly (DeclarationType | string)[];
  readonly optionalFields: readonly (DeclarationType | string)[];
  readonly supportingSignals: readonly string[];
  readonly insufficientConditions: readonly string[];
}

/**
 * 8-Level Granular Candidate Localization & Provenance
 */
export interface RuleCandidateEvidence {
  readonly candidateId: string;
  readonly field: DeclarationType | string;
  readonly rawText: string;
  readonly value: unknown;
  readonly normalizedValue: unknown;
  readonly unit?: string | null;
  readonly imageId: string;
  readonly surface: PackageSurface;
  readonly surfaceType?: PackageSurface;
  readonly surfaceId?: string;
  readonly boundingBox?: BoundingBox;
  readonly extractionMethod: string;
  readonly confidence: number;
  readonly validationStatus: 'VALID' | 'INVALID' | 'SUSPECT' | 'UNVERIFIED';
  readonly isInspectorConfirmed?: boolean;
  readonly inspectorReason?: string;
  readonly timestamp?: string;
}

/**
 * Observed Evidence mapped to a specific statutory rule
 */
export interface RuleObservedEvidence {
  readonly primaryField: DeclarationType | string;
  readonly primaryValue: unknown;
  readonly rawText?: string;
  readonly unit?: string | null;
  readonly normalizedValue?: unknown;
  readonly evidenceStatus: RuleEvidenceStatus;
  readonly searchStatus: FieldSearchStatus;
  readonly candidates: readonly RuleCandidateEvidence[];
  readonly conflictDetails?: {
    readonly hasConflict: boolean;
    readonly conflictingSurfaces: readonly PackageSurface[];
    readonly differingValues: readonly unknown[];
    readonly description: string;
  };
  readonly searchCompleteness?: {
    readonly isComplete: boolean;
    readonly capturedSurfaces: readonly PackageSurface[];
    readonly uncapturedRelevantSurfaces: readonly PackageSurface[];
    readonly message: string;
  };
}

/**
 * Statutory Applicability Evaluation Outcome for a Rule
 */
export interface RuleApplicabilityResult {
  readonly ruleId: string;
  readonly ruleNumber: string;
  readonly status: RuleApplicabilityStatus;
  readonly reason: string;
  readonly statutoryCitation: string;
  readonly exemptionsEvaluated: readonly string[];
}

/**
 * 8-Level Audit Traceability Record answering:
 * 1. Which rule?
 * 2. Which evidence field?
 * 3. Which exact candidate?
 * 4. Which image?
 * 5. Which physical surface?
 * 6. Which bounding box?
 * 7. Which normalization?
 * 8. Which validation & final assessment?
 */
export interface RuleTraceabilityRecord {
  readonly ruleId: string;
  readonly ruleNumber: string;
  readonly evidenceField: string;
  readonly candidateId?: string;
  readonly imageId?: string;
  readonly surface?: PackageSurface;
  readonly boundingBox?: BoundingBox;
  readonly rawText?: string;
  readonly normalizedValue?: unknown;
  readonly unit?: string | null;
  readonly normalizationSummary: string;
  readonly validationSummary: string;
  readonly conflictState: string;
  readonly finalAssessment: ComplianceResult;
  readonly evidenceSufficiency: EvidenceSufficiency;
  readonly reasoning: string;
}

/**
 * Mapped Item combining Contract, Applicability, Evidence, Assessment, and Traceability
 */
export interface RuleMappedEvaluationItem {
  readonly ruleId: string;
  readonly ruleNumber: string;
  readonly subRule?: string;
  readonly title: string;
  readonly statutorySource: string;
  readonly sourcePage?: number;
  readonly contract: RuleEvidenceContract;
  readonly applicability: RuleApplicabilityResult;
  readonly observedEvidence: RuleObservedEvidence;
  readonly assessment: ComplianceAssessment;
  readonly traceability: RuleTraceabilityRecord;
}

/**
 * Safety and Accuracy Metrics measured during evaluation
 */
export interface RuleMappingMetrics {
  readonly totalRulesEvaluated: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly requiresVerificationCount: number;
  readonly notApplicableCount: number;
  readonly insufficientEvidenceCount: number;
  readonly falsePassCount: number;
  readonly falseFailCount: number;
  readonly falsePassRate: number;
  readonly falseFailRate: number;
  readonly mappingAccuracy: number;
  readonly conflictDetectionAccuracy: number;
  readonly searchIncompleteAccuracy: number;
}

/**
 * Canonical result emitted by the Hardened Compliance Mapping Layer
 */
export interface HardenedComplianceEvaluationResult {
  readonly inspectionId: string;
  readonly bundleId: string;
  readonly summary: ComplianceEvaluationSummary;
  readonly mappedItems: readonly RuleMappedEvaluationItem[];
  readonly traceability: readonly RuleTraceabilityRecord[];
  readonly metrics: RuleMappingMetrics;
  readonly evaluatedAt: string;
}

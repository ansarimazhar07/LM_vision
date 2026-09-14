/**
 * Phase D: Hybrid Evidence Fusion Schema & Domain Models
 *
 * Defines canonical data structures for multi-source evidence fusion:
 * Local On-Device OCR/CV, Online Multimodal AI (Gemini/OpenAI),
 * E-Commerce discrepancy evidence, and Human Inspector corrections.
 *
 * ARCHITECTURAL PRINCIPLE:
 * AI observes. OCR extracts. Evidence fuses. Rules evaluate. Inspector decides.
 */

import type { BoundingBox, DeclarationType, FieldSearchStatus, PackageSurface } from '@lm-vision/shared-types';
import type { ConfidenceTier, InspectorCorrectionProvenance } from '../intelligence/candidateSchema.js';

export type EvidenceSourceType =
  | 'LOCAL_OCR'
  | 'LOCAL_CV'
  | 'LOCAL_CONSENSUS'
  | 'GEMINI'
  | 'OPENAI'
  | 'GROK'
  | 'ECOMMERCE'
  | 'INSPECTOR';

/**
 * High-level evidence status (strictly decoupled from statutory legal compliance status).
 */
export type EvidenceStatus =
  | 'AGREEMENT'
  | 'CONFLICT'
  | 'PARTIAL'
  | 'INSUFFICIENT'
  | 'INSPECTOR_CONFIRMED';

/**
 * An individual evidence item from a specific source.
 */
export interface FieldEvidenceItem {
  sourceType: EvidenceSourceType;
  value: unknown;
  rawText?: string;
  unit?: string | null;
  confidenceTier: ConfidenceTier;
  nativeConfidence?: number | null;
  evidenceRegionIds?: string[];
  boundingBox?: BoundingBox;
  sourceImageId?: string;
  surface?: PackageSurface;
  surfaceType?: PackageSurface;
  surfaceId?: string;
  captureId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * E-Commerce discrepancy record for supporting external evidence.
 */
export interface EcommerceDiscrepancyEvidence {
  platform: string;
  physicalValue: unknown;
  listedValue: unknown;
  hasDiscrepancy: boolean;
  explanation: string;
  timestamp: string;
}

/**
 * Fused evidence record for a single statutory declaration field.
 */
export interface FusedFieldEvidence {
  fieldType: DeclarationType;
  fusedValue: unknown;
  fusedUnit?: string | null;
  evidenceStatus: EvidenceStatus;
  confidenceTier: ConfidenceTier;
  isAmbiguous: boolean;
  sources: FieldEvidenceItem[];
  primarySource: EvidenceSourceType;
  explanation: string;
  discrepancyReason?: string;
  inspectorCorrection?: InspectorCorrectionProvenance;
  ecommerceDiscrepancy?: EcommerceDiscrepancyEvidence;
  pendingReview?: boolean;
  searchStatus?: FieldSearchStatus;
  searchCompleteness?: {
    capturedSurfaces: PackageSurface[];
    relevantSurfaces: PackageSurface[];
    uncapturedRelevantSurfaces: PackageSurface[];
    isSearchComplete: boolean;
    statusSummary: string;
    recommendation?: string;
  };
}

/**
 * Container for the complete fused inspection evidence package.
 */
export interface FusedEvidencePackage {
  inspectionId: string;
  fields: Record<string, FusedFieldEvidence>;
  overallStatus: EvidenceStatus;
  hasConflicts: boolean;
  conflictingFieldCount: number;
  aiAvailable: boolean;
  aiProviderName?: string;
  fusedAt: string;
  latencyMs: number;
  newEvidenceAfterDecision?: boolean;
}


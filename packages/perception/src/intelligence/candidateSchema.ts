/**
 * Phase C: Structured Evidence Candidate Schema & Contracts
 *
 * Defines observational and evidentiary data structures for on-device
 * declaration detection, confidence tiers, multi-signal spatial associations,
 * OCR consensus, and evidence traceability.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Observational & Evidentiary Only: Never creates statutory legal verdicts.
 * 2. Immutable Raw OCR: Always preserves originalOCRText and source regions.
 * 3. Honest Confidence: Never manufactures fake percentage averages.
 * 4. Full Traceability: Every candidate links back to source regions and bounding boxes.
 */

import type { BoundingBox, DeclarationType, PackageSurface, TextRegion } from '@lm-vision/shared-types';

/**
 * Honest, non-manufactured confidence tiers.
 * Native OCR confidence is preserved separately as a native number or null.
 */
export type ConfidenceTier =
  | 'HIGH_CONFIDENCE'
  | 'MEDIUM_CONFIDENCE'
  | 'LOW_CONFIDENCE'
  | 'CONFLICT'
  | 'INSUFFICIENT_EVIDENCE';

/**
 * Extraction method provenance
 */
export type CandidateExtractionMethod =
  | 'DIRECT_PATTERN'
  | 'SPATIAL_ASSOCIATION'
  | 'MULTI_PASS_CONSENSUS'
  | 'INSPECTOR_CORRECTED';

/**
 * Detailed traceability linking a detected declaration back to its physical origin.
 */
export interface EvidenceTraceability {
  sourceRegionIds: string[];
  originalImageId: string;
  originalBoundingBox: BoundingBox;
  extractionMethod: CandidateExtractionMethod;
  ocrPassName?: string;
  validationStatus: 'VALID' | 'INVALID' | 'REQUIRES_VERIFICATION';
  conflictStatus?: 'NONE' | 'CONSENSUS_RESOLVED' | 'UNRESOLVED_CONFLICT';
  timestamp: string;
  surface?: PackageSurface;
  surfaceType?: PackageSurface;
  surfaceId?: string;
  captureId?: string;
}

/**
 * Provenance record for inspector corrections.
 * Ensures the original OCR candidate is NEVER overwritten.
 */
export interface InspectorCorrectionProvenance {
  originalCandidate: unknown;
  correctedCandidate: unknown;
  source: 'INSPECTOR_CORRECTED';
  reason?: string;
  inspectorId?: string;
  correctedAt: string;
}

/**
 * Multi-signal spatial association scores between a label and a candidate value region.
 */
export interface SpatialAssociationScore {
  horizontalDistance: number;
  verticalDistance: number;
  alignmentScore: number;
  readingOrderScore: number;
  overlapScore: number;
  competingLabelPenalty: number;
  typeCompatibilityScore: number;
  compositeScore: number;
  isAmbiguous: boolean;
}

/**
 * Phase C Structured Declaration Candidate.
 * Retains complete evidentiary provenance and normalization audit trail.
 */
export interface StructuredDeclarationCandidate {
  fieldType: DeclarationType;
  originalOCRText: string;
  normalizedText: string;
  normalizedValue: string | number | null;
  unit: string | null;
  confidenceTier: ConfidenceTier;
  nativeConfidence: number | null;
  isAmbiguous: boolean;
  correctionsApplied: string[];
  traceability: EvidenceTraceability;
  sourceRegion?: TextRegion;
  inspectorCorrection?: InspectorCorrectionProvenance;
  alternateCandidates?: StructuredDeclarationCandidate[];
  spatialScore?: SpatialAssociationScore;
  surface?: PackageSurface;
  surfaceType?: PackageSurface;
  surfaceId?: string;
  captureId?: string;
  supportingObservations?: Array<{
    surface: PackageSurface;
    surfaceType?: PackageSurface;
    surfaceId?: string;
    captureId?: string;
    imageId: string;
    value: string | number | null;
    rawText: string;
    boundingBox?: BoundingBox;
  }>;
}

/**
 * Context passed to modular declaration detectors.
 */
export interface DetectorContext {
  regions: TextRegion[];
  imageId: string;
  passName?: string;
}

/**
 * Result of a single detector execution.
 */
export interface DetectionResult {
  candidate: StructuredDeclarationCandidate;
  score: number;
}

/**
 * Modular, extensible declaration detector interface.
 * Allows adding new detectors without modifying the core pipeline.
 */
export interface IDeclarationDetector {
  readonly fieldType: DeclarationType;
  readonly detectorName: string;
  detect(context: DetectorContext): DetectionResult[];
}

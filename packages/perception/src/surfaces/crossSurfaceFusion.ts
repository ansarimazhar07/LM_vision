/**
 * Cross-Surface Evidence Fusion & Multi-Surface Search State Engine
 *
 * Reconciles declarations observed across dispersed packaging surfaces:
 * - Unifies disparate fields found on separate surfaces (e.g. Front, Back, Neck)
 * - Merges duplicate identical observations into corroborating agreement
 * - Detects cross-surface conflicts without arbitrary surface preference or averaging
 * - Evaluates search completeness to strictly prevent false "missing declaration" claims
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. False Missing Rule: "Not detected on current surfaces" != "missing from package".
 * 2. No surface hierarchy: Neck is NOT > Front, and Front is NOT > Neck.
 * 3. Epistemic preservation: In conflicts, retain all competing candidates and full provenance.
 * 4. Human authority: Inspector confirmations are permanent and never silently overwritten.
 */

import type {
  BoundingBox,
  DeclarationType,
  FieldSearchStatus,
  PackageSurface,
} from '@lm-vision/shared-types';
import type {
  ConfidenceTier,
  InspectorCorrectionProvenance,
  StructuredDeclarationCandidate,
} from '../intelligence/candidateSchema.js';
import type {
  EvidenceStatus,
  FieldEvidenceItem,
} from '../fusion/evidenceSchema.js';
import { areFieldCandidatesEquivalent } from '../extraction/fieldAwareConsensus.js';
import {
  getAdvisoryRelevantSurfaces,
  toPackageSurface,
  type PackagingContainerType,
} from './surfaceTaxonomy.js';

export interface CrossSurfaceObservation {
  surface: PackageSurface;
  surfaceType?: PackageSurface;
  surfaceId?: string;
  captureId?: string;
  imageId: string;
  value: unknown;
  rawText: string;
  unit?: string | null;
  boundingBox?: BoundingBox;
  confidence: number;
  confidenceTier: ConfidenceTier;
  candidate: StructuredDeclarationCandidate;
}

export interface CrossSurfaceFusionInput {
  inspectionId: string;
  candidatesBySurface: Array<{
    surface: PackageSurface;
    surfaceId?: string;
    captureId?: string;
    imageId: string;
    candidates: StructuredDeclarationCandidate[];
  }>;
  capturedSurfaces: PackageSurface[];
  containerType?: PackagingContainerType;
  inspectorCorrections?: Map<DeclarationType, { value: unknown; reason?: string; inspectorId?: string }>;
}

export interface CrossSurfaceFieldResult {
  fieldType: DeclarationType;
  fusedValue: unknown;
  fusedUnit?: string | null;
  evidenceStatus: EvidenceStatus;
  searchStatus: FieldSearchStatus;
  confidenceTier: ConfidenceTier;
  isAmbiguous: boolean;
  explanation: string;
  statusSummary: string;
  recommendation?: string;
  sources: FieldEvidenceItem[];
  primarySourceSurface?: PackageSurface;
  relevantSurfaces: PackageSurface[];
  uncapturedRelevantSurfaces: PackageSurface[];
  isSearchComplete: boolean;
  inspectorCorrection?: InspectorCorrectionProvenance;
}

export interface CrossSurfaceFusionPackage {
  inspectionId: string;
  fields: Record<string, CrossSurfaceFieldResult>;
  capturedSurfaces: PackageSurface[];
  containerType: PackagingContainerType;
  totalFieldsFound: number;
  totalFieldsIncomplete: number;
  hasCrossSurfaceConflicts: boolean;
}

const ALL_STATUTORY_FIELDS: readonly DeclarationType[] = [
  'GENERIC_NAME',
  'NET_QUANTITY',
  'MRP',
  'DATE_OF_MANUFACTURE',
  'DATE_OF_PACKAGING',
  'DATE_OF_IMPORT',
  'MANUFACTURER_NAME_ADDRESS',
  'PACKER_NAME_ADDRESS',
  'IMPORTER_NAME_ADDRESS',
  'CONSUMER_CARE_DETAILS',
];

/**
 * Executes cross-surface evidence fusion across all captured packaging surfaces.
 */
export function fuseCrossSurfaceDeclarations(
  input: CrossSurfaceFusionInput
): CrossSurfaceFusionPackage {
  const containerType = input.containerType || 'UNKNOWN';
  const capturedSurfaces = Array.from(new Set(input.capturedSurfaces.map(toPackageSurface)));
  const capturedSet = new Set<PackageSurface>(capturedSurfaces);

  // 1. Group all observations across all surfaces by DeclarationType
  const observationsByField = new Map<DeclarationType, CrossSurfaceObservation[]>();

  for (const field of ALL_STATUTORY_FIELDS) {
    observationsByField.set(field, []);
  }

  for (const surfaceEntry of input.candidatesBySurface) {
    const surface = toPackageSurface(surfaceEntry.surface);
    for (const cand of surfaceEntry.candidates) {
      const list = observationsByField.get(cand.fieldType) || [];
      list.push({
        surface,
        surfaceType: surface,
        surfaceId: surfaceEntry.surfaceId,
        captureId: surfaceEntry.captureId,
        imageId: surfaceEntry.imageId,
        value: cand.normalizedValue,
        rawText: cand.originalOCRText,
        unit: cand.unit,
        boundingBox: cand.traceability.originalBoundingBox,
        confidence: cand.nativeConfidence ?? 0.85,
        confidenceTier: cand.confidenceTier,
        candidate: cand,
      });
      observationsByField.set(cand.fieldType, list);
    }
  }

  const fieldResults: Record<string, CrossSurfaceFieldResult> = {};
  let hasCrossSurfaceConflicts = false;
  let totalFieldsFound = 0;
  let totalFieldsIncomplete = 0;

  // 2. Evaluate each target field across surfaces
  for (const fieldType of ALL_STATUTORY_FIELDS) {
    const observations = observationsByField.get(fieldType) || [];
    const relevantSurfaces = Array.from(getAdvisoryRelevantSurfaces(fieldType, containerType));
    const uncapturedRelevantSurfaces = relevantSurfaces.filter((s) => !capturedSet.has(s));
    const fieldLabel = fieldType.replace(/_/g, ' ');

    // Convert observations to standard FieldEvidenceItems
    const sources: FieldEvidenceItem[] = observations.map((obs) => ({
      sourceType: 'LOCAL_OCR',
      value: obs.value,
      rawText: obs.rawText,
      unit: obs.unit,
      confidenceTier: obs.confidenceTier,
      nativeConfidence: obs.confidence,
      boundingBox: obs.boundingBox,
      sourceImageId: obs.imageId,
      surface: obs.surface,
      surfaceType: obs.surface,
      surfaceId: obs.surfaceId,
      captureId: obs.captureId,
      timestamp: obs.candidate.traceability.timestamp || new Date().toISOString(),
      metadata: {
        ocrPassName: obs.candidate.traceability.ocrPassName,
      },
    }));

    // Check for inspector correction first (highest authoritative priority)
    const inspectorCorrection = input.inspectorCorrections?.get(fieldType);
    if (inspectorCorrection) {
      const correctionProvenance: InspectorCorrectionProvenance = {
        originalCandidate: observations[0]?.value ?? null,
        correctedCandidate: inspectorCorrection.value,
        source: 'INSPECTOR_CORRECTED',
        reason: inspectorCorrection.reason,
        inspectorId: inspectorCorrection.inspectorId,
        correctedAt: new Date().toISOString(),
      };

      fieldResults[fieldType] = {
        fieldType,
        fusedValue: inspectorCorrection.value,
        fusedUnit: observations[0]?.unit ?? null,
        evidenceStatus: 'INSPECTOR_CONFIRMED',
        searchStatus: 'INSPECTOR_CONFIRMED',
        confidenceTier: 'HIGH_CONFIDENCE',
        isAmbiguous: false,
        explanation: `Inspector confirmed value for ${fieldLabel}: "${String(inspectorCorrection.value)}"`,
        statusSummary: `Inspector confirmed value.`,
        sources,
        primarySourceSurface: observations[0]?.surface,
        relevantSurfaces,
        uncapturedRelevantSurfaces,
        isSearchComplete: true,
        inspectorCorrection: correctionProvenance,
      };
      totalFieldsFound++;
      continue;
    }

    // Case A: No observations found on any captured surface
    if (observations.length === 0) {
      if (uncapturedRelevantSurfaces.length > 0) {
        // Relevant surfaces have NOT yet been captured
        const recSurfaces = uncapturedRelevantSurfaces.slice(0, 3).map((s) => s.replace(/_/g, ' ').toLowerCase()).join(' / ');
        const recommendation = `Check ${recSurfaces} for additional ${fieldLabel.toLowerCase()} marking.`;

        fieldResults[fieldType] = {
          fieldType,
          fusedValue: null,
          fusedUnit: null,
          evidenceStatus: 'INSUFFICIENT',
          searchStatus: 'SEARCH_INCOMPLETE',
          confidenceTier: 'INSUFFICIENT_EVIDENCE',
          isAmbiguous: false,
          explanation: `${fieldLabel} not detected on currently captured surfaces (${capturedSurfaces.join(', ')}).`,
          statusSummary: `${fieldLabel} not detected on currently captured surfaces.`,
          recommendation,
          sources: [],
          relevantSurfaces,
          uncapturedRelevantSurfaces,
          isSearchComplete: false,
        };
        totalFieldsIncomplete++;
      } else {
        // All relevant surfaces for this container were inspected and no evidence found
        fieldResults[fieldType] = {
          fieldType,
          fusedValue: null,
          fusedUnit: null,
          evidenceStatus: 'INSUFFICIENT',
          searchStatus: 'SEARCH_COMPLETED_NO_EVIDENCE',
          confidenceTier: 'INSUFFICIENT_EVIDENCE',
          isAmbiguous: false,
          explanation: `${fieldLabel} not detected after all available relevant surfaces (${capturedSurfaces.join(', ')}) were inspected.`,
          statusSummary: `${fieldLabel} not detected after the available relevant surfaces were inspected.`,
          sources: [],
          relevantSurfaces,
          uncapturedRelevantSurfaces: [],
          isSearchComplete: true,
        };
      }
      continue;
    }

    // Case B: Exactly one observation across all surfaces
    if (observations.length === 1) {
      const obs = observations[0]!;
      fieldResults[fieldType] = {
        fieldType,
        fusedValue: obs.value,
        fusedUnit: obs.unit,
        evidenceStatus: 'AGREEMENT',
        searchStatus: 'FOUND',
        confidenceTier: obs.confidenceTier,
        isAmbiguous: obs.candidate.isAmbiguous,
        explanation: `${fieldLabel} extracted from ${obs.surface}: "${obs.rawText}"`,
        statusSummary: `${fieldLabel} detected on ${obs.surface}.`,
        sources,
        primarySourceSurface: obs.surface,
        relevantSurfaces,
        uncapturedRelevantSurfaces,
        isSearchComplete: true,
      };
      totalFieldsFound++;
      continue;
    }

    // Case C: Multiple observations across surfaces -> Check for Agreement vs Conflict
    const clusters: Array<{
      representative: CrossSurfaceObservation;
      members: CrossSurfaceObservation[];
      count: number;
    }> = [];

    for (const obs of observations) {
      let matched = false;
      for (const cluster of clusters) {
        if (areFieldCandidatesEquivalent(obs.candidate, cluster.representative.candidate)) {
          cluster.members.push(obs);
          cluster.count++;
          matched = true;
          break;
        }
      }
      if (!matched) {
        clusters.push({
          representative: obs,
          members: [obs],
          count: 1,
        });
      }
    }

    // Subcase C.1: All observations agree (e.g. Front = ₹120, Neck = ₹120)
    if (clusters.length === 1) {
      const cluster = clusters[0]!;
      const surfaceList = Array.from(new Set(cluster.members.map((m) => m.surface))).join(' & ');
      fieldResults[fieldType] = {
        fieldType,
        fusedValue: cluster.representative.value,
        fusedUnit: cluster.representative.unit,
        evidenceStatus: 'AGREEMENT',
        searchStatus: 'FOUND',
        confidenceTier: 'HIGH_CONFIDENCE',
        isAmbiguous: false,
        explanation: `${fieldLabel} verified across multiple surfaces (${surfaceList}): "${cluster.representative.rawText}"`,
        statusSummary: `${fieldLabel} confirmed with cross-surface agreement on ${surfaceList}.`,
        sources,
        primarySourceSurface: cluster.representative.surface,
        relevantSurfaces,
        uncapturedRelevantSurfaces,
        isSearchComplete: true,
      };
      totalFieldsFound++;
    } else {
      // Subcase C.2: Conflicting observations across surfaces (e.g. Front = ₹120, Neck = ₹150)
      hasCrossSurfaceConflicts = true;
      const details = clusters
        .map((c) => `${c.representative.surface}: "${c.representative.rawText}" (${String(c.representative.value)})`)
        .join(' vs ');

      fieldResults[fieldType] = {
        fieldType,
        fusedValue: clusters[0]!.representative.value, // Retain primary candidate for display
        fusedUnit: clusters[0]!.representative.unit,
        evidenceStatus: 'CONFLICT',
        searchStatus: 'CONFLICT',
        confidenceTier: 'CONFLICT',
        isAmbiguous: true,
        explanation: `Cross-surface conflict detected for ${fieldLabel}: ${details}. Requires inspector verification.`,
        statusSummary: `Contradictory values detected across surfaces: ${details}`,
        recommendation: `Inspect physical package to verify correct ${fieldLabel}.`,
        sources,
        primarySourceSurface: clusters[0]!.representative.surface,
        relevantSurfaces,
        uncapturedRelevantSurfaces,
        isSearchComplete: true,
      };
    }
  }

  return {
    inspectionId: input.inspectionId,
    fields: fieldResults,
    capturedSurfaces,
    containerType,
    totalFieldsFound,
    totalFieldsIncomplete,
    hasCrossSurfaceConflicts,
  };
}

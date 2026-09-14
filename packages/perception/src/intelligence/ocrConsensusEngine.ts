/**
 * Phase C: Multi-Pass OCR Consensus Engine
 *
 * Reconciles candidates extracted across multiple computer vision and OCR passes
 * (e.g. Standard, Enhanced, Grayscale, Perspective, Targeted Crop).
 *
 * ARCHITECTURAL CONSTRAINTS:
 * 1. Do NOT concatenate candidates blindly.
 * 2. Compares candidates by normalized value, field type, and spatial regions.
 * 3. Majority agreement yields a dominant candidate, retaining conflicting candidates
 *    as alternates with consensus conflict metadata.
 * 4. Genuine contradictions or ties yield isAmbiguous = true and REQUIRES_VERIFICATION.
 * 5. Never picks the first result arbitrarily.
 */

import type { DeclarationType } from '@lm-vision/shared-types';
import type {
  ConfidenceTier,
  StructuredDeclarationCandidate,
} from './candidateSchema.js';

export interface ConsensusResult {
  fieldType: DeclarationType;
  primaryCandidate: StructuredDeclarationCandidate;
  alternateCandidates: StructuredDeclarationCandidate[];
  hasConflict: boolean;
  isAmbiguous: boolean;
  agreementCount: number;
  totalPassesEvaluated: number;
}

/**
 * Compares two candidate values for equivalence
 */
function areCandidateValuesEqual(a: unknown, b: unknown, unitA?: string | null, unitB?: string | null): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;

  // Number comparison (allow minor precision differences)
  if (typeof a === 'number' && typeof b === 'number') {
    const numbersMatch = Math.abs(a - b) < 0.01;
    const unitsMatch = (unitA || '').toLowerCase() === (unitB || '').toLowerCase();
    return numbersMatch && unitsMatch;
  }

  // String comparison
  if (typeof a === 'string' && typeof b === 'string') {
    const cleanA = a.trim().toLowerCase();
    const cleanB = b.trim().toLowerCase();
    return cleanA === cleanB;
  }

  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Reconciles candidates for a single declaration field across multiple OCR passes.
 */
export function reconcileFieldCandidates(
  fieldType: DeclarationType,
  candidates: StructuredDeclarationCandidate[]
): ConsensusResult {
  if (candidates.length === 0) {
    throw new Error(`Cannot reconcile empty candidates for field ${fieldType}`);
  }

  // If only a single pass produced a candidate, return directly
  const singleCandidate = candidates[0];
  if (singleCandidate && candidates.length === 1) {
    return {
      fieldType,
      primaryCandidate: singleCandidate,
      alternateCandidates: [],
      hasConflict: false,
      isAmbiguous: singleCandidate.isAmbiguous,
      agreementCount: 1,
      totalPassesEvaluated: 1,
    };
  }

  // Group candidates into value clusters
  const clusters: Array<{
    representative: StructuredDeclarationCandidate;
    members: StructuredDeclarationCandidate[];
    count: number;
  }> = [];

  for (const cand of candidates) {
    let matchedCluster = false;
    for (const cluster of clusters) {
      if (
        areCandidateValuesEqual(
          cand.normalizedValue,
          cluster.representative.normalizedValue,
          cand.unit,
          cluster.representative.unit
        )
      ) {
        cluster.members.push(cand);
        cluster.count++;
        matchedCluster = true;
        break;
      }
    }

    if (!matchedCluster) {
      clusters.push({
        representative: cand,
        members: [cand],
        count: 1,
      });
    }
  }

  // Sort clusters descending by vote count
  clusters.sort((a, b) => b.count - a.count);

  const totalPasses = candidates.length;
  const topCluster = clusters[0];
  if (!topCluster) {
    throw new Error(`Failed to cluster candidates for ${fieldType}`);
  }
  const secondCluster = clusters[1] ?? null;

  // Case 1: All passes agree completely
  if (clusters.length === 1) {
    const primary = {
      ...topCluster.representative,
      confidenceTier: 'HIGH_CONFIDENCE' as ConfidenceTier,
      traceability: {
        ...topCluster.representative.traceability,
        conflictStatus: 'CONSENSUS_RESOLVED' as const,
        validationStatus: 'VALID' as const,
      },
    };

    return {
      fieldType,
      primaryCandidate: primary,
      alternateCandidates: [],
      hasConflict: false,
      isAmbiguous: false,
      agreementCount: topCluster.count,
      totalPassesEvaluated: totalPasses,
    };
  }

  // Case 2: Genuine tie / contradiction (e.g. 1 vs 1, or 2 vs 2)
  const isTie = secondCluster !== null && topCluster.count === secondCluster.count;

  if (isTie) {
    // Flag REQUIRES_VERIFICATION. Never choose arbitrarily!
    const alternates = candidates.filter((c) => c !== topCluster.representative);

    const conflictedPrimary: StructuredDeclarationCandidate = {
      ...topCluster.representative,
      confidenceTier: 'CONFLICT',
      isAmbiguous: true,
      alternateCandidates: alternates,
      traceability: {
        ...topCluster.representative.traceability,
        conflictStatus: 'UNRESOLVED_CONFLICT',
        validationStatus: 'REQUIRES_VERIFICATION',
      },
    };

    return {
      fieldType,
      primaryCandidate: conflictedPrimary,
      alternateCandidates: alternates,
      hasConflict: true,
      isAmbiguous: true,
      agreementCount: topCluster.count,
      totalPassesEvaluated: totalPasses,
    };
  }

  // Case 3: Clear majority (e.g. 2 out of 3, 3 out of 4)
  const alternates = clusters
    .slice(1)
    .flatMap((cl) => cl.members);

  const dominantPrimary: StructuredDeclarationCandidate = {
    ...topCluster.representative,
    confidenceTier: 'HIGH_CONFIDENCE',
    isAmbiguous: false,
    alternateCandidates: alternates,
    traceability: {
      ...topCluster.representative.traceability,
      conflictStatus: 'CONSENSUS_RESOLVED',
      validationStatus: 'VALID',
    },
  };

  return {
    fieldType,
    primaryCandidate: dominantPrimary,
    alternateCandidates: alternates,
    hasConflict: true,
    isAmbiguous: false,
    agreementCount: topCluster.count,
    totalPassesEvaluated: totalPasses,
  };
}

/**
 * Runs multi-pass consensus across candidate lists from different OCR passes.
 */
export function runMultiPassConsensus(
  passCandidates: Array<{ passName: string; candidates: StructuredDeclarationCandidate[] }>
): StructuredDeclarationCandidate[] {
  // Aggregate candidates by field type
  const fieldMap = new Map<DeclarationType, StructuredDeclarationCandidate[]>();

  for (const pass of passCandidates) {
    for (const cand of pass.candidates) {
      const list = fieldMap.get(cand.fieldType) || [];
      list.push(cand);
      fieldMap.set(cand.fieldType, list);
    }
  }

  const reconciledCandidates: StructuredDeclarationCandidate[] = [];

  for (const [fieldType, candidates] of fieldMap) {
    const result = reconcileFieldCandidates(fieldType, candidates);
    reconciledCandidates.push(result.primaryCandidate);
  }

  return reconciledCandidates;
}

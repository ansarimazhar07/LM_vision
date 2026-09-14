/**
 * Field-Aware Multi-Pass Consensus Engine
 *
 * Provides conservative, domain-aware candidate agreement and reconciliation:
 * 1. Numeric and Unit Fields (MRP, Net Qty): matches on canonicalized numeric values.
 * 2. Dates: matches across equivalent date representations (03/2026 == Mar 2026).
 * 3. Contacts: normalizes phone number punctuation (1800-111-2222 == 18001112222).
 * 4. Entity Names & Addresses: conservative string comparison.
 *    - "ABC Foods Pvt Ltd" matches "ABC Foods Pvt. Ltd."
 *    - "ABC Foods Pvt Ltd" does NOT match "ABC Food Products Pvt Ltd"
 */

import type { DeclarationType } from '@lm-vision/shared-types';
import type {
  ConfidenceTier,
  StructuredDeclarationCandidate,
} from '../intelligence/candidateSchema.js';

export function areFieldCandidatesEquivalent(
  candA: StructuredDeclarationCandidate,
  candB: StructuredDeclarationCandidate
): boolean {
  if (candA.fieldType !== candB.fieldType) return false;

  // 1. MRP: numeric value comparison
  if (candA.fieldType === 'MRP') {
    if (typeof candA.normalizedValue === 'number' && typeof candB.normalizedValue === 'number') {
      return Math.abs(candA.normalizedValue - candB.normalizedValue) < 0.01;
    }
  }

  // 2. Net Quantity: numeric value + canonical unit
  if (candA.fieldType === 'NET_QUANTITY') {
    if (typeof candA.normalizedValue === 'number' && typeof candB.normalizedValue === 'number') {
      const numsMatch = Math.abs(candA.normalizedValue - candB.normalizedValue) < 0.01;
      const unitsMatch = (candA.unit || '').toLowerCase() === (candB.unit || '').toLowerCase();
      return numsMatch && unitsMatch;
    }
  }

  // 3. Dates: check month/year match
  if (
    candA.fieldType === 'DATE_OF_MANUFACTURE' ||
    candA.fieldType === 'DATE_OF_PACKAGING' ||
    candA.fieldType === 'DATE_OF_IMPORT'
  ) {
    const cleanA = String(candA.normalizedValue || '').replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
    const cleanB = String(candB.normalizedValue || '').replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
    if (cleanA === cleanB) return true;
  }

  // 4. Consumer Care: normalize phone punctuation
  if (candA.fieldType === 'CONSUMER_CARE_DETAILS') {
    const digitsA = String(candA.normalizedValue || '').replace(/[^0-9a-zA-Z@]/g, '').toLowerCase();
    const digitsB = String(candB.normalizedValue || '').replace(/[^0-9a-zA-Z@]/g, '').toLowerCase();
    if (digitsA === digitsB) return true;
  }

  // 5. Entity Addresses: conservative comparison
  if (
    candA.fieldType === 'MANUFACTURER_NAME_ADDRESS' ||
    candA.fieldType === 'PACKER_NAME_ADDRESS' ||
    candA.fieldType === 'IMPORTER_NAME_ADDRESS'
  ) {
    const textA = String(candA.normalizedValue || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const textB = String(candB.normalizedValue || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

    if (textA === textB) return true;

    // Remove minor punctuation variances like "pvt ltd" vs "private limited"
    const standardA = textA.replace(/\bpvt\b/g, 'private').replace(/\bltd\b/g, 'limited');
    const standardB = textB.replace(/\bpvt\b/g, 'private').replace(/\bltd\b/g, 'limited');
    if (standardA === standardB) return true;

    // Conservative: do NOT consider different organization names identical
    return false;
  }

  // Fallback string equality
  return (
    String(candA.normalizedValue || '').trim().toLowerCase() ===
    String(candB.normalizedValue || '').trim().toLowerCase()
  );
}

/**
 * Reconciles multi-pass candidates using domain-specific field rules.
 */
export function runFieldAwareConsensus(
  passCandidates: Array<{ passName: string; candidates: StructuredDeclarationCandidate[] }>
): StructuredDeclarationCandidate[] {
  // Group candidates by field type
  const fieldGroups = new Map<DeclarationType, StructuredDeclarationCandidate[]>();

  for (const pass of passCandidates) {
    for (const cand of pass.candidates) {
      const list = fieldGroups.get(cand.fieldType) || [];
      list.push(cand);
      fieldGroups.set(cand.fieldType, list);
    }
  }

  const finalizedCandidates: StructuredDeclarationCandidate[] = [];

  for (const [, candidates] of fieldGroups) {
    if (candidates.length === 0) continue;

    // If only one candidate across all passes
    if (candidates.length === 1) {
      finalizedCandidates.push(candidates[0]!);
      continue;
    }

    // Cluster candidates by domain-specific equivalence
    const clusters: Array<{
      representative: StructuredDeclarationCandidate;
      members: StructuredDeclarationCandidate[];
      count: number;
    }> = [];

    for (const cand of candidates) {
      let matched = false;
      for (const cluster of clusters) {
        if (areFieldCandidatesEquivalent(cand, cluster.representative)) {
          cluster.members.push(cand);
          cluster.count++;
          matched = true;
          break;
        }
      }

      if (!matched) {
        clusters.push({
          representative: cand,
          members: [cand],
          count: 1,
        });
      }
    }

    // Sort descending by vote count
    clusters.sort((a, b) => b.count - a.count);

    const topCluster = clusters[0]!;
    const secondCluster = clusters[1];

    // Check for tie / conflict
    const isTie = secondCluster !== undefined && topCluster.count === secondCluster.count;

    if (isTie) {
      // Contradiction between passes -> flag CONFLICT and REQUIRES_VERIFICATION
      const alternates = candidates.filter((c) => c !== topCluster.representative);
      const conflictCandidate: StructuredDeclarationCandidate = {
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
      finalizedCandidates.push(conflictCandidate);
    } else {
      // Dominant cluster wins
      const confidenceTier: ConfidenceTier =
        topCluster.count > 1 ? 'HIGH_CONFIDENCE' : topCluster.representative.confidenceTier;

      const winningCandidate: StructuredDeclarationCandidate = {
        ...topCluster.representative,
        confidenceTier,
        alternateCandidates: secondCluster ? secondCluster.members : undefined,
        traceability: {
          ...topCluster.representative.traceability,
          conflictStatus: clusters.length > 1 ? 'CONSENSUS_RESOLVED' : 'NONE',
          validationStatus: topCluster.representative.isAmbiguous ? 'REQUIRES_VERIFICATION' : 'VALID',
        },
      };
      finalizedCandidates.push(winningCandidate);
    }
  }

  return finalizedCandidates;
}

/**
 * Hybrid Perception Conflict Detector (Phase 10)
 *
 * Compares on-device Local OCR extractions with server-side Gemini extractions.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Gemini NEVER silently overrides local observations.
 * 2. When observations conflict, the system marks CONFLICTING_EVIDENCE and flags for human inspector review.
 * 3. When observations agree, the system marks AGREED and reinforces confidence.
 * 4. No averaging or arbitrary "AI wins" heuristics.
 */

import type {
  Declaration,
  HybridPerceptionSummary,
  PackageAnalysis,
  PerceptionDiscrepancy,
} from '@lm-vision/shared-types';

/**
 * Compares two values for semantic equality
 */
function areValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;

  // Number comparison (allow minor floating point rounding)
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.01;
  }

  // String comparison (case-insensitive trimmed)
  if (typeof a === 'string' && typeof b === 'string') {
    const cleanA = a.trim().toLowerCase();
    const cleanB = b.trim().toLowerCase();
    return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
  }

  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Detects conflicts between Local OCR and Gemini extractions
 */
export function detectPerceptionConflicts(
  localAnalysis: PackageAnalysis,
  remoteAnalysis: PackageAnalysis
): HybridPerceptionSummary {
  const discrepancies: PerceptionDiscrepancy[] = [];
  const resolvedDeclarations: Declaration[] = [];
  let agreedCount = 0;
  let conflictedCount = 0;

  const localMap = new Map(localAnalysis.declarations.map(d => [d.type, d]));
  const remoteMap = new Map(remoteAnalysis.declarations.map(d => [d.type, d]));

  const allTypes = new Set([...localMap.keys(), ...remoteMap.keys()]);

  for (const type of allTypes) {
    const localDecl = localMap.get(type);
    const remoteDecl = remoteMap.get(type);

    // 1. Both detected
    if (localDecl && remoteDecl) {
      const valuesMatch = areValuesEqual(localDecl.normalizedValue, remoteDecl.normalizedValue);
      const unitsMatch = !localDecl.unit && !remoteDecl.unit ? true : localDecl.unit?.toLowerCase() === remoteDecl.unit?.toLowerCase();

      if (valuesMatch && unitsMatch) {
        agreedCount++;
        // Combine declaration with consensus confidence
        resolvedDeclarations.push({
          ...localDecl,
          confidence: Math.min(1.0, Math.max(localDecl.confidence, remoteDecl.confidence) + 0.05),
          rawText: localDecl.rawText || remoteDecl.rawText,
        });
      } else {
        conflictedCount++;
        const discrepancyType = !valuesMatch ? 'VALUE_MISMATCH' : 'UNIT_MISMATCH';
        const reason = !valuesMatch
          ? `Value conflict: Local OCR observed '${String(localDecl.normalizedValue)}', Gemini observed '${String(remoteDecl.normalizedValue)}'.`
          : `Unit conflict: Local OCR observed '${localDecl.unit}', Gemini observed '${remoteDecl.unit}'.`;

        discrepancies.push({
          declarationType: type,
          localValue: localDecl.normalizedValue,
          remoteValue: remoteDecl.normalizedValue,
          localRawText: localDecl.rawText,
          remoteRawText: remoteDecl.rawText,
          localConfidence: localDecl.confidence,
          remoteConfidence: remoteDecl.confidence,
          discrepancyType,
          reason,
        });

        // Retain local observation as primary candidate, but note conflict
        resolvedDeclarations.push({
          ...localDecl,
          confidence: Math.min(localDecl.confidence, remoteDecl.confidence),
        });
      }
    }
    // 2. Only local detected
    else if (localDecl && !remoteDecl) {
      resolvedDeclarations.push(localDecl);
      discrepancies.push({
        declarationType: type,
        localValue: localDecl.normalizedValue,
        localRawText: localDecl.rawText,
        localConfidence: localDecl.confidence,
        discrepancyType: 'MISSING_IN_REMOTE',
        reason: `Field detected by Local OCR but not observed by Gemini.`,
      });
    }
    // 3. Only remote detected
    else if (!localDecl && remoteDecl) {
      resolvedDeclarations.push(remoteDecl);
      discrepancies.push({
        declarationType: type,
        remoteValue: remoteDecl.normalizedValue,
        remoteRawText: remoteDecl.rawText,
        remoteConfidence: remoteDecl.confidence,
        discrepancyType: 'MISSING_IN_LOCAL',
        reason: `Field detected by Gemini but not observed by Local OCR.`,
      });
    }
  }

  const hasConflicts = conflictedCount > 0;
  const status = hasConflicts ? 'CONFLICT' : agreedCount > 0 ? 'AGREED' : 'LOCAL_ONLY';

  return {
    status,
    source: 'HYBRID',
    discrepancies,
    declarationsAgreedCount: agreedCount,
    declarationsConflictedCount: conflictedCount,
    requiresHumanVerification: hasConflicts,
    resolvedDeclarations,
    evaluatedAt: new Date().toISOString(),
  };
}

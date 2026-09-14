/**
 * Phase D: Deterministic Field-Specific Conflict Resolver
 *
 * Implements field-aware comparison and discrepancy detection across multiple evidence sources.
 *
 * ARCHITECTURAL CONSTRAINTS:
 * 1. NEVER silently pick a winner when meaningful evidence conflicts.
 * 2. Do NOT use loose floating-point epsilon to hide real legal differences (e.g. ₹120 vs ₹120.01 is a conflict).
 * 3. Semantic quantity equivalence is supported ONLY through canonical metric base conversion (500 g == 0.5 kg).
 * 4. Dates require exact canonical comparison (03/2026 vs 04/2026 is a conflict).
 * 5. Text comparisons preserve legally relevant entity identities without accidental merging.
 */

import type { DeclarationType } from '@lm-vision/shared-types';

export interface ComparisonResult {
  isEqual: boolean;
  reason?: string;
  normalizedA?: unknown;
  normalizedB?: unknown;
}

/**
 * Converts a metric quantity and unit into its base SI scalar (grams, milliliters, millimeters, or count)
 */
function convertToBaseMetricUnit(
  val: number,
  unit?: string | null
): { baseValue: number; baseDimension: string } | null {
  if (!unit) return null;
  const cleanUnit = unit.trim().toLowerCase();

  switch (cleanUnit) {
    // Mass -> grams
    case 'g':
    case 'gm':
    case 'gms':
    case 'gram':
    case 'grams':
    case 'ग्राम':
    case 'ग्रा.':
    case 'ग्रा':
      return { baseValue: val, baseDimension: 'mass_g' };

    case 'kg':
    case 'kgs':
    case 'kilogram':
    case 'kilograms':
    case 'किग्रा':
    case 'कि.ग्रा.':
    case 'कि.ग्रा':
    case 'किलोग्राम':
      return { baseValue: val * 1000, baseDimension: 'mass_g' };

    case 'mg':
      return { baseValue: val / 1000, baseDimension: 'mass_g' };

    // Volume -> milliliters
    case 'ml':
    case 'mls':
    case 'milliliter':
    case 'milliliters':
    case 'millilitre':
    case 'millilitres':
    case 'मिली':
    case 'मि.ली.':
    case 'मि.ली':
    case 'मिलीलीटर':
      return { baseValue: val, baseDimension: 'volume_ml' };

    case 'l':
    case 'lt':
    case 'ltr':
    case 'liter':
    case 'liters':
    case 'litre':
    case 'litres':
    case 'लीटर':
    case 'ली.':
    case 'ली':
      return { baseValue: val * 1000, baseDimension: 'volume_ml' };

    // Length -> millimeters
    case 'mm':
    case 'millimeter':
      return { baseValue: val, baseDimension: 'length_mm' };

    case 'cm':
    case 'centimeter':
    case 'से.मी.':
    case 'सेंटीमीटर':
      return { baseValue: val * 10, baseDimension: 'length_mm' };

    case 'm':
    case 'meter':
    case 'meters':
    case 'मीटर':
      return { baseValue: val * 1000, baseDimension: 'length_mm' };

    // Count
    case 'n':
    case 'no':
    case 'number':
    case 'numbers':
    case 'unit':
    case 'units':
    case 'piece':
    case 'pieces':
    case 'pc':
    case 'pcs':
    case 'संख्या':
    case 'इकाई':
    case 'नग':
      return { baseValue: val, baseDimension: 'count' };

    default:
      return null;
  }
}

/**
 * Normalizes a date string into standard comparable format (e.g. YYYY-MM or YYYY-MM-DD)
 */
function normalizeDateForComparison(dateStr: string): string {
  const clean = dateStr.trim();

  // Pattern MM/YYYY or MM-YYYY
  const mmyyyy = clean.match(/^([0-9]{1,2})[\/\.-]([0-9]{4})$/);
  if (mmyyyy && mmyyyy[1] && mmyyyy[2]) {
    const month = mmyyyy[1].padStart(2, '0');
    return `${mmyyyy[2]}-${month}`;
  }

  // Pattern DD/MM/YYYY
  const ddmmyyyy = clean.match(/^([0-9]{1,2})[\/\.-]([0-9]{1,2})[\/\.-]([0-9]{4})$/);
  if (ddmmyyyy && ddmmyyyy[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    return `${ddmmyyyy[3]}-${month}-${day}`;
  }

  return clean.toLowerCase();
}

/**
 * Field-specific comparison evaluating semantic equality and returning detailed reasons on mismatch.
 */
export function compareFieldValues(
  fieldType: DeclarationType,
  a: unknown,
  unitA: string | null | undefined,
  b: unknown,
  unitB?: string | null
): ComparisonResult {
  // 1. Handle null/undefined
  if (a == null && b == null) {
    return { isEqual: true };
  }
  if (a == null || b == null) {
    return {
      isEqual: false,
      reason: `One observation is missing: Source A is '${String(a)}', Source B is '${String(b)}'.`,
    };
  }

  // 2. MRP Field: Currency and exact decimal comparison
  if (fieldType === 'MRP' || fieldType === 'UNIT_SALE_PRICE') {
    const numA = typeof a === 'number' ? a : parseFloat(String(a));
    const numB = typeof b === 'number' ? b : parseFloat(String(b));

    if (isNaN(numA) || isNaN(numB)) {
      const match = String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
      return {
        isEqual: match,
        reason: match ? undefined : `MRP string mismatch: '${String(a)}' vs '${String(b)}'.`,
      };
    }

    // STRICT: Exact comparison to 2 decimal places. ₹120 vs ₹120.01 is a real legal difference!
    const roundedA = Math.round(numA * 100) / 100;
    const roundedB = Math.round(numB * 100) / 100;

    if (roundedA === roundedB) {
      return { isEqual: true, normalizedA: roundedA, normalizedB: roundedB };
    }

    return {
      isEqual: false,
      reason: `MRP value discrepancy: observed ₹${roundedA.toFixed(2)} vs ₹${roundedB.toFixed(2)}.`,
      normalizedA: roundedA,
      normalizedB: roundedB,
    };
  }

  // 3. NET_QUANTITY Field: Base metric conversion comparison
  if (fieldType === 'NET_QUANTITY') {
    const numA = typeof a === 'number' ? a : parseFloat(String(a));
    const numB = typeof b === 'number' ? b : parseFloat(String(b));

    if (!isNaN(numA) && !isNaN(numB)) {
      const baseA = convertToBaseMetricUnit(numA, unitA);
      const baseB = convertToBaseMetricUnit(numB, unitB);

      // If both have recognized metric units, compare their base quantities
      if (baseA && baseB) {
        if (baseA.baseDimension !== baseB.baseDimension) {
          return {
            isEqual: false,
            reason: `Dimension mismatch: '${numA} ${unitA}' (${baseA.baseDimension}) vs '${numB} ${unitB}' (${baseB.baseDimension}).`,
          };
        }

        // e.g. 500 g vs 0.5 kg both convert to 500 mass_g
        const diff = Math.abs(baseA.baseValue - baseB.baseValue);
        if (diff < 0.001) {
          return { isEqual: true, normalizedA: baseA.baseValue, normalizedB: baseB.baseValue };
        }

        return {
          isEqual: false,
          reason: `Quantity mismatch: observed ${numA} ${unitA ?? ''} vs ${numB} ${unitB ?? ''}.`,
          normalizedA: baseA.baseValue,
          normalizedB: baseB.baseValue,
        };
      }

      // If one lacks a unit, that is a discrepancy / partial evidence
      if ((unitA && !unitB) || (!unitA && unitB)) {
        return {
          isEqual: false,
          reason: `Unit presence mismatch: '${numA} ${unitA ?? '(no unit)'}' vs '${numB} ${unitB ?? '(no unit)'}'.`,
        };
      }
    }
  }

  // 4. DATE Fields: Strict canonical date comparison
  if (
    fieldType === 'DATE_OF_MANUFACTURE' ||
    fieldType === 'DATE_OF_PACKAGING' ||
    fieldType === 'DATE_OF_IMPORT' ||
    fieldType === 'EXPIRY_DATE_BEST_BEFORE'
  ) {
    const strA = normalizeDateForComparison(String(a));
    const strB = normalizeDateForComparison(String(b));

    if (strA === strB) {
      return { isEqual: true, normalizedA: strA, normalizedB: strB };
    }

    return {
      isEqual: false,
      reason: `Date discrepancy: observed '${String(a)}' vs '${String(b)}'.`,
      normalizedA: strA,
      normalizedB: strB,
    };
  }

  // 5. Country of Origin
  if (fieldType === 'COUNTRY_OF_ORIGIN') {
    const cleanA = String(a).trim().toLowerCase();
    const cleanB = String(b).trim().toLowerCase();

    // Map bilingual equivalents
    const isIndiaA = cleanA === 'india' || cleanA === 'भारत';
    const isIndiaB = cleanB === 'india' || cleanB === 'भारत';

    if (cleanA === cleanB || (isIndiaA && isIndiaB)) {
      return { isEqual: true, normalizedA: cleanA, normalizedB: cleanB };
    }

    return {
      isEqual: false,
      reason: `Country of Origin discrepancy: observed '${String(a)}' vs '${String(b)}'.`,
      normalizedA: cleanA,
      normalizedB: cleanB,
    };
  }

  // 6. Generic Text Fields (Manufacturer, Address, Consumer Care)
  const normA = String(a).trim().toLowerCase().replace(/\s+/g, ' ');
  const normB = String(b).trim().toLowerCase().replace(/\s+/g, ' ');

  if (normA === normB) {
    return { isEqual: true };
  }

  // Allow substring match for address / company only if sufficiently long (> 10 chars)
  if (normA.length > 10 && normB.length > 10 && (normA.includes(normB) || normB.includes(normA))) {
    return { isEqual: true };
  }

  return {
    isEqual: false,
    reason: `Declaration text mismatch: '${String(a)}' vs '${String(b)}'.`,
    normalizedA: normA,
    normalizedB: normB,
  };
}

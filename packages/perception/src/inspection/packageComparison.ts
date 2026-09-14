/**
 * Phase E: Package-to-Package Comparison Engine
 *
 * GUARDRAILS & INVARIANTS:
 * 1. Must validate comparability before attempting semantic comparison.
 * 2. Outputs: COMPARABLE, PARTIALLY_COMPARABLE, or NOT_COMPARABLE.
 * 3. Never invents identity matches. If data is insufficient, explicitly states:
 *    "Insufficient identity evidence for reliable comparison."
 * 4. Package difference ≠ Legal violation. All differences are strictly observational
 *    and informational. Differences are NOT labeled illegal, fraudulent, or suspicious.
 * 5. Statutory compliance is evaluated exclusively by the deterministic Rule Engine.
 */

import type { DeclarationType } from '@lm-vision/shared-types';
import type {
  FieldComparisonDifference,
  PackageComparabilityStatus,
  PackageComparisonResult,
  PackageComparisonSubject,
} from './findingSchema.js';

/**
 * Validates whether two packages share sufficient product identity to be reliably compared.
 */
export function validatePackageComparability(
  pkgA: PackageComparisonSubject,
  pkgB: PackageComparisonSubject
): { comparability: PackageComparabilityStatus; rationale: string } {
  const nameA = (pkgA.productName || '').trim().toLowerCase();
  const nameB = (pkgB.productName || '').trim().toLowerCase();
  const brandA = (pkgA.brandName || '').trim().toLowerCase();
  const brandB = (pkgB.brandName || '').trim().toLowerCase();
  const catA = (pkgA.category || '').trim().toLowerCase();
  const catB = (pkgB.category || '').trim().toLowerCase();
  const skuA = (pkgA.sku || '').trim().toLowerCase();
  const skuB = (pkgB.sku || '').trim().toLowerCase();

  // If both have explicit SKUs matching
  if (skuA && skuB && skuA === skuB) {
    return {
      comparability: 'COMPARABLE',
      rationale: `Exact SKU match (${pkgA.sku}). Packages represent the same product specification.`,
    };
  }

  // Check name & brand presence
  const hasIdentityA = Boolean(nameA || brandA);
  const hasIdentityB = Boolean(nameB || brandB);

  if (!hasIdentityA && !hasIdentityB) {
    return {
      comparability: 'NOT_COMPARABLE',
      rationale:
        'Insufficient identity evidence for reliable comparison. Both packages lack declared product or brand names.',
    };
  }

  if (!hasIdentityA || !hasIdentityB) {
    return {
      comparability: 'PARTIALLY_COMPARABLE',
      rationale:
        'Partial product identity available. One package lacks declared product or brand name.',
    };
  }

  // Both have identity data
  const brandMatch = brandA && brandB && (brandA === brandB || brandA.includes(brandB) || brandB.includes(brandA));
  const nameMatch = nameA && nameB && (nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA));
  const catMatch = catA && catB && catA === catB;

  if (brandMatch && nameMatch) {
    return {
      comparability: 'COMPARABLE',
      rationale: `Consistent brand ('${pkgA.brandName || brandA}') and product commodity title ('${pkgA.productName || nameA}').`,
    };
  }

  if (brandMatch || nameMatch || (catMatch && catA !== '')) {
    return {
      comparability: 'PARTIALLY_COMPARABLE',
      rationale: `Commodity or brand alignment detected (Brand match: ${brandMatch ? 'Yes' : 'No'}, Commodity match: ${catMatch ? 'Yes' : 'No'}). Variation in pack format or title observed.`,
    };
  }

  return {
    comparability: 'NOT_COMPARABLE',
    rationale: `Distinct products observed: '${pkgA.productName || brandA}' vs '${pkgB.productName || brandB}'. Cross-comparison of unrelated commodities is not methodologically sound.`,
  };
}

/**
 * Extracts a declaration value from a subject's declarations or fused package.
 */
function extractFieldValue(
  subject: PackageComparisonSubject,
  fieldType: DeclarationType
): { raw: string; normalized: unknown; unit?: string | null } | null {
  // Check declarations
  const decl = subject.declarations?.find((d) => d.type === fieldType);
  if (decl) {
    return {
      raw: decl.rawText || '',
      normalized: decl.normalizedValue ?? decl.rawText,
      unit: decl.unit,
    };
  }

  // Check fused package
  const fused = subject.fusedPackage?.fields?.[fieldType];
  if (fused && fused.fusedValue !== undefined && fused.fusedValue !== null) {
    return {
      raw: String(fused.fusedValue),
      normalized: fused.fusedValue,
      unit: fused.fusedUnit,
    };
  }

  return null;
}

/**
 * Compares two packages deterministically, strictly treating differences as observational evidence.
 */
export function comparePackages(
  packageA: PackageComparisonSubject,
  packageB: PackageComparisonSubject
): PackageComparisonResult {
  const { comparability, rationale } = validatePackageComparability(packageA, packageB);

  const nameA = packageA.productName || 'Package A';
  const nameB = packageB.productName || 'Package B';
  const brandA = packageA.brandName || 'Brand A';
  const brandB = packageB.brandName || 'Brand B';

  const differences: FieldComparisonDifference[] = [];

  const fieldsToCompare: Array<{ field: DeclarationType; label: string }> = [
    { field: 'MRP', label: 'Maximum Retail Price (MRP)' },
    { field: 'NET_QUANTITY', label: 'Net Quantity' },
    { field: 'GENERIC_NAME', label: 'Generic Name' },
    { field: 'MANUFACTURER_NAME_ADDRESS', label: 'Manufacturer Details' },
    { field: 'DATE_OF_PACKAGING', label: 'Date Marking' },
    { field: 'COUNTRY_OF_ORIGIN', label: 'Country of Origin' },
    { field: 'CONSUMER_CARE_DETAILS', label: 'Consumer Care Helpline' },
  ];

  for (const item of fieldsToCompare) {
    const valA = extractFieldValue(packageA, item.field);
    const valB = extractFieldValue(packageB, item.field);

    if (!valA && !valB) {
      differences.push({
        fieldName: item.label,
        valueA: 'Not declared',
        valueB: 'Not declared',
        hasDifference: false,
        differenceDescription: 'Neither package contains an extracted declaration for this field.',
        isStatutoryViolation: false,
      });
      continue;
    }

    if (!valA || !valB) {
      differences.push({
        fieldName: item.label,
        valueA: valA ? valA.raw : 'Not declared',
        valueB: valB ? valB.raw : 'Not declared',
        hasDifference: true,
        differenceDescription: `Observational difference: Declaration observed on ${valA ? 'Package A' : 'Package B'} but absent on ${valA ? 'Package B' : 'Package A'}.`,
        isStatutoryViolation: false,
      });
      continue;
    }

    // Both present
    const rawMatch = valA.raw.trim().toLowerCase() === valB.raw.trim().toLowerCase();
    const normMatch =
      valA.normalized !== undefined &&
      valB.normalized !== undefined &&
      JSON.stringify(valA.normalized) === JSON.stringify(valB.normalized);

    const hasDiff = !rawMatch && !normMatch;

    differences.push({
      fieldName: item.label,
      valueA: valA.raw || valA.normalized,
      valueB: valB.raw || valB.normalized,
      hasDifference: hasDiff,
      differenceDescription: hasDiff
        ? `Observational difference: Package A states '${valA.raw}' while Package B states '${valB.raw}'.`
        : 'Declarations are identical across both packages.',
      isStatutoryViolation: false,
    });
  }

  // MRP Comparison Calculation
  let mrpComparison: PackageComparisonResult['mrpComparison'];
  const mrpAVal = extractFieldValue(packageA, 'MRP');
  const mrpBVal = extractFieldValue(packageB, 'MRP');

  const numA = typeof mrpAVal?.normalized === 'number' ? mrpAVal.normalized : parseFloat(String(mrpAVal?.raw || ''));
  const numB = typeof mrpBVal?.normalized === 'number' ? mrpBVal.normalized : parseFloat(String(mrpBVal?.raw || ''));

  if (!isNaN(numA) && !isNaN(numB)) {
    const diff = Math.round((numA - numB) * 100) / 100;
    const absDiff = Math.abs(diff);
    const avg = (numA + numB) / 2;
    const pct = avg > 0 ? Math.round((absDiff / avg) * 1000) / 10 : 0;

    let direction: 'A_HIGHER' | 'B_HIGHER' | 'IDENTICAL' | 'UNKNOWN' = 'IDENTICAL';
    if (diff > 0.01) direction = 'A_HIGHER';
    else if (diff < -0.01) direction = 'B_HIGHER';

    mrpComparison = {
      valueA: numA,
      valueB: numB,
      diffAmount: diff,
      percentDiff: pct,
      direction,
      description:
        direction === 'IDENTICAL'
          ? `Both packages declare identical printed MRP of ₹${numA.toFixed(2)}.`
          : direction === 'A_HIGHER'
          ? `Package A printed MRP (₹${numA.toFixed(2)}) is ₹${absDiff.toFixed(2)} higher than Package B (₹${numB.toFixed(2)}).`
          : `Package B printed MRP (₹${numB.toFixed(2)}) is ₹${absDiff.toFixed(2)} higher than Package A (₹${numA.toFixed(2)}).`,
    };
  }

  // Net Quantity Comparison
  let quantityComparison: PackageComparisonResult['quantityComparison'];
  const qtyA = extractFieldValue(packageA, 'NET_QUANTITY');
  const qtyB = extractFieldValue(packageB, 'NET_QUANTITY');
  if (qtyA || qtyB) {
    quantityComparison = {
      valueA: qtyA?.raw || null,
      valueB: qtyB?.raw || null,
      description:
        qtyA?.raw === qtyB?.raw
          ? `Both packages declare identical net quantity: ${qtyA?.raw || '—'}.`
          : `Package A declares '${qtyA?.raw || 'Not detected'}' vs Package B '${qtyB?.raw || 'Not detected'}'.`,
    };
  }

  const diffCount = differences.filter((d) => d.hasDifference).length;
  const summary = `Package comparison completed with status '${comparability}'. ${diffCount} observational field difference(s) detected.`;

  const disclaimer =
    'STATUTORY INTEGRITY NOTICE: Differences between packages are observational and informational. A difference in price, pack size, or declaration between packages does NOT constitute an automatic statutory violation unless evaluated under an applicable Legal Metrology rule by the deterministic Rule Engine.';

  return {
    comparability,
    comparabilityRationale: rationale,
    packageA: { id: packageA.inspectionId, name: nameA, brand: brandA },
    packageB: { id: packageB.inspectionId, name: nameB, brand: brandB },
    differences,
    mrpComparison,
    quantityComparison,
    summary,
    disclaimer,
  };
}

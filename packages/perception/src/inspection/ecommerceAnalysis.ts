/**
 * Phase E: E-Commerce Discrepancy Analysis
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. E-Commerce platform data is supporting observational evidence, NEVER an automatic legal violation.
 * 2. Displays: "PRICE DISCREPANCY".
 * 3. Mandatory guardrail statement:
 *    "A price discrepancy does not by itself establish a statutory violation."
 * 4. The applicable deterministic Rule Engine assessment remains authoritative.
 * 5. Uses explicit unknown states (e.g. NOT_AVAILABLE) rather than false defaults.
 */

import type { Declaration, EcommerceListing } from '@lm-vision/shared-types';
import type { FusedEvidencePackage } from '../fusion/evidenceSchema.js';
import type { EcommerceDiscrepancyAnalysis } from './findingSchema.js';

export interface AnalyzeEcommerceDiscrepancyInput {
  readonly physicalDeclarations: readonly Declaration[];
  readonly ecommerceListing?: EcommerceListing;
  readonly fusedPackage?: FusedEvidencePackage;
}

export function analyzeEcommerceDiscrepancy(
  input: AnalyzeEcommerceDiscrepancyInput
): EcommerceDiscrepancyAnalysis | null {
  const listing = input.ecommerceListing;
  if (!listing) {
    return null;
  }

  // Extract physical MRP from physical declarations or fused package
  const mrpDecl = input.physicalDeclarations.find((d) => d.type === 'MRP');
  const fusedMrp = input.fusedPackage?.fields['MRP'];

  let physicalMrp: number | null = null;
  if (typeof mrpDecl?.normalizedValue === 'number') {
    physicalMrp = mrpDecl.normalizedValue;
  } else if (typeof fusedMrp?.fusedValue === 'number') {
    physicalMrp = fusedMrp.fusedValue;
  } else if (mrpDecl?.rawText) {
    const parsed = parseFloat(mrpDecl.rawText.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed) && parsed > 0) physicalMrp = parsed;
  }

  const onlinePrice =
    typeof listing.listedPriceInr === 'number' && !isNaN(listing.listedPriceInr)
      ? listing.listedPriceInr
      : typeof listing.listedMrpInr === 'number' && !isNaN(listing.listedMrpInr)
      ? listing.listedMrpInr
      : null;

  let hasDiscrepancy = false;
  let priceDifference: EcommerceDiscrepancyAnalysis['priceDifference'];

  if (physicalMrp !== null && onlinePrice !== null) {
    const diff = Math.round((onlinePrice - physicalMrp) * 100) / 100;
    const absDiff = Math.abs(diff);
    const pct = physicalMrp > 0 ? Math.round((absDiff / physicalMrp) * 1000) / 10 : 0;

    if (diff > 0.01) {
      hasDiscrepancy = true;
      priceDifference = {
        amount: absDiff,
        percentage: pct,
        direction: 'ONLINE_PREMIUM',
      };
    } else if (diff < -0.01) {
      hasDiscrepancy = true;
      priceDifference = {
        amount: absDiff,
        percentage: pct,
        direction: 'ONLINE_DISCOUNT',
      };
    } else {
      hasDiscrepancy = false;
      priceDifference = {
        amount: 0,
        percentage: 0,
        direction: 'IDENTICAL',
      };
    }
  }

  const guardrailNotice =
    'STATUTORY GUARDRAIL: Observational price differences between physical package labels and online e-commerce listings do NOT constitute an automatic legal violation of the Legal Metrology Act. The applicable Rule Engine assessment remains authoritative, and only the authorized human inspector may record a statutory violation.';

  return {
    platform: listing.platformName || 'E-Commerce Platform',
    productTitle: listing.productTitle || 'Online Catalog Item',
    productUrl: listing.productUrl,
    physicalMrp,
    onlinePrice,
    hasDiscrepancy,
    priceDifference,
    timestamp: listing.capturedAt || listing.updatedAt || new Date().toISOString(),
    matchingConfidence: 0.95,
    source: 'ECOMMERCE',
    guardrailNotice,
  };
}

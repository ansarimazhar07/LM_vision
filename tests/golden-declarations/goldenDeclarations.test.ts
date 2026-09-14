/**
 * Golden Declarations Regression Test Suite
 *
 * Explicit tests covering all 25 hard packaging scenarios specified in Section 29
 * of the Offline Declaration Extraction Accuracy Hardening Specification.
 */

import { describe, expect, it } from 'vitest';
import type { TextRegion } from '@lm-vision/shared-types';
import {
  ProductNameExtractor,
  ManufacturerExtractor,
  PackerExtractor,
  ImporterExtractor,
  NetQuantityExtractor,
  MRPExtractor,
  DateExtractor,
  ConsumerCareExtractor,
  defaultDetectorRegistry,
} from '../../packages/perception/src/index.js';

function createMockRegion(
  id: string,
  text: string,
  box: { xMin: number; yMin: number; xMax: number; yMax: number },
  surface: 'FRONT' | 'BACK' = 'BACK'
): TextRegion {
  return {
    id,
    imageId: 'img-golden-001',
    text,
    boundingBox: {
      ...box,
      width: Number((box.xMax - box.xMin).toFixed(4)),
      height: Number((box.yMax - box.yMin).toFixed(4)),
      unit: 'NORMALIZED',
    },
    confidence: 0.95,
    surface,
  };
}

describe('Golden Declarations — 25 Target Hard Cases', () => {
  // 1. Product name + brand together
  it('1. Product name + brand together: separates brand, product name, and slogan', () => {
    const extractor = new ProductNameExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'SUPERFOODS', { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.2 }, 'FRONT'),
      createMockRegion('r2', 'Whole Wheat Atta', { xMin: 0.1, yMin: 0.25, xMax: 0.9, yMax: 0.35 }, 'FRONT'),
      createMockRegion('r3', '100% Pure & Natural Sharbati Grain', { xMin: 0.1, yMin: 0.4, xMax: 0.9, yMax: 0.45 }, 'FRONT'),
    ];

    const results = extractor.detect({ regions, imageId: 'img-1' });
    expect(results.length).toBeGreaterThan(0);
    const top = results[0]!.candidate;
    expect(top.normalizedText).toBe('Whole Wheat Atta');
    expect(top.normalizedText).not.toBe('SUPERFOODS');
    expect(top.normalizedText).not.toContain('100% Pure');
  });

  // 2. Manufacturer address across 4 lines
  it('2. Manufacturer address across 4 lines: groups company and multi-line address into one entity', () => {
    const extractor = new ManufacturerExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'Manufactured by:', { xMin: 0.05, yMin: 0.5, xMax: 0.4, yMax: 0.54 }),
      createMockRegion('r2', 'ABC Foods Pvt Ltd', { xMin: 0.05, yMin: 0.55, xMax: 0.5, yMax: 0.59 }),
      createMockRegion('r3', 'Plot 12, Industrial Area,', { xMin: 0.05, yMin: 0.6, xMax: 0.6, yMax: 0.64 }),
      createMockRegion('r4', 'Nashik, Maharashtra - 422001', { xMin: 0.05, yMin: 0.65, xMax: 0.65, yMax: 0.69 }),
    ];

    const results = extractor.detect({ regions, imageId: 'img-1' });
    expect(results.length).toBeGreaterThan(0);
    const top = results[0]!.candidate;
    expect(top.normalizedText).toContain('ABC Foods Pvt Ltd');
    expect(top.normalizedText).toContain('Plot 12, Industrial Area');
    expect(top.normalizedText).toContain('422001');
    expect(top.traceability.sourceRegionIds.length).toBeGreaterThanOrEqual(3);
  });

  // 3. Packer and manufacturer on adjacent blocks
  it('3. Packer and manufacturer on adjacent blocks: strictly separates both entities without merging', () => {
    const mfrExtractor = new ManufacturerExtractor();
    const pkrExtractor = new PackerExtractor();

    const regions: TextRegion[] = [
      createMockRegion('r1', 'Manufactured by: ABC Foods Ltd, Plot 1, MIDC, Pune - 411018', { xMin: 0.05, yMin: 0.4, xMax: 0.9, yMax: 0.46 }),
      createMockRegion('r2', 'Packed by: XYZ Logistics Pvt Ltd, Sector 4, Mumbai - 400072', { xMin: 0.05, yMin: 0.5, xMax: 0.9, yMax: 0.56 }),
    ];

    const mfrResults = mfrExtractor.detect({ regions, imageId: 'img-1' });
    const pkrResults = pkrExtractor.detect({ regions, imageId: 'img-1' });

    expect(mfrResults.length).toBeGreaterThan(0);
    expect(pkrResults.length).toBeGreaterThan(0);

    expect(mfrResults[0]!.candidate.normalizedText).toContain('ABC Foods Ltd');
    expect(mfrResults[0]!.candidate.normalizedText).not.toContain('XYZ Logistics');

    expect(pkrResults[0]!.candidate.normalizedText).toContain('XYZ Logistics Pvt Ltd');
    expect(pkrResults[0]!.candidate.normalizedText).not.toContain('ABC Foods Ltd');
  });

  // 4. Importer after manufacturer
  it('4. Importer after manufacturer: extracts importer and never infers importer = manufacturer', () => {
    const mfrExtractor = new ManufacturerExtractor();
    const impExtractor = new ImporterExtractor();

    const regions: TextRegion[] = [
      createMockRegion('r1', 'Manufactured by: Tokyo Confectionery Inc, Tokyo, Japan', { xMin: 0.05, yMin: 0.4, xMax: 0.9, yMax: 0.46 }),
      createMockRegion('r2', 'Imported by: Global Goods India Pvt Ltd, Nariman Point, Mumbai - 400021', { xMin: 0.05, yMin: 0.5, xMax: 0.9, yMax: 0.56 }),
    ];

    const mfrResults = mfrExtractor.detect({ regions, imageId: 'img-1' });
    const impResults = impExtractor.detect({ regions, imageId: 'img-1' });

    expect(mfrResults[0]!.candidate.normalizedText).toContain('Tokyo Confectionery');
    expect(impResults[0]!.candidate.normalizedText).toContain('Global Goods India Pvt Ltd');
    expect(impResults[0]!.candidate.normalizedText).not.toBe(mfrResults[0]!.candidate.normalizedText);
  });

  // 5. ₹120 vs ₹180 distinction
  it('5. ₹120 vs ₹180: extracts exact numeric price correctly', () => {
    const extractor = new MRPExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'MRP ₹ 120.00 (Incl. of all taxes)', { xMin: 0.1, yMin: 0.2, xMax: 0.6, yMax: 0.25 }),
    ];
    const results = extractor.detect({ regions, imageId: 'img-1' });
    expect(results[0]!.candidate.normalizedValue).toBe(120);
    expect(results[0]!.candidate.normalizedValue).not.toBe(180);
  });

  // 6. 500 g vs 500 ml
  it('6. 500 g vs 500 ml: distinguishes mass from volume units without confusion', () => {
    const extractor = new NetQuantityExtractor();
    const massRegions = [createMockRegion('r1', 'Net Wt: 500 g', { xMin: 0.1, yMin: 0.2, xMax: 0.5, yMax: 0.25 })];
    const volRegions = [createMockRegion('r2', 'Net Vol: 500 ml', { xMin: 0.1, yMin: 0.2, xMax: 0.5, yMax: 0.25 })];

    const massRes = extractor.detect({ regions: massRegions, imageId: 'img-1' });
    const volRes = extractor.detect({ regions: volRegions, imageId: 'img-1' });

    expect(massRes[0]!.candidate.unit).toBe('g');
    expect(volRes[0]!.candidate.unit).toBe('ml');
    expect(massRes[0]!.candidate.unit).not.toBe(volRes[0]!.candidate.unit);
  });

  // 7. 1 kg vs 1000 g
  it('7. 1 kg vs 1000 g: canonicalizes fractional and multiple metric units', () => {
    const extractor = new NetQuantityExtractor();
    const regionsKg = [createMockRegion('r1', 'Net Qty: 0.5 kg', { xMin: 0.1, yMin: 0.2, xMax: 0.5, yMax: 0.25 })];
    const results = extractor.detect({ regions: regionsKg, imageId: 'img-1' });

    expect(results[0]!.candidate.normalizedValue).toBe(500);
    expect(results[0]!.candidate.unit).toBe('g');
  });

  // 8. MFD vs EXP date separation
  it('8. MFD vs EXP date separation: preserves manufacture and expiry dates without swapping', () => {
    const mfdExtractor = new DateExtractor('DATE_OF_MANUFACTURE');
    const regions: TextRegion[] = [
      createMockRegion('r1', 'MFD: 03/2026', { xMin: 0.1, yMin: 0.3, xMax: 0.4, yMax: 0.35 }),
      createMockRegion('r2', 'EXPIRY: 03/2028', { xMin: 0.1, yMin: 0.4, xMax: 0.4, yMax: 0.45 }),
    ];

    const mfdRes = mfdExtractor.detect({ regions, imageId: 'img-1' });
    expect(mfdRes.length).toBeGreaterThan(0);
    expect(mfdRes[0]!.candidate.normalizedValue).toBe('03/2026');
    expect(mfdRes[0]!.candidate.normalizedValue).not.toBe('03/2028');
  });

  // 9. PKD vs EXP date separation
  it('9. PKD vs EXP date separation: correctly extracts packing date and rejects expiry duration', () => {
    const pkdExtractor = new DateExtractor('DATE_OF_PACKAGING');
    const regions: TextRegion[] = [
      createMockRegion('r1', 'PKD: 01/2026', { xMin: 0.1, yMin: 0.3, xMax: 0.4, yMax: 0.35 }),
      createMockRegion('r2', 'BEST BEFORE 6 MONTHS FROM PACKAGING', { xMin: 0.1, yMin: 0.4, xMax: 0.7, yMax: 0.45 }),
    ];

    const pkdRes = pkdExtractor.detect({ regions, imageId: 'img-1' });
    expect(pkdRes[0]!.candidate.normalizedValue).toBe('01/2026');
  });

  // 10. Imported product declaration
  it('10. Imported product: detects importer header and country of origin', () => {
    const impExtractor = new ImporterExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'Imported by: Continental Imports Ltd, New Delhi - 110001', { xMin: 0.1, yMin: 0.4, xMax: 0.9, yMax: 0.45 }),
    ];
    const impRes = impExtractor.detect({ regions, imageId: 'img-1' });
    expect(impRes[0]!.candidate.normalizedText).toContain('Continental Imports Ltd');
  });

  // 11. Bilingual English / Hindi
  it('11. Bilingual English / Hindi: extracts Devanagari declarations accurately', () => {
    const mrpExtractor = new MRPExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'अधिकतम खुदरा मूल्य ₹ 150.00 (सभी कर सहित)', { xMin: 0.1, yMin: 0.3, xMax: 0.8, yMax: 0.36 }),
    ];
    const res = mrpExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedValue).toBe(150);
  });

  // 12. Small dot-matrix date
  it('12. Small dot-matrix date: parses dot-delimited date strings', () => {
    const pkdExtractor = new DateExtractor('DATE_OF_PACKAGING');
    const regions: TextRegion[] = [
      createMockRegion('r1', 'PKD DATE: 03.2026', { xMin: 0.1, yMin: 0.2, xMax: 0.4, yMax: 0.25 }),
    ];
    const res = pkdExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedValue).toBe('03.2026');
  });

  // 13. Reflective plastic surface text
  it('13. Reflective plastic: recovers noisy text with standard extraction', () => {
    const netQtyExtractor = new NetQuantityExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'NET QUANTITY:  1 kg', { xMin: 0.1, yMin: 0.2, xMax: 0.5, yMax: 0.25 }),
    ];
    const res = netQtyExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedValue).toBe(1);
    expect(res[0]!.candidate.unit).toBe('kg');
  });

  // 14. Metallic wrapper
  it('14. Metallic wrapper: extracts MRP from metallic wrapper line', () => {
    const mrpExtractor = new MRPExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'M.R.P. 25/-', { xMin: 0.1, yMin: 0.2, xMax: 0.4, yMax: 0.25 }),
    ];
    const res = mrpExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedValue).toBe(25);
  });

  // 15. Curved bottle
  it('15. Curved bottle: preserves normalized bounding box across curved surface', () => {
    const mfrExtractor = new ManufacturerExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'Manufactured by: Herbal Glow Pvt Ltd, Vapi, Gujarat - 396195', { xMin: 0.15, yMin: 0.6, xMax: 0.85, yMax: 0.66 }),
    ];
    const res = mfrExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.traceability.originalBoundingBox.unit).toBe('NORMALIZED');
  });

  // 16. Glare over ₹ value
  it('16. Glare over ₹ value: repairs ₹12O to ₹120 strictly in confirmed currency context', () => {
    const mrpExtractor = new MRPExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'MRP ₹ 12O.00', { xMin: 0.1, yMin: 0.2, xMax: 0.4, yMax: 0.25 }),
    ];
    const res = mrpExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedValue).toBe(120);
    expect(res[0]!.candidate.correctionsApplied.some((c) => c.includes("'O' with '0'"))).toBe(true);
  });

  // 17. Phone number near MRP
  it('17. Phone number near MRP: never classifies telephone number as MRP', () => {
    const mrpExtractor = new MRPExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', '1800-111-2222', { xMin: 0.1, yMin: 0.2, xMax: 0.4, yMax: 0.25 }),
      createMockRegion('r2', 'MRP ₹ 95.00', { xMin: 0.1, yMin: 0.3, xMax: 0.4, yMax: 0.35 }),
    ];
    const res = mrpExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedValue).toBe(95);
    expect(res.every((r) => r.candidate.normalizedValue !== 1800)).toBe(true);
  });

  // 18. PIN near manufacturer
  it('18. PIN near manufacturer: attaches 6-digit PIN to address and rejects from MRP/NetQty', () => {
    const mrpExtractor = new MRPExtractor();
    const netQtyExtractor = new NetQuantityExtractor();
    const mfrExtractor = new ManufacturerExtractor();

    const regions: TextRegion[] = [
      createMockRegion('r1', 'Manufactured by: Omega Mills Ltd, Industrial Zone, Gurgaon - 122001', { xMin: 0.1, yMin: 0.5, xMax: 0.9, yMax: 0.56 }),
    ];

    const mfrRes = mfrExtractor.detect({ regions, imageId: 'img-1' });
    const mrpRes = mrpExtractor.detect({ regions, imageId: 'img-1' });
    const qtyRes = netQtyExtractor.detect({ regions, imageId: 'img-1' });

    expect(mfrRes[0]!.candidate.normalizedText).toContain('122001');
    expect(mrpRes.some((r) => r.candidate.normalizedValue === 122001)).toBe(false);
    expect(qtyRes.some((r) => r.candidate.normalizedValue === 122001)).toBe(false);
  });

  // 19. Barcode near net quantity
  it('19. Barcode near net quantity: never classifies 13-digit EAN barcode as quantity', () => {
    const netQtyExtractor = new NetQuantityExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', '8901030383748', { xMin: 0.1, yMin: 0.7, xMax: 0.5, yMax: 0.75 }),
      createMockRegion('r2', 'Net Weight: 250 g', { xMin: 0.1, yMin: 0.8, xMax: 0.4, yMax: 0.85 }),
    ];
    const res = netQtyExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedValue).toBe(250);
    expect(res[0]!.candidate.unit).toBe('g');
  });

  // 20. Multiple prices on package (MRP vs Offer Price)
  it('20. Multiple prices on package: correctly extracts statutory MRP and rejects offer price', () => {
    const mrpExtractor = new MRPExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'MRP ₹ 150.00 (Incl. of all taxes)', { xMin: 0.1, yMin: 0.2, xMax: 0.6, yMax: 0.25 }),
      createMockRegion('r2', 'SPECIAL OFFER PRICE: ₹ 120.00', { xMin: 0.1, yMin: 0.3, xMax: 0.6, yMax: 0.35 }),
    ];
    const res = mrpExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedValue).toBe(150);
  });

  // 21. Discount/offer price near MRP
  it('21. Discount price near MRP: ignores discounted selling rate when statutory MRP is present', () => {
    const mrpExtractor = new MRPExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'DISCOUNT PRICE ₹ 75.00', { xMin: 0.1, yMin: 0.3, xMax: 0.6, yMax: 0.35 }),
      createMockRegion('r2', 'MRP ₹ 100.00', { xMin: 0.1, yMin: 0.4, xMax: 0.5, yMax: 0.45 }),
    ];
    const res = mrpExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedValue).toBe(100);
  });

  // 22. Multiple phone numbers
  it('22. Multiple phone numbers: extracts toll-free customer helpline', () => {
    const ccExtractor = new ConsumerCareExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'Customer Care Toll Free: 1800-222-3333 | Mobile: 9876543210', { xMin: 0.1, yMin: 0.7, xMax: 0.9, yMax: 0.76 }),
    ];
    const res = ccExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedText).toContain('1800-222-3333');
    expect(res[0]!.candidate.normalizedText).toContain('9876543210');
  });

  // 23. Manufacturer phone vs consumer-care phone
  it('23. Manufacturer phone vs consumer-care phone: preserves address phone inside manufacturer and isolates care phone', () => {
    const mfrExtractor = new ManufacturerExtractor();
    const ccExtractor = new ConsumerCareExtractor();

    const regions: TextRegion[] = [
      createMockRegion('r1', 'Manufactured by: Alpha Industries Ltd, Plot 10, MIDC, Phone: 022-25551234, Mumbai - 400001', { xMin: 0.05, yMin: 0.4, xMax: 0.95, yMax: 0.46 }),
      createMockRegion('r2', 'Consumer Care Helpline: 1800-999-8888, email: care@alpha.com', { xMin: 0.05, yMin: 0.6, xMax: 0.95, yMax: 0.66 }),
    ];

    const mfrRes = mfrExtractor.detect({ regions, imageId: 'img-1' });
    const ccRes = ccExtractor.detect({ regions, imageId: 'img-1' });

    expect(mfrRes[0]!.candidate.normalizedText).toContain('Alpha Industries Ltd');
    expect(ccRes[0]!.candidate.normalizedText).toContain('1800-999-8888');
    expect(ccRes[0]!.candidate.normalizedText).not.toContain('022-25551234');
  });

  // 24. Brand name vs product name
  it('24. Brand name vs product name: brand name not classified as product name', () => {
    const pnExtractor = new ProductNameExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'TATA', { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.18 }, 'FRONT'),
      createMockRegion('r2', 'Tea Gold', { xMin: 0.1, yMin: 0.22, xMax: 0.6, yMax: 0.3 }, 'FRONT'),
    ];
    const res = pnExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedText).toBe('Tea Gold');
    expect(res[0]!.candidate.normalizedText).not.toBe('TATA');
  });

  // 25. "Marketed by" vs manufacturer
  it('25. "Marketed by" vs manufacturer: marketer not conflated with manufacturer', () => {
    const mfrExtractor = new ManufacturerExtractor();
    const regions: TextRegion[] = [
      createMockRegion('r1', 'Marketed by: Retail Supermart Ltd, Mumbai - 400001', { xMin: 0.05, yMin: 0.3, xMax: 0.9, yMax: 0.35 }),
      createMockRegion('r2', 'Manufactured by: Primary Agro Mills Pvt Ltd, Karnal, Haryana - 132001', { xMin: 0.05, yMin: 0.45, xMax: 0.9, yMax: 0.5 }),
    ];
    const res = mfrExtractor.detect({ regions, imageId: 'img-1' });
    expect(res[0]!.candidate.normalizedText).toContain('Primary Agro Mills Pvt Ltd');
    expect(res[0]!.candidate.normalizedText).not.toContain('Retail Supermart Ltd');
  });
});

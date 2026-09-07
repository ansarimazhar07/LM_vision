/**
 * Controlled Package Test Dataset (Phase 10)
 *
 * Realistic Indian Packaged Commodities dataset with OCR mock text,
 * ground truth declarations, packaging geometry, and expected statutory compliance outcomes.
 */

import type { PackageSurface } from '@lm-vision/shared-types';

export interface ControlledPackageFixture {
  id: string;
  name: string;
  category: string;
  surface: PackageSurface;
  rawOcrText: string;
  groundTruth: {
    mrp: number;
    mrpRaw: string;
    netQuantity: number;
    netQuantityUnit: string;
    packagingDate: string; // ISO format or month-year
    manufacturer: string;
    consumerCarePhone: string;
    consumerCareEmail: string;
    countryOfOrigin: string;
    genericName: string;
  };
  imageMeta: {
    width: number;
    height: number;
    mimeType: string;
    simulatedSharpness: number;
    simulatedBrightness: number;
  };
  expectedCompliance: {
    mrpRulePass: boolean;
    netQtyRulePass: boolean;
    dateRulePass: boolean;
    mfrRulePass: boolean;
    overallCompliant: boolean;
  };
}

export const CONTROLLED_PACKAGE_DATASET: ControlledPackageFixture[] = [
  // 1. Atta 500g pouch
  {
    id: 'pkg-atta-500g',
    name: 'Golden Mills Whole Wheat Atta 500g',
    category: 'FOOD',
    surface: 'FRONT',
    rawOcrText: `
GOLDEN MILLS
WHOLE WHEAT ATTA
100% Sharbati Wheat
M.R.P. Rs. 45.00 (Inclusive of all taxes)
Net Qty: 500 g
Pkd: 03/2026
Mfg & Pkd by: Golden Mills Pvt. Ltd., Plot 12, Industrial Area, Sector 58, Faridabad, Haryana - 121004
Customer Care: 1800-111-2222 | care@goldenmills.com
Country of Origin: India
Batch No: GM-2026-03-A
Best Before 6 Months From Packaging
`,
    groundTruth: {
      mrp: 45.0,
      mrpRaw: 'M.R.P. Rs. 45.00 (Inclusive of all taxes)',
      netQuantity: 500,
      netQuantityUnit: 'g',
      packagingDate: '2026-03',
      manufacturer: 'Golden Mills Pvt. Ltd., Plot 12, Industrial Area, Sector 58, Faridabad, Haryana - 121004',
      consumerCarePhone: '1800-111-2222',
      consumerCareEmail: 'care@goldenmills.com',
      countryOfOrigin: 'India',
      genericName: 'Whole Wheat Atta',
    },
    imageMeta: {
      width: 1920,
      height: 1080,
      mimeType: 'image/jpeg',
      simulatedSharpness: 0.88,
      simulatedBrightness: 0.82,
    },
    expectedCompliance: {
      mrpRulePass: true,
      netQtyRulePass: true,
      dateRulePass: true,
      mfrRulePass: true,
      overallCompliant: true,
    },
  },

  // 2. Shampoo 200ml bottle
  {
    id: 'pkg-shampoo-200ml',
    name: 'Velvet Anti-Dandruff Shampoo 200ml',
    category: 'COSMETICS',
    surface: 'BACK',
    rawOcrText: `
VELVET HAIR CARE
ANTI-DANDRUFF SHAMPOO
With Tea Tree Oil & Vitamin E
MRP ₹ 185.00 (Incl. of all taxes)
Net Vol: 200 ml
Mfg Date: 01/2026
Manufactured by: Velvet Cosmetics Ltd., 45 Chemical Zone, Vapi, Gujarat - 396195
Consumer Support: 1800-222-3333, feedback@velvet.in
Country of Origin: India
Use within 24 months from mfg.
`,
    groundTruth: {
      mrp: 185.0,
      mrpRaw: 'MRP ₹ 185.00 (Incl. of all taxes)',
      netQuantity: 200,
      netQuantityUnit: 'ml',
      packagingDate: '2026-01',
      manufacturer: 'Velvet Cosmetics Ltd., 45 Chemical Zone, Vapi, Gujarat - 396195',
      consumerCarePhone: '1800-222-3333',
      consumerCareEmail: 'feedback@velvet.in',
      countryOfOrigin: 'India',
      genericName: 'Anti-Dandruff Shampoo',
    },
    imageMeta: {
      width: 2048,
      height: 1536,
      mimeType: 'image/jpeg',
      simulatedSharpness: 0.91,
      simulatedBrightness: 0.79,
    },
    expectedCompliance: {
      mrpRulePass: true,
      netQtyRulePass: true,
      dateRulePass: true,
      mfrRulePass: true,
      overallCompliant: true,
    },
  },

  // 3. Biscuits 100g box
  {
    id: 'pkg-biscuits-100g',
    name: 'Crisp Bakers Butter Cookies 100g',
    category: 'FOOD',
    surface: 'FRONT',
    rawOcrText: `
CRISP BAKERS
BUTTER COOKIES
Rich Butter Taste
MRP Rs 30.00 (INCL. OF ALL TAXES)
Net Weight: 100 g
Packed: 02/2026
Mfg by: Crisp Bakers India Ltd., Survey 89, Peenya, Bengaluru, Karnataka - 560058
Consumer Cell: 080-28390000, consumer@crispbakers.com
Made in India
Store in a cool dry place.
`,
    groundTruth: {
      mrp: 30.0,
      mrpRaw: 'MRP Rs 30.00 (INCL. OF ALL TAXES)',
      netQuantity: 100,
      netQuantityUnit: 'g',
      packagingDate: '2026-02',
      manufacturer: 'Crisp Bakers India Ltd., Survey 89, Peenya, Bengaluru, Karnataka - 560058',
      consumerCarePhone: '080-28390000',
      consumerCareEmail: 'consumer@crispbakers.com',
      countryOfOrigin: 'India',
      genericName: 'Butter Cookies',
    },
    imageMeta: {
      width: 1600,
      height: 1200,
      mimeType: 'image/jpeg',
      simulatedSharpness: 0.85,
      simulatedBrightness: 0.84,
    },
    expectedCompliance: {
      mrpRulePass: true,
      netQtyRulePass: true,
      dateRulePass: true,
      mfrRulePass: true,
      overallCompliant: true,
    },
  },

  // 4. Edible Oil 1L pouch
  {
    id: 'pkg-oil-1l',
    name: 'Pure Foods Refined Sunflower Oil 1L',
    category: 'FOOD',
    surface: 'FRONT',
    rawOcrText: `
PURE FOODS
REFINED SUNFLOWER OIL
Fortified with Vitamin A & D
Maximum Retail Price ₹ 165.00 (Inclusive of all taxes)
Net Qty: 1 l (910 g)
Pkd Date: 04/2026
Packed & Marketed by: Pure Foods Oil Refinery, NH-8, Mehsana, Gujarat - 384002
Toll Free: 1800-444-5555 | support@purefoods.co.in
Country of Origin: India
`,
    groundTruth: {
      mrp: 165.0,
      mrpRaw: 'Maximum Retail Price ₹ 165.00 (Inclusive of all taxes)',
      netQuantity: 1,
      netQuantityUnit: 'l',
      packagingDate: '2026-04',
      manufacturer: 'Pure Foods Oil Refinery, NH-8, Mehsana, Gujarat - 384002',
      consumerCarePhone: '1800-444-5555',
      consumerCareEmail: 'support@purefoods.co.in',
      countryOfOrigin: 'India',
      genericName: 'Refined Sunflower Oil',
    },
    imageMeta: {
      width: 1920,
      height: 1080,
      mimeType: 'image/jpeg',
      simulatedSharpness: 0.89,
      simulatedBrightness: 0.81,
    },
    expectedCompliance: {
      mrpRulePass: true,
      netQtyRulePass: true,
      dateRulePass: true,
      mfrRulePass: true,
      overallCompliant: true,
    },
  },
];

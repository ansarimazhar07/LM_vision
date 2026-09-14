/**
 * Dispersed Packaging Benchmark Dataset (Pre-Phase-Final Accuracy Gate)
 *
 * 20+ diverse real-world Indian packaging cases featuring dispersed declarations
 * across remote surfaces (bottle neck, shoulder, cap, lid, sachet top seal,
 * bottom seal, crimp, folded flap, side panel, etc.)
 */

import type { BoundingBox, PackageSurface } from '@lm-vision/shared-types';
import type { PackagingContainerType } from '../../packages/perception/src/surfaces/surfaceTaxonomy.js';

export interface DispersedBenchmarkSurface {
  surface: PackageSurface;
  imageId: string;
  condition?: {
    isBlurry?: boolean;
    hasGlare?: boolean;
    isCurved?: boolean;
    isMetallic?: boolean;
    isDotMatrix?: boolean;
  };
  ocrLines: Array<{
    id: string;
    text: string;
    boundingBox: BoundingBox;
    confidence: number;
  }>;
}

export interface DispersedBenchmarkProduct {
  id: string;
  name: string;
  containerType: PackagingContainerType;
  capturedSurfaces: DispersedBenchmarkSurface[];
  groundTruth: {
    productName?: string;
    netQuantity?: { value: number; unit: string };
    mrp?: { value: number; currency: 'INR' };
    dates?: {
      manufacture?: string | null;
      packing?: string | null;
      import?: string | null;
    };
    manufacturer?: string | null;
    consumerCare?: string | null;
  };
  expectedSearchStatus: {
    mrp: 'FOUND' | 'CONFLICT' | 'SEARCH_INCOMPLETE' | 'SEARCH_COMPLETED_NO_EVIDENCE' | 'INSPECTOR_CONFIRMED';
    dates?: 'FOUND' | 'CONFLICT' | 'SEARCH_INCOMPLETE' | 'SEARCH_COMPLETED_NO_EVIDENCE';
  };
  expectedEvidenceStatus?: {
    mrp?: 'AGREEMENT' | 'CONFLICT' | 'INSUFFICIENT' | 'INSPECTOR_CONFIRMED';
  };
  expectedRecommendationSurface?: PackageSurface;
}

export const DISPERSED_BENCHMARK_DATASET: DispersedBenchmarkProduct[] = [
  // 1. MRP only on bottle neck
  {
    id: 'disp-001',
    name: 'Himalayan Spring Mineral Water 1L Bottle',
    containerType: 'BOTTLE',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-001-front',
        ocrLines: [
          { id: 'l1', text: 'HIMALAYAN SPRING', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.3, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NATURAL MINERAL WATER', boundingBox: { xMin: 0.1, yMin: 0.32, xMax: 0.9, yMax: 0.45, unit: 'NORMALIZED' }, confidence: 0.93 },
          { id: 'l3', text: 'NET QUANTITY: 1 L', boundingBox: { xMin: 0.2, yMin: 0.7, xMax: 0.8, yMax: 0.85, unit: 'NORMALIZED' }, confidence: 0.96 },
        ],
      },
      {
        surface: 'BACK',
        imageId: 'img-disp-001-back',
        ocrLines: [
          { id: 'l4', text: 'MANUFACTURED BY: HIMALAYAN SPRINGS LTD, SOLAN, HP - 173212', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.3, unit: 'NORMALIZED' }, confidence: 0.92 },
          { id: 'l5', text: 'CONSUMER CARE: 1800-111-9999, CARE@HIMALAYAN.IN', boundingBox: { xMin: 0.1, yMin: 0.4, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      {
        surface: 'NECK',
        imageId: 'img-disp-001-neck',
        ocrLines: [
          { id: 'l6', text: 'MRP Rs. 60.00 INCL. OF ALL TAXES', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.5, unit: 'NORMALIZED' }, confidence: 0.94 },
          { id: 'l7', text: 'PKD: 03/2026', boundingBox: { xMin: 0.1, yMin: 0.55, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.92 },
        ],
      },
    ],
    groundTruth: {
      productName: 'NATURAL MINERAL WATER',
      netQuantity: { value: 1, unit: 'l' },
      mrp: { value: 60.0, currency: 'INR' },
      dates: { packing: '03/2026' },
      manufacturer: 'HIMALAYAN SPRINGS LTD, SOLAN, HP - 173212',
      consumerCare: '1800-111-9999, CARE@HIMALAYAN.IN',
    },
    expectedSearchStatus: { mrp: 'FOUND', dates: 'FOUND' },
  },

  // 2. Manufacture date only on bottle shoulder
  {
    id: 'disp-002',
    name: 'Pure Squeeze Mustard Oil 500ml Bottle',
    containerType: 'BOTTLE',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-002-front',
        ocrLines: [
          { id: 'l1', text: 'PURE SQUEEZE KACHI GHANI MUSTARD OIL', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.35, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET QTY: 500 ml', boundingBox: { xMin: 0.2, yMin: 0.7, xMax: 0.8, yMax: 0.85, unit: 'NORMALIZED' }, confidence: 0.94 },
          { id: 'l3', text: 'MRP ₹115.00', boundingBox: { xMin: 0.2, yMin: 0.86, xMax: 0.8, yMax: 0.95, unit: 'NORMALIZED' }, confidence: 0.93 },
        ],
      },
      {
        surface: 'SHOULDER',
        imageId: 'img-disp-002-shoulder',
        ocrLines: [
          { id: 'l4', text: 'MFD: 02/2026 BATCH B44', boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.91 },
        ],
      },
    ],
    groundTruth: {
      productName: 'KACHI GHANI MUSTARD OIL',
      netQuantity: { value: 500, unit: 'ml' },
      mrp: { value: 115.0, currency: 'INR' },
      dates: { manufacture: '02/2026' },
    },
    expectedSearchStatus: { mrp: 'FOUND', dates: 'FOUND' },
  },

  // 3. MRP only on sachet top seal
  {
    id: 'disp-003',
    name: 'Spicy Tang Tomato Ketchup 15g Sachet',
    containerType: 'SACHET',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-003-front',
        ocrLines: [
          { id: 'l1', text: 'SPICY TANG TOMATO KETCHUP', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.5, unit: 'NORMALIZED' }, confidence: 0.96 },
          { id: 'l2', text: 'NET WEIGHT: 15 g', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.95 },
        ],
      },
      {
        surface: 'TOP_SEAL',
        imageId: 'img-disp-003-topseal',
        ocrLines: [
          { id: 'l3', text: 'MRP ₹ 5.00 INCL TAXES', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.7, unit: 'NORMALIZED' }, confidence: 0.93 },
        ],
      },
    ],
    groundTruth: {
      productName: 'TOMATO KETCHUP',
      netQuantity: { value: 15, unit: 'g' },
      mrp: { value: 5.0, currency: 'INR' },
    },
    expectedSearchStatus: { mrp: 'FOUND' },
  },

  // 4. Packing date only on bottom crimp
  {
    id: 'disp-004',
    name: 'Crispy Crunch Potato Chips 40g Pouch',
    containerType: 'POUCH',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-004-front',
        ocrLines: [
          { id: 'l1', text: 'CRISPY CRUNCH POTATO CHIPS', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.5, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET WEIGHT: 40 g', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.94 },
          { id: 'l3', text: 'MRP ₹20.00', boundingBox: { xMin: 0.2, yMin: 0.82, xMax: 0.8, yMax: 0.95, unit: 'NORMALIZED' }, confidence: 0.95 },
        ],
      },
      {
        surface: 'BOTTOM_SEAL',
        imageId: 'img-disp-004-bottomcrimp',
        ocrLines: [
          { id: 'l4', text: 'PKD. 01/2026', boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.8, yMax: 0.7, unit: 'NORMALIZED' }, confidence: 0.92 },
        ],
      },
    ],
    groundTruth: {
      productName: 'POTATO CHIPS',
      netQuantity: { value: 40, unit: 'g' },
      mrp: { value: 20.0, currency: 'INR' },
      dates: { packing: '01/2026' },
    },
    expectedSearchStatus: { mrp: 'FOUND', dates: 'FOUND' },
  },

  // 5. Manufacturer back + MRP neck
  {
    id: 'disp-005',
    name: 'Sparkle Glass Cleaner 500ml Spray Bottle',
    containerType: 'BOTTLE',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-005-front',
        ocrLines: [
          { id: 'l1', text: 'SPARKLE GLASS CLEANER', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.4, unit: 'NORMALIZED' }, confidence: 0.96 },
          { id: 'l2', text: 'NET VOL: 500 ml', boundingBox: { xMin: 0.2, yMin: 0.7, xMax: 0.8, yMax: 0.85, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      {
        surface: 'BACK',
        imageId: 'img-disp-005-back',
        ocrLines: [
          { id: 'l3', text: 'MANUFACTURED BY: CLEAN CHEMICALS LTD, THANE, MH - 400601', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.4, unit: 'NORMALIZED' }, confidence: 0.93 },
        ],
      },
      {
        surface: 'NECK',
        imageId: 'img-disp-005-neck',
        ocrLines: [
          { id: 'l4', text: 'MRP ₹130.00 INCL TAX', boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.7, unit: 'NORMALIZED' }, confidence: 0.93 },
        ],
      },
    ],
    groundTruth: {
      productName: 'GLASS CLEANER',
      netQuantity: { value: 500, unit: 'ml' },
      mrp: { value: 130.0, currency: 'INR' },
      manufacturer: 'CLEAN CHEMICALS LTD, THANE, MH - 400601',
    },
    expectedSearchStatus: { mrp: 'FOUND' },
  },

  // 6. Product front + quantity front + date seal
  {
    id: 'disp-006',
    name: 'Crunchy Bites Namkeen 50g Sachet',
    containerType: 'SACHET',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-006-front',
        ocrLines: [
          { id: 'l1', text: 'CRUNCHY BITES BHUJIA SEV', boundingBox: { xMin: 0.1, yMin: 0.15, xMax: 0.9, yMax: 0.4, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET WEIGHT: 50 g', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.94 },
          { id: 'l3', text: 'MRP ₹10.00', boundingBox: { xMin: 0.2, yMin: 0.82, xMax: 0.8, yMax: 0.95, unit: 'NORMALIZED' }, confidence: 0.95 },
        ],
      },
      {
        surface: 'TOP_SEAL',
        imageId: 'img-disp-006-topseal',
        ocrLines: [
          { id: 'l4', text: 'MFD: 03/2026', boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.7, unit: 'NORMALIZED' }, confidence: 0.92 },
        ],
      },
    ],
    groundTruth: {
      productName: 'BHUJIA SEV',
      netQuantity: { value: 50, unit: 'g' },
      mrp: { value: 10.0, currency: 'INR' },
      dates: { manufacture: '03/2026' },
    },
    expectedSearchStatus: { mrp: 'FOUND', dates: 'FOUND' },
  },

  // 7. Same MRP front and neck (Agreement)
  {
    id: 'disp-007',
    name: 'Herbal Essence Shampoo 200ml Bottle',
    containerType: 'BOTTLE',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-007-front',
        ocrLines: [
          { id: 'l1', text: 'HERBAL ESSENCE DAILY SHAMPOO', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.35, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET QTY: 200 ml', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.75, unit: 'NORMALIZED' }, confidence: 0.94 },
          { id: 'l3', text: 'MRP ₹99.00', boundingBox: { xMin: 0.2, yMin: 0.8, xMax: 0.8, yMax: 0.95, unit: 'NORMALIZED' }, confidence: 0.95 },
        ],
      },
      {
        surface: 'NECK',
        imageId: 'img-disp-007-neck',
        ocrLines: [
          { id: 'l4', text: 'MRP ₹99.00 INCL TAXES', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.93 },
        ],
      },
    ],
    groundTruth: {
      productName: 'DAILY SHAMPOO',
      netQuantity: { value: 200, unit: 'ml' },
      mrp: { value: 99.0, currency: 'INR' },
    },
    expectedSearchStatus: { mrp: 'FOUND' },
    expectedEvidenceStatus: { mrp: 'AGREEMENT' },
  },

  // 8. Conflicting MRP front vs neck (Conflict)
  {
    id: 'disp-008',
    name: 'Dual Label Energy Drink 250ml Can',
    containerType: 'BOTTLE',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-008-front',
        ocrLines: [
          { id: 'l1', text: 'VOLT ENERGY DRINK', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.35, unit: 'NORMALIZED' }, confidence: 0.96 },
          { id: 'l2', text: 'NET VOL: 250 ml', boundingBox: { xMin: 0.2, yMin: 0.5, xMax: 0.8, yMax: 0.65, unit: 'NORMALIZED' }, confidence: 0.94 },
          { id: 'l3', text: 'MRP ₹120.00', boundingBox: { xMin: 0.2, yMin: 0.75, xMax: 0.8, yMax: 0.9, unit: 'NORMALIZED' }, confidence: 0.95 },
        ],
      },
      {
        surface: 'NECK',
        imageId: 'img-disp-008-neck',
        ocrLines: [
          { id: 'l4', text: 'MRP ₹150.00 INCL TAX', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.7, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
    ],
    groundTruth: {
      productName: 'ENERGY DRINK',
      netQuantity: { value: 250, unit: 'ml' },
      mrp: { value: 120.0, currency: 'INR' },
    },
    expectedSearchStatus: { mrp: 'CONFLICT' },
    expectedEvidenceStatus: { mrp: 'CONFLICT' },
  },

  // 9. Missing MRP front + neck NOT captured (Critical False-Missing Prevention)
  {
    id: 'disp-009',
    name: 'Uncaptured Neck Beverage Bottle',
    containerType: 'BOTTLE',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-009-front',
        ocrLines: [
          { id: 'l1', text: 'TROPICAL MANGO NECTAR', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.4, unit: 'NORMALIZED' }, confidence: 0.96 },
          { id: 'l2', text: 'NET QTY: 600 ml', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.95 },
        ],
      },
      {
        surface: 'BACK',
        imageId: 'img-disp-009-back',
        ocrLines: [
          { id: 'l3', text: 'MANUFACTURED BY: MANGO DRINKS PVT LTD, RATNAGIRI, MH - 415612', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.93 },
        ],
      },
      // Neck is explicitly NOT captured
    ],
    groundTruth: {
      productName: 'MANGO NECTAR',
      netQuantity: { value: 600, unit: 'ml' },
      mrp: { value: 45.0, currency: 'INR' },
    },
    expectedSearchStatus: { mrp: 'SEARCH_INCOMPLETE' },
    expectedRecommendationSurface: 'NECK',
  },

  // 10. Missing MRP front + neck captured with no MRP (Search Completed No Evidence)
  {
    id: 'disp-010',
    name: 'No MRP Anywhere Bottle',
    containerType: 'BOTTLE',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-010-front',
        ocrLines: [
          { id: 'l1', text: 'PREMIUM ALMOND MILK', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.4, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET QTY: 500 ml', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      {
        surface: 'BACK',
        imageId: 'img-disp-010-back',
        ocrLines: [
          { id: 'l3', text: 'MANUFACTURED BY: NUT MILK LTD, PUNE, MH - 411001', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.92 },
        ],
      },
      {
        surface: 'NECK',
        imageId: 'img-disp-010-neck',
        ocrLines: [
          { id: 'l4', text: 'RECYCLE BOTTLE PLEASE', boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.88 },
        ],
      },
      {
        surface: 'SHOULDER',
        imageId: 'img-disp-010-shoulder',
        ocrLines: [
          { id: 'l5', text: 'SHAKE WELL BEFORE USE', boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.89 },
        ],
      },
      {
        surface: 'CAP',
        imageId: 'img-disp-010-cap',
        ocrLines: [
          { id: 'l6', text: 'SEALED FOR FRESHNESS', boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.87 },
        ],
      },
    ],
    groundTruth: {
      productName: 'ALMOND MILK',
      netQuantity: { value: 500, unit: 'ml' },
      mrp: { value: 0, currency: 'INR' }, // Actually absent
    },
    expectedSearchStatus: { mrp: 'SEARCH_COMPLETED_NO_EVIDENCE' },
  },

  // 11. Blurry neck
  {
    id: 'disp-011',
    name: 'Blurry Neck Fruit Juice Bottle',
    containerType: 'BOTTLE',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-011-front',
        ocrLines: [
          { id: 'l1', text: 'CRISP APPLE JUICE', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.4, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET VOL: 1 L', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      {
        surface: 'NECK',
        imageId: 'img-disp-011-neck',
        condition: { isBlurry: true },
        ocrLines: [
          { id: 'l3', text: 'MRP R... 8?.00', boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.7, unit: 'NORMALIZED' }, confidence: 0.45 },
        ],
      },
    ],
    groundTruth: {
      productName: 'APPLE JUICE',
      netQuantity: { value: 1, unit: 'l' },
      mrp: { value: 85.0, currency: 'INR' },
    },
    expectedSearchStatus: { mrp: 'SEARCH_INCOMPLETE' },
  },

  // 12. Reflective neck (Glare)
  {
    id: 'disp-012',
    name: 'Glossy Metallic Foil Neck Olive Oil Bottle',
    containerType: 'BOTTLE',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-012-front',
        ocrLines: [
          { id: 'l1', text: 'EXTRA VIRGIN OLIVE OIL', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.4, unit: 'NORMALIZED' }, confidence: 0.96 },
          { id: 'l2', text: 'NET QUANTITY: 500 ml', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      {
        surface: 'NECK',
        imageId: 'img-disp-012-neck',
        condition: { hasGlare: true, isMetallic: true },
        ocrLines: [
          { id: 'l3', text: 'MRP ₹750.00', boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.7, unit: 'NORMALIZED' }, confidence: 0.90 },
        ],
      },
    ],
    groundTruth: {
      productName: 'EXTRA VIRGIN OLIVE OIL',
      netQuantity: { value: 500, unit: 'ml' },
      mrp: { value: 750.0, currency: 'INR' },
    },
    expectedSearchStatus: { mrp: 'FOUND' },
  },

  // 13. Curved bottle neck
  {
    id: 'disp-013',
    name: 'Cylindrical Tonic Water Bottle',
    containerType: 'BOTTLE',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-013-front',
        ocrLines: [
          { id: 'l1', text: 'ARTISAN TONIC WATER', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.4, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET VOL: 300 ml', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      {
        surface: 'NECK',
        imageId: 'img-disp-013-neck',
        condition: { isCurved: true },
        ocrLines: [
          { id: 'l3', text: 'MRP ₹65.00 INCL OF TAXES', boundingBox: { xMin: 0.15, yMin: 0.3, xMax: 0.85, yMax: 0.7, unit: 'NORMALIZED' }, confidence: 0.92 },
        ],
      },
    ],
    groundTruth: {
      productName: 'TONIC WATER',
      netQuantity: { value: 300, unit: 'ml' },
      mrp: { value: 65.0, currency: 'INR' },
    },
    expectedSearchStatus: { mrp: 'FOUND' },
  },

  // 14. Metallic sachet crimp
  {
    id: 'disp-014',
    name: 'Silver Foil Instant Coffee Sachet',
    containerType: 'SACHET',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-014-front',
        ocrLines: [
          { id: 'l1', text: 'GOLD ROAST INSTANT COFFEE', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.5, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET WEIGHT: 25 g', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      {
        surface: 'CRIMP',
        imageId: 'img-disp-014-crimp',
        condition: { isMetallic: true },
        ocrLines: [
          { id: 'l3', text: 'MRP ₹ 15.00', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.8, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.91 },
        ],
      },
    ],
    groundTruth: {
      productName: 'INSTANT COFFEE',
      netQuantity: { value: 25, unit: 'g' },
      mrp: { value: 15.0, currency: 'INR' },
    },
    expectedSearchStatus: { mrp: 'FOUND' },
  },

  // 15. Dot-matrix seal date
  {
    id: 'disp-015',
    name: 'Dot Matrix Stamped Biscuit Pouch',
    containerType: 'POUCH',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-015-front',
        ocrLines: [
          { id: 'l1', text: 'BUTTER CRUNCH COOKIES', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.5, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET QTY: 75 g', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.94 },
          { id: 'l3', text: 'MRP ₹25.00', boundingBox: { xMin: 0.2, yMin: 0.82, xMax: 0.8, yMax: 0.95, unit: 'NORMALIZED' }, confidence: 0.95 },
        ],
      },
      {
        surface: 'TOP_SEAL',
        imageId: 'img-disp-015-seal',
        condition: { isDotMatrix: true },
        ocrLines: [
          { id: 'l4', text: 'PKD 03/2026', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.90 },
        ],
      },
    ],
    groundTruth: {
      productName: 'BUTTER CRUNCH COOKIES',
      netQuantity: { value: 75, unit: 'g' },
      mrp: { value: 25.0, currency: 'INR' },
      dates: { packing: '03/2026' },
    },
    expectedSearchStatus: { mrp: 'FOUND', dates: 'FOUND' },
  },

  // 16. Multiple remote surfaces (Neck MRP + Cap PKD)
  {
    id: 'disp-016',
    name: 'Triple Surface Coconut Oil Bottle',
    containerType: 'BOTTLE',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-016-front',
        ocrLines: [
          { id: 'l1', text: 'PURE COCONUT OIL', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.5, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET VOLUME: 200 ml', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      {
        surface: 'NECK',
        imageId: 'img-disp-016-neck',
        ocrLines: [
          { id: 'l3', text: 'MRP ₹45.00', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      {
        surface: 'CAP',
        imageId: 'img-disp-016-cap',
        ocrLines: [
          { id: 'l4', text: 'PKD: 04/2026', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.93 },
        ],
      },
    ],
    groundTruth: {
      productName: 'COCONUT OIL',
      netQuantity: { value: 200, unit: 'ml' },
      mrp: { value: 45.0, currency: 'INR' },
      dates: { packing: '04/2026' },
    },
    expectedSearchStatus: { mrp: 'FOUND', dates: 'FOUND' },
  },

  // 17. Duplicate identical values across three surfaces (Front, Top Seal, Back)
  {
    id: 'disp-017',
    name: 'Triple Corroborated Tea Pouch',
    containerType: 'POUCH',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-017-front',
        ocrLines: [
          { id: 'l1', text: 'PREMIUM ASSAM TEA', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.5, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET QUANTITY: 250 g', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l3', text: 'MRP ₹140.00', boundingBox: { xMin: 0.2, yMin: 0.82, xMax: 0.8, yMax: 0.95, unit: 'NORMALIZED' }, confidence: 0.95 },
        ],
      },
      {
        surface: 'TOP_SEAL',
        imageId: 'img-disp-017-seal',
        ocrLines: [
          { id: 'l4', text: 'MRP ₹140.00', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      {
        surface: 'BACK',
        imageId: 'img-disp-017-back',
        ocrLines: [
          { id: 'l5', text: 'MAX RETAIL PRICE ₹140.00 (INCL OF TAXES)', boundingBox: { xMin: 0.1, yMin: 0.4, xMax: 0.9, yMax: 0.7, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
    ],
    groundTruth: {
      productName: 'ASSAM TEA',
      netQuantity: { value: 250, unit: 'g' },
      mrp: { value: 140.0, currency: 'INR' },
    },
    expectedSearchStatus: { mrp: 'FOUND' },
    expectedEvidenceStatus: { mrp: 'AGREEMENT' },
  },

  // 18. Duplicate conflicting values (Carton Top vs Flap)
  {
    id: 'disp-018',
    name: 'Discrepant Overprinted Carton Box',
    containerType: 'CARTON',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-018-front',
        ocrLines: [
          { id: 'l1', text: 'ORGANIC GREEN TEA BAGS', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.5, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET WEIGHT: 50 g (25 TEA BAGS)', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.93 },
        ],
      },
      {
        surface: 'TOP',
        imageId: 'img-disp-018-top',
        ocrLines: [
          { id: 'l3', text: 'MRP ₹200.00', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      {
        surface: 'FLAP',
        imageId: 'img-disp-018-flap',
        ocrLines: [
          { id: 'l4', text: 'MRP ₹250.00 INCL TAX', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.93 },
        ],
      },
    ],
    groundTruth: {
      productName: 'GREEN TEA BAGS',
      netQuantity: { value: 50, unit: 'g' },
      mrp: { value: 200.0, currency: 'INR' },
    },
    expectedSearchStatus: { mrp: 'CONFLICT' },
    expectedEvidenceStatus: { mrp: 'CONFLICT' },
  },

  // 19. No relevant remote declaration (Standard front/back packaging)
  {
    id: 'disp-019',
    name: 'Standard Breakfast Cereal Box',
    containerType: 'BOX',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-019-front',
        ocrLines: [
          { id: 'l1', text: 'CRISPY CORN FLAKES', boundingBox: { xMin: 0.1, yMin: 0.15, xMax: 0.9, yMax: 0.4, unit: 'NORMALIZED' }, confidence: 0.96 },
          { id: 'l2', text: 'NET WEIGHT: 475 g', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.95 },
        ],
      },
      {
        surface: 'BACK',
        imageId: 'img-disp-019-back',
        ocrLines: [
          { id: 'l3', text: 'MANUFACTURED BY: GRAIN FOODS LTD, JAIPUR, RJ - 302013', boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.35, unit: 'NORMALIZED' }, confidence: 0.94 },
          { id: 'l4', text: 'MRP ₹185.00 INCL OF ALL TAXES', boundingBox: { xMin: 0.1, yMin: 0.4, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l5', text: 'PKD: 02/2026', boundingBox: { xMin: 0.1, yMin: 0.65, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.93 },
          { id: 'l6', text: 'CUSTOMER CARE: 1800-444-5555', boundingBox: { xMin: 0.1, yMin: 0.82, xMax: 0.9, yMax: 0.95, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
    ],
    groundTruth: {
      productName: 'CORN FLAKES',
      netQuantity: { value: 475, unit: 'g' },
      mrp: { value: 185.0, currency: 'INR' },
      dates: { packing: '02/2026' },
      manufacturer: 'GRAIN FOODS LTD, JAIPUR, RJ - 302013',
      consumerCare: '1800-444-5555',
    },
    expectedSearchStatus: { mrp: 'FOUND', dates: 'FOUND' },
  },

  // 20. Unknown package type
  {
    id: 'disp-020',
    name: 'Unspecified Packaging Form Product',
    containerType: 'UNKNOWN',
    capturedSurfaces: [
      {
        surface: 'FRONT',
        imageId: 'img-disp-020-front',
        ocrLines: [
          { id: 'l1', text: 'MULTI-PURPOSE CLEANING GEL', boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.5, unit: 'NORMALIZED' }, confidence: 0.95 },
          { id: 'l2', text: 'NET WEIGHT: 250 g', boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.8, unit: 'NORMALIZED' }, confidence: 0.94 },
        ],
      },
      // Back and other surfaces not captured
    ],
    groundTruth: {
      productName: 'CLEANING GEL',
      netQuantity: { value: 250, unit: 'g' },
    },
    expectedSearchStatus: { mrp: 'SEARCH_INCOMPLETE' },
  },
];

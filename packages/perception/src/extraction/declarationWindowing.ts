/**
 * Declaration Windowing & Spatial Association Engine
 *
 * Implements bounded spatial evidence windows for on-device OCR regions:
 * 1. Sorts text regions by 2D reading order (top-to-bottom, left-to-right).
 * 2. Identifies declaration header anchors (e.g. MANUFACTURED BY, PKD BY, MRP).
 * 3. Binds contiguous/related multi-line text blocks within a bounded window.
 * 4. Stops immediately when a competing declaration header or major boundary is met.
 * 5. Groups multi-line address blocks with or without PIN codes.
 */

import type { BoundingBox, DeclarationType, TextRegion } from '@lm-vision/shared-types';

export interface BoundedWindow {
  anchorRegion: TextRegion;
  declarationType: DeclarationType;
  headerText: string;
  bodyRegions: TextRegion[];
  combinedText: string;
  compositeBoundingBox: BoundingBox;
}

export const DECLARATION_HEADER_PATTERNS: Array<{
  type: DeclarationType;
  pattern: RegExp;
  isTerminalOnly?: boolean;
}> = [
  {
    type: 'MANUFACTURER_NAME_ADDRESS',
    pattern: /\b(?:MFD\.?\s*BY|MFG\.?\s*BY|MANUFACTURED\s*BY|MANUFACTURER\s*:?|PRODUCED\s*BY|MADE\s*BY|निर्माता|द्वारा\s*निर्मित)\b/i,
  },
  {
    type: 'PACKER_NAME_ADDRESS',
    pattern: /\b(?:PKD\.?\s*BY|PACKED\s*BY|PACKER\s*:?|PACKING\s*BY|द्वारा\s*पैक|पैकर)\b/i,
  },
  {
    type: 'IMPORTER_NAME_ADDRESS',
    pattern: /\b(?:IMPORTED\s*BY|IMPORTER\s*:?|IMP\.?\s*BY|आयातकर्ता)\b/i,
  },
  {
    type: 'MRP',
    pattern: /\b(?:M\.?R\.?P\.?|MAX\.?\s*RETAIL\s*PRICE|MAXIMUM\s*RETAIL\s*PRICE|एम\.?आर\.?पी\.?|अधिकतम\s*खुदरा\s*मूल्य|खुदरा\s*मूल्य)\b/i,
  },
  {
    type: 'NET_QUANTITY',
    pattern: /\b(?:NET\s*(?:QTY|QUANTITY|WT|WEIGHT|VOL|VOLUME)|N\.?W\.?|N\.?Q\.?|शुद्ध\s*(?:मात्रा|वजन|भार)|मात्रा|वजन)\b/i,
  },
  {
    type: 'DATE_OF_MANUFACTURE',
    pattern: /\b(?:MFD|MFG|DATE\s*OF\s*MFG|DATE\s*OF\s*MANUFACTURE|MANUFACTURED\s*DATE|निर्माण\s*तिथि|निर्माण\s*दिनांक)\b/i,
  },
  {
    type: 'DATE_OF_PACKAGING',
    pattern: /\b(?:PKD|PACKED|DATE\s*OF\s*PKD|DATE\s*OF\s*PACKAGING|DATE\s*OF\s*PACKING|PACKING\s*DATE|पैकिंग\s*तिथि|पैकिंग\s*दिनांक)\b/i,
  },
  {
    type: 'DATE_OF_IMPORT',
    pattern: /\b(?:DATE\s*OF\s*IMPORT|IMPORT\s*DATE|आयात\s*तिथि|आयात\s*दिनांक)\b/i,
  },
  {
    type: 'EXPIRY_DATE_BEST_BEFORE',
    pattern: /\b(?:BEST\s*BEFORE|EXPIRY|EXP\.?|USE\s*BY|EXP\s*DATE|समाप्ति\s*तिथि|सर्वोत्तम\s*उपयोग)\b/i,
  },
  {
    type: 'CONSUMER_CARE_DETAILS',
    pattern: /\b(?:CONSUMER\s*CARE|CUSTOMER\s*CARE|HELPLINE|FEEDBACK|QUERIES|COMPLAINTS|उपभोक्ता\s*सेवा|ग्राहक\s*सेवा)\b/i,
  },
  {
    type: 'COUNTRY_OF_ORIGIN',
    pattern: /\b(?:COUNTRY\s*OF\s*ORIGIN|MADE\s*IN|PRODUCT\s*OF|मूल\s*देश)\b/i,
  },
  {
    type: 'BARCODE_QR',
    pattern: /\b(?:BATCH\s*NO|LOT\s*NO|B\.NO|LOT)\b/i,
    isTerminalOnly: true,
  },
];

/**
 * Sorts OCR regions by 2D reading order:
 * Top-to-bottom, grouping regions on roughly the same horizontal line left-to-right.
 */
export function sortRegionsReadingOrder(regions: TextRegion[]): TextRegion[] {
  if (regions.length <= 1) return [...regions];

  return [...regions].sort((a, b) => {
    const aBox = a.boundingBox;
    const bBox = b.boundingBox;

    const yOverlap = Math.min(aBox.yMax, bBox.yMax) - Math.max(aBox.yMin, bBox.yMin);
    const minHeight = Math.min(aBox.height ?? 0.05, bBox.height ?? 0.05);

    if (minHeight > 0 && yOverlap / minHeight > 0.4) {
      return aBox.xMin - bBox.xMin;
    }

    return aBox.yMin - bBox.yMin;
  });
}

/**
 * Computes the union bounding box of a list of regions.
 */
export function computeBoundingBoxUnion(regions: TextRegion[]): BoundingBox {
  if (regions.length === 0) {
    return { xMin: 0, yMin: 0, xMax: 1, yMax: 1, width: 1, height: 1, unit: 'NORMALIZED' };
  }

  let xMin = 1.0;
  let yMin = 1.0;
  let xMax = 0.0;
  let yMax = 0.0;

  for (const r of regions) {
    xMin = Math.min(xMin, r.boundingBox.xMin);
    yMin = Math.min(yMin, r.boundingBox.yMin);
    xMax = Math.max(xMax, r.boundingBox.xMax);
    yMax = Math.max(yMax, r.boundingBox.yMax);
  }

  return {
    xMin: Number(xMin.toFixed(4)),
    yMin: Number(yMin.toFixed(4)),
    xMax: Number(xMax.toFixed(4)),
    yMax: Number(yMax.toFixed(4)),
    width: Number(Math.max(0, xMax - xMin).toFixed(4)),
    height: Number(Math.max(0, yMax - yMin).toFixed(4)),
    unit: 'NORMALIZED',
  };
}

/**
 * Checks whether a text region matches any declaration header pattern.
 */
export function matchDeclarationHeader(text: string): { type: DeclarationType; matchStr: string } | null {
  for (const item of DECLARATION_HEADER_PATTERNS) {
    const m = text.match(item.pattern);
    if (m) {
      return { type: item.type, matchStr: m[0] };
    }
  }
  return null;
}

/**
 * Creates bounded declaration windows from an array of text regions.
 * For each detected header anchor, bounds following lines until another
 * declaration header or boundary is met.
 */
export function extractBoundedWindows(
  regions: TextRegion[],
  options: { maxLines?: number; maxVerticalDistance?: number } = {}
): BoundedWindow[] {
  const maxLines = options.maxLines ?? 6;
  const maxVerticalDist = options.maxVerticalDistance ?? 0.35;

  const ordered = sortRegionsReadingOrder(regions);
  const windows: BoundedWindow[] = [];

  for (let i = 0; i < ordered.length; i++) {
    const anchor = ordered[i]!;
    const headerMatch = matchDeclarationHeader(anchor.text);

    if (!headerMatch) continue;

    const bodyRegions: TextRegion[] = [];
    let currentY = anchor.boundingBox.yMax;

    for (let j = i + 1; j < ordered.length && bodyRegions.length < maxLines; j++) {
      const candidate = ordered[j]!;

      // If candidate starts another declaration header, stop window
      const candidateHeader = matchDeclarationHeader(candidate.text);
      if (candidateHeader) {
        break;
      }

      // Check vertical gap
      const vGap = candidate.boundingBox.yMin - currentY;
      if (vGap > maxVerticalDist) {
        break;
      }

      bodyRegions.push(candidate);
      currentY = Math.max(currentY, candidate.boundingBox.yMax);
    }

    const allInWindow = [anchor, ...bodyRegions];
    const combinedText = allInWindow.map((r) => r.text.trim()).filter(Boolean).join('\n');
    const compositeBoundingBox = computeBoundingBoxUnion(allInWindow);

    windows.push({
      anchorRegion: anchor,
      declarationType: headerMatch.type,
      headerText: headerMatch.matchStr,
      bodyRegions,
      combinedText,
      compositeBoundingBox,
    });
  }

  return windows;
}

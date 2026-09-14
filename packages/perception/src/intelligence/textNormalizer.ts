/**
 * Phase C: Conservative OCR Character Normalization
 *
 * Implements context-aware OCR character error correction strictly within
 * strongly identified numeric packaging contexts.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. Character substitutions (O->0, I->1, l->1, |->1, S->5, B->8, G->6) may ONLY
 *    be considered inside a strongly identified numeric context (e.g. "₹12O.OO", "50O g").
 * 2. Words like "GODREJ", "PRODUCT", "ORIGINAL", "PREMIUM", "BEST QUALITY" must NEVER be modified.
 * 3. Never silently alter original OCR text.
 * 4. Always preserve originalOCRText, normalizedText, and correctionsApplied.
 * 5. If ambiguity remains, flag isAmbiguous = true.
 */

export interface NumericNormalizationResult {
  originalOCRText: string;
  normalizedText: string;
  numericValue: number | null;
  correctionsApplied: string[];
  isAmbiguous: boolean;
  contextIdentified: boolean;
}

/**
 * Common packaging words that must NEVER undergo character-to-number substitutions.
 */
const PROTECTED_ALPHA_WORDS = new Set([
  'GODREJ',
  'PRODUCT',
  'ORIGINAL',
  'PREMIUM',
  'BEST',
  'QUALITY',
  'NATURAL',
  'ORGANIC',
  'FRESH',
  'SUPER',
  'GOLD',
  'DELUXE',
  'INDIA',
  'INDIAN',
  'BATCH',
  'COMPANY',
  'LTD',
  'LIMITED',
  'PVT',
  'PRIVATE',
  'FLOUR',
  'ATTA',
  'BISCUIT',
  'BISCUITS',
  'SHAMPOO',
  'SOAP',
  'OIL',
  'REFINED',
  'PURE',
  'FOODS',
  'CRISP',
  'BAKERS',
  'BRAND',
  'PACK',
  'PACKAGE',
  'GROSS',
  'TARE',
]);

const CURRENCY_SYMBOLS = /(?:₹|Rs\.?|INR|रु\.?|रुपये)/i;

/**
 * Determines whether a string token exists within a strongly identified numeric context.
 */
export function isStronglyNumericContext(
  fullLineText: string,
  tokenIndex: number,
  token: string,
  hint?: 'CURRENCY' | 'UNIT' | 'DATE' | 'GENERIC_NUMERIC'
): boolean {
  const upperToken = token.trim().toUpperCase();

  // If the token matches a protected regular word, it is NEVER numeric context
  if (PROTECTED_ALPHA_WORDS.has(upperToken)) {
    return false;
  }

  // Pure alphabetic token of length > 2 with no numeric context cues is NOT numeric
  if (/^[A-Za-z]+$/.test(token) && !hint && token.length > 2) {
    return false;
  }

  // 1. Explicit hint provided
  if (hint === 'CURRENCY' || hint === 'UNIT' || hint === 'DATE') {
    return true;
  }

  // 2. Token itself contains currency symbol or trailing /-
  if (CURRENCY_SYMBOLS.test(token) || /\/-/.test(token)) {
    return true;
  }

  // 3. Line contains currency symbol immediately before this token
  const prefix = fullLineText.slice(0, tokenIndex);
  if (/(?:₹|Rs\.?|INR|रु\.?|रुपये|M\.?R\.?P\.?|PRICE)\s*[:.-]?\s*$/i.test(prefix)) {
    return true;
  }

  // 4. Line contains metric unit immediately following this token
  const suffix = fullLineText.slice(tokenIndex + token.length);
  if (/^\s*(?:g|gm|gms|gram|grams|kg|kgs|ml|mls|l|lt|ltr|किग्रा|कि\.ग्रा\.|ग्राम|मिली|लीटर|नग)\b/i.test(suffix)) {
    return true;
  }

  // 5. Line contains Net Qty or Date prefix
  if (/(?:NET\s*(?:QTY|WT|WEIGHT|VOL)|N\.?W\.?|PKD|MFD|MFG|EXP)\s*[:.-]?\s*$/i.test(prefix)) {
    return true;
  }

  // 6. Token already contains digits and decimal points (> 50% digit/dot characters)
  const digitOrDotCount = (token.match(/[0-9.]/g) || []).length;
  if (token.length >= 2 && digitOrDotCount / token.length >= 0.5) {
    return true;
  }

  return false;
}

/**
 * Conservatively normalizes characters within a strongly identified numeric token.
 * Only modifies:
 * - O / o -> 0
 * - I / l / | -> 1
 * - S / s -> 5
 * - B -> 8
 * - G -> 6
 *
 * When applied, records provenance in correctionsApplied.
 * If ambiguity remains, flags isAmbiguous = true.
 */
export function normalizeNumericString(
  rawToken: string,
  options: {
    fullLineContext?: string;
    tokenIndexInLine?: number;
    hint?: 'CURRENCY' | 'UNIT' | 'DATE' | 'GENERIC_NUMERIC';
  } = {}
): NumericNormalizationResult {
  const originalOCRText = rawToken;
  const fullLine = options.fullLineContext ?? rawToken;
  const tokenIndex = options.tokenIndexInLine ?? 0;
  const hint = options.hint;

  const isNumeric = isStronglyNumericContext(fullLine, tokenIndex, rawToken, hint);

  // If NOT in a strongly identified numeric context, do NOT perform character substitutions
  if (!isNumeric) {
    return {
      originalOCRText,
      normalizedText: rawToken,
      numericValue: null,
      correctionsApplied: [],
      isAmbiguous: false,
      contextIdentified: false,
    };
  }

  // Pure letters with zero digits (e.g. 'I', 'O', 'B') are never converted into numbers
  const hasAtLeastOneDigit = /[0-9]/.test(rawToken);
  if (!hasAtLeastOneDigit) {
    return {
      originalOCRText,
      normalizedText: rawToken,
      numericValue: null,
      correctionsApplied: [],
      isAmbiguous: false,
      contextIdentified: false,
    };
  }

  const correctionsApplied: string[] = [];
  let isAmbiguous = false;
  let normalizedText = '';

  const tokenHasCurrency = CURRENCY_SYMBOLS.test(rawToken) || /\/-/.test(rawToken) || hint === 'CURRENCY';
  const tokenHasUnit = hint === 'UNIT';

  // Extract core potential numeric part (strip currency symbols or unit suffix for isolated analysis)
  for (let i = 0; i < rawToken.length; i++) {
    const char = rawToken[i] ?? '';
    const prevChar = i > 0 ? (rawToken[i - 1] ?? '') : '';
    const nextChar = i < rawToken.length - 1 ? (rawToken[i + 1] ?? '') : '';
    const prevNormalizedChar = i > 0 ? (normalizedText[i - 1] ?? '') : '';

    const isAdjacentToDigit =
      /[0-9.]/.test(prevChar) || /[0-9.]/.test(nextChar) || /[0-9.]/.test(prevNormalizedChar);

    // Substitution: O or o -> 0
    if (char === 'O' || char === 'o') {
      if (isAdjacentToDigit || tokenHasCurrency || tokenHasUnit) {
        normalizedText += '0';
        correctionsApplied.push(`Substituted '${char}' with '0' at index ${i}`);
      } else {
        normalizedText += char;
        isAmbiguous = true;
      }
    }
    // Substitution: I, l, | -> 1
    else if (char === 'I' || char === 'l' || char === '|') {
      if (isAdjacentToDigit || tokenHasCurrency || tokenHasUnit) {
        normalizedText += '1';
        correctionsApplied.push(`Substituted '${char}' with '1' at index ${i}`);
      } else {
        normalizedText += char;
        isAmbiguous = true;
      }
    }
    // Substitution: S or s -> 5
    else if ((char === 'S' || char === 's') && (isAdjacentToDigit || tokenHasCurrency)) {
      normalizedText += '5';
      correctionsApplied.push(`Substituted '${char}' with '5' at index ${i}`);
    }
    // Substitution: B -> 8
    else if (char === 'B' && isAdjacentToDigit) {
      normalizedText += '8';
      correctionsApplied.push(`Substituted '${char}' with '8' at index ${i}`);
    }
    // Substitution: G -> 6
    else if (char === 'G' && isAdjacentToDigit) {
      normalizedText += '6';
      correctionsApplied.push(`Substituted '${char}' with '6' at index ${i}`);
    } else {
      normalizedText += char;
    }
  }

  // Attempt numeric parsing from normalized text
  const match = normalizedText.match(/([0-9]+(?:\.[0-9]+)?)/);
  const numericValue = match && match[1] ? parseFloat(match[1]) : null;

  // Flag ambiguity if uncertain characters exist or no clean number was parsed after substitution
  if (rawToken.includes('?') || rawToken.includes('~')) {
    isAmbiguous = true;
  }
  if (correctionsApplied.length > 0 && numericValue === null) {
    isAmbiguous = true;
  }

  return {
    originalOCRText,
    normalizedText,
    numericValue,
    correctionsApplied,
    isAmbiguous,
    contextIdentified: true,
  };
}

/**
 * Sanitizes an entire OCR line, applying conservative normalization only to
 * identifiable numeric candidates and leaving standard text untouched.
 */
export function normalizeLineText(line: string): {
  originalText: string;
  normalizedText: string;
  corrections: string[];
  isAmbiguous: boolean;
} {
  const originalText = line;
  const corrections: string[] = [];
  let isAmbiguous = false;

  // Split tokens while preserving whitespace
  const tokens = line.split(/(\s+)/);
  let currentIndex = 0;

  const normalizedTokens = tokens.map((token) => {
    const tokenStart = currentIndex;
    currentIndex += token.length;

    if (/^\s+$/.test(token) || token.length === 0) {
      return token;
    }

    const norm = normalizeNumericString(token, {
      fullLineContext: line,
      tokenIndexInLine: tokenStart,
    });

    if (norm.correctionsApplied.length > 0) {
      corrections.push(...norm.correctionsApplied);
    }
    if (norm.isAmbiguous) {
      isAmbiguous = true;
    }

    return norm.normalizedText;
  });

  return {
    originalText,
    normalizedText: normalizedTokens.join(''),
    corrections,
    isAmbiguous,
  };
}

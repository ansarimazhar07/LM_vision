/**
 * Pure TypeScript SHA-256 Hasher & Integrity Verification Engine
 *
 * ZERO NODE.JS DEPENDENCIES:
 * Does NOT import 'crypto', 'node:crypto', 'buffer', or native bindings.
 * Runs deterministically and identically on Node.js, React Native / Hermes (Android/iOS),
 * and Web browsers.
 */

import type { InspectionReport, ReportIntegrityResult } from '@lm-vision/shared-types';

/**
 * Standard SHA-256 initial hash values (H)
 */
const INITIAL_HASH = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

/**
 * SHA-256 round constants (K)
 */
const ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

/**
 * UTF-8 encodes a string into a Uint8Array across all platforms
 */
function utf8Encode(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) {
      utf8.push(charcode);
    } else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return new Uint8Array(utf8);
}

/**
 * Computes standard SHA-256 hex digest for arbitrary string data
 */
export function sha256(data: string): string {
  const bytes = utf8Encode(data);
  const bitLength = bytes.length * 8;

  // Calculate padded message length in bytes (must be multiple of 64 bytes)
  const remainder = (bytes.length + 9) % 64;
  const paddingLength = remainder === 0 ? 0 : 64 - remainder;
  const totalLength = bytes.length + 1 + paddingLength + 8;

  const padded = new Uint8Array(totalLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80; // append single 1 bit

  // Append 64-bit big-endian original length in bits at the end
  const view = new DataView(padded.buffer);
  // High 32 bits (bitLength / 2^32)
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  view.setUint32(totalLength - 8, highBits, false);
  view.setUint32(totalLength - 4, lowBits, false);

  const h: [number, number, number, number, number, number, number, number] = [
    INITIAL_HASH[0]!, INITIAL_HASH[1]!, INITIAL_HASH[2]!, INITIAL_HASH[3]!,
    INITIAL_HASH[4]!, INITIAL_HASH[5]!, INITIAL_HASH[6]!, INITIAL_HASH[7]!,
  ];
  const w = new Uint32Array(64);

  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15]!, 7) ^ rightRotate(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rightRotate(w[i - 2]!, 17) ^ rightRotate(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }

    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hVal = h[7];

    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hVal + s1 + ch + ROUND_CONSTANTS[i]! + w[i]!) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      hVal = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hVal) >>> 0;
  }

  return h.map(val => val.toString(16).padStart(8, '0')).join('');
}

/**
 * Deterministic JSON stringifier with alphabetically sorted object keys
 * and suppression of undefined values, ensuring cross-runtime canonical equality.
 */
export function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const elements = obj.map(item => canonicalStringify(item));
    return `[${elements.join(',')}]`;
  }

  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const pairs: string[] = [];

  for (const key of keys) {
    const val = record[key];
    if (val !== undefined) {
      pairs.push(`${JSON.stringify(key)}:${canonicalStringify(val)}`);
    }
  }

  return `{${pairs.join(',')}}`;
}

/**
 * Computes `contentHash`:
 * Hash of canonical inspection and report content.
 *
 * Excludes run-volatile fields:
 * - `generatedAt` (runtime generation timestamp)
 * - `contentHash` (self-referential)
 * - `reportHash` (self-referential)
 * - `digitalSignature` (applied after hash generation)
 */
export function computeContentHash(data: Record<string, unknown>): string {
  // Clone and strip volatile / self-referential fields
  const contentPayload: Record<string, unknown> = {};
  const excludedKeys = new Set([
    'contentHash',
    'reportHash',
    'generatedAt',
    'digitalSignature',
    'status', // operational report status
  ]);

  for (const [key, value] of Object.entries(data)) {
    if (!excludedKeys.has(key) && value !== undefined) {
      contentPayload[key] = value;
    }
  }

  const canonicalJson = canonicalStringify(contentPayload);
  return sha256(canonicalJson);
}

/**
 * Computes `reportHash`:
 * Hash of the final serialized report artifact / canonical representation
 * used for document integrity verification.
 *
 * Includes the `contentHash` and core document identity attributes,
 * excluding only `reportHash` and `digitalSignature`.
 */
export function computeReportHash(report: Partial<InspectionReport>): string {
  const envelopePayload: Record<string, unknown> = {};
  const excludedKeys = new Set(['reportHash', 'digitalSignature']);

  for (const [key, value] of Object.entries(report)) {
    if (!excludedKeys.has(key) && value !== undefined) {
      envelopePayload[key] = value;
    }
  }

  const canonicalEnvelope = canonicalStringify(envelopePayload);
  return sha256(canonicalEnvelope);
}

/**
 * Verifies report cryptographic integrity.
 * Checks:
 * 1. `contentHash` recalculation matches report.contentHash.
 * 2. `reportHash` recalculation matches report.reportHash.
 * 3. Optional expectedReportHash matches calculated reportHash.
 */
export function verifyReportIntegrity(
  report: InspectionReport,
  expectedReportHash?: string
): ReportIntegrityResult {
  const calculatedContentHash = computeContentHash(report as unknown as Record<string, unknown>);
  const contentMatch = calculatedContentHash.toLowerCase() === report.contentHash.toLowerCase();

  const calculatedReportHash = computeReportHash(report);
  const reportMatch = calculatedReportHash.toLowerCase() === report.reportHash.toLowerCase();

  let valid = contentMatch && reportMatch;
  let reason: string | undefined;

  if (!contentMatch) {
    reason = `Content hash mismatch: stored ${report.contentHash}, calculated ${calculatedContentHash}`;
  } else if (!reportMatch) {
    reason = `Report hash mismatch: stored ${report.reportHash}, calculated ${calculatedReportHash}`;
  } else if (expectedReportHash && calculatedReportHash.toLowerCase() !== expectedReportHash.toLowerCase()) {
    valid = false;
    reason = `Expected report hash ${expectedReportHash} does not match calculated ${calculatedReportHash}`;
  }

  return {
    valid,
    contentHash: report.contentHash,
    calculatedContentHash,
    reportHash: report.reportHash,
    calculatedReportHash,
    reason,
  };
}

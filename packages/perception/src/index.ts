/**
 * @lm-vision/perception
 *
 * Offline Perception Layer for LM-Vision:
 * - On-device OCR
 * - Quality analysis heuristics
 * - Computer Vision geometry
 * - Legal Metrology declaration candidate extraction
 * - Canonical metric and date normalizers
 * - Hybrid perception & conflict detection
 */

export * from './ocr/ocrEngine.js';
export * from './quality/qualityAnalyzer.js';
export * from './cv/cvGeometry.js';
export * from './cv/dewarping.js';
export * from './cv/glareReduction.js';
export * from './extraction/declarationExtractor.js';
export * from './normalization/normalizer.js';
export * from './hybrid/conflictDetector.js';
export * from './pipeline.js';


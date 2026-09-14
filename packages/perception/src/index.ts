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
export * from './cv/perspectiveTransform.js';
export * from './cv/imageQualityEngine.js';
export * from './cv/localCropEnhancer.js';
export * from './extraction/declarationExtractor.js';
export * from './validation/declarationValidators.js';
export * from './normalization/normalizer.js';
export * from './hybrid/conflictDetector.js';
export * from './intelligence/index.js';
export * from './fusion/index.js';
export * from './inspection/index.js';
export * from './pipeline.js';
export * from './extraction/declarationWindowing.js';
export * from './extraction/fieldValidators.js';
export * from './extraction/productNameExtractor.js';
export * from './extraction/manufacturerExtractor.js';
export * from './extraction/packerExtractor.js';
export * from './extraction/importerExtractor.js';
export * from './extraction/netQuantityExtractor.js';
export * from './extraction/mrpExtractor.js';
export * from './extraction/dateExtractor.js';
export * from './extraction/consumerCareExtractor.js';
export * from './extraction/selectiveMultiPass.js';
export * from './extraction/fieldAwareConsensus.js';
export * from './surfaces/index.js';
export * from './compliance/index.js';

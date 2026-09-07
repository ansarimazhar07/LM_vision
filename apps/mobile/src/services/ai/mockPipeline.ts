import type { PackageAnalysis } from '@lm-vision/shared-types';
import { evaluateCompliance } from '@lm-vision/rules';
import type { LocalInspectionImage } from '../../state/draft';
import { normalizeInspectionImages } from './normalization';
import { assessImageQuality } from './qualityEngine';
import { extractMockOcrRegions } from './ocrEngine';
import { extractMockDeclarations } from './declarationEngine';
import { computeMockVisualMeasurements } from './cvEngine';
import { evaluateMockRules } from './ruleEvaluator';
import {
  type PipelineExecutionResult,
  type PipelineOptions,
  PipelineError,
} from './types';

/**
 * Execute the complete deterministic mock AI inspection pipeline.
 * Coordinates all stages with progress reporting and explicit failure propagation.
 */
export async function runMockInspectionPipeline(
  images: LocalInspectionImage[],
  inspectionId: string,
  options?: PipelineOptions,
): Promise<PipelineExecutionResult> {
  const startTime = Date.now();

  try {
    // Stage 1: Image Normalization
    options?.onProgress?.({
      stage: 'NORMALIZING_IMAGES',
      label: 'Normalizing captured packaging photographs...',
      progressPercent: 15,
    });
    const normalizedImages = normalizeInspectionImages(images);

    // Stage 2: Image Quality Assessment
    options?.onProgress?.({
      stage: 'ASSESSING_QUALITY',
      label: 'Analyzing image sharpness, glare, and statutory legibility...',
      progressPercent: 30,
    });
    const quality = assessImageQuality(normalizedImages, options?.simulateQualityFailure);

    // Stage 3: OCR Text Extraction
    options?.onProgress?.({
      stage: 'EXTRACTING_OCR',
      label: 'Extracting text bounding regions across surfaces...',
      progressPercent: 50,
    });
    const textRegions = extractMockOcrRegions(normalizedImages, options?.simulateOcrFailure);

    // Stage 4: Declaration Extraction
    options?.onProgress?.({
      stage: 'EXTRACTING_DECLARATIONS',
      label: 'Classifying mandatory Legal Metrology declarations...',
      progressPercent: 70,
    });
    const declarations = extractMockDeclarations(textRegions);

    // Stage 5: Visual Geometry Measurements
    options?.onProgress?.({
      stage: 'MEASURING_GEOMETRY',
      label: 'Measuring typography numeral height and display area...',
      progressPercent: 85,
    });
    const visualMeasurements = computeMockVisualMeasurements();

    // Stage 6: Deterministic Compliance Evaluation & Evidence Linking
    options?.onProgress?.({
      stage: 'EVALUATING_RULES',
      label: 'Evaluating statutory Legal Metrology rules (GSR 202(E) 2011)...',
      progressPercent: 95,
    });
    const { findings, evidence } = evaluateMockRules(
      inspectionId,
      declarations,
      normalizedImages,
      { onlineListedMrp: options?.onlineListedMrp },
    );

    const now = new Date().toISOString();
    const analysis: PackageAnalysis = {
      provider: 'MOCK',
      modelName: 'lm-vision-mock-pipeline-v1',
      quality,
      declarations,
      textRegions,
      visualMeasurements,
      latencyMs: Date.now() - startTime,
      usage: {
        promptTokens: 1250,
        completionTokens: 820,
        totalTokens: 2070,
      },
      timestamp: now,
    };

    const complianceSummary = evaluateCompliance({
      inspectionId,
      packageAnalysis: analysis,
      actualSalePrice: options?.onlineListedMrp,
    });

    options?.onProgress?.({
      stage: 'COMPLETED',
      label: 'Statutory compliance evaluation complete.',
      progressPercent: 100,
    });

    return {
      success: true,
      analysis,
      declarations,
      findings,
      evidence,
      complianceAssessments: complianceSummary.assessments,
      complianceSummary,
    };
  } catch (err: any) {
    const errorCode = err instanceof PipelineError ? err.code : 'PIPELINE_ERROR';
    const errorMessage = err?.message || 'An unexpected failure occurred during pipeline execution.';

    options?.onProgress?.({
      stage: 'FAILED',
      label: `Pipeline failed: ${errorMessage}`,
      progressPercent: 100,
    });

    return {
      success: false,
      declarations: [],
      findings: [],
      evidence: [],
      error: errorMessage,
      errorCode,
    };
  }
}

import type {
  Declaration,
  Evidence,
  Finding,
  PackageAnalysis,
  PackageSurface,
  ComplianceAssessment,
  ComplianceEvaluationSummary,
  HybridPerceptionSummary,
} from '@lm-vision/shared-types';

export type PipelineStage =
  | 'NORMALIZING_IMAGES'
  | 'ASSESSING_QUALITY'
  | 'EXTRACTING_OCR'
  | 'EXTRACTING_DECLARATIONS'
  | 'MEASURING_GEOMETRY'
  | 'DETECTING_CONFLICTS'
  | 'EVALUATING_RULES'
  | 'COMPLETED'
  | 'FAILED';

export interface StageProgress {
  stage: PipelineStage;
  label: string;
  progressPercent: number;
}

export interface PipelineOptions {
  onProgress?: (progress: StageProgress) => void;
  onFallback?: (reason: string) => void;
  simulateQualityFailure?: boolean;
  simulateOcrFailure?: boolean;
  simulateAnalysisFailure?: boolean;
  onlineListedMrp?: number;
}

export interface NormalizedImage {
  id: string;
  surface: PackageSurface;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Hash: string;
  capturedAt: string;
}

export interface PipelineExecutionResult {
  success: boolean;
  analysis?: PackageAnalysis;
  declarations: Declaration[];
  findings: Finding[];
  evidence: Evidence[];
  complianceAssessments?: ComplianceAssessment[];
  complianceSummary?: ComplianceEvaluationSummary;
  fallbackNotice?: string;
  hybridSummary?: HybridPerceptionSummary;
  analysisMode?: 'CLOUD_AI' | 'LOCAL_ONLY' | 'HYBRID';
  cloudAIStatus?: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
  cloudProvidersAttempted?: ('GEMINI' | 'GROK')[];
  error?: string;
  errorCode?: 'IMAGE_REQUIRED' | 'IMAGE_CORRUPT' | 'QUALITY_REJECTED' | 'OCR_FAILED' | 'PIPELINE_ERROR';
}

export class PipelineError extends Error {
  public readonly code: 'IMAGE_REQUIRED' | 'IMAGE_CORRUPT' | 'QUALITY_REJECTED' | 'OCR_FAILED' | 'PIPELINE_ERROR';

  constructor(
    code: 'IMAGE_REQUIRED' | 'IMAGE_CORRUPT' | 'QUALITY_REJECTED' | 'OCR_FAILED' | 'PIPELINE_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'PipelineError';
    this.code = code;
  }
}

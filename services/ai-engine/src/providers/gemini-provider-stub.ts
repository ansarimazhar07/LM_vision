import {
  AppError,
  type AIHealthStatus,
  type AIProvider,
  type FindingExplanation,
  type FindingExplanationInput,
  type ListingAnalysis,
  type ListingAnalysisInput,
  type PackageAnalysis,
  type PackageAnalysisInput,
} from '@lm-vision/shared-types';
import type { GeminiProviderOptions } from './gemini-provider.js';

export type { GeminiProviderOptions };

/**
 * Gemini AI Provider Skeleton / Stub
 * Maintained for backward compatibility and test isolation.
 * For real Gemini multimodal AI execution, use GeminiProvider from './gemini-provider.js'.
 */
export class GeminiProviderStub implements AIProvider {
  public readonly name = 'GEMINI' as const;
  public readonly modelName: string;
  public readonly defaultModel: string;
  private readonly apiKey?: string;

  constructor(options?: GeminiProviderOptions) {
    this.apiKey = options?.apiKey ?? (typeof process !== 'undefined' ? process.env?.['GEMINI_API_KEY'] : undefined);
    this.modelName =
      options?.modelName ??
      (typeof process !== 'undefined' ? process.env?.['GEMINI_MODEL'] : undefined) ??
      'configured-gemini-model';
    this.defaultModel = this.modelName;
  }

  public async analyzePackage(_input: PackageAnalysisInput): Promise<PackageAnalysis> {
    throw new AppError({
      code: 'AI_PROVIDER_ERROR',
      message: 'GeminiProvider live API integration is deferred to Phase 6 (Gemini).',
      statusCode: 501,
    });
  }

  public async explainFinding(_input: FindingExplanationInput): Promise<FindingExplanation> {
    throw new AppError({
      code: 'AI_PROVIDER_ERROR',
      message: 'GeminiProvider live API integration is deferred to Phase 6 (Gemini).',
      statusCode: 501,
    });
  }

  public async analyzeEcommerceListing(_input: ListingAnalysisInput): Promise<ListingAnalysis> {
    throw new AppError({
      code: 'AI_PROVIDER_ERROR',
      message: 'GeminiProvider live API integration is deferred to Phase 6 (Gemini).',
      statusCode: 501,
    });
  }

  public async healthCheck(): Promise<AIHealthStatus> {
    return {
      provider: 'GEMINI',
      modelName: this.modelName,
      isHealthy: Boolean(this.apiKey),
      latencyMs: 0,
      message: this.apiKey ? 'GeminiProvider configured (stub mode)' : 'GeminiProvider API key missing',
      timestamp: new Date().toISOString(),
    };
  }
}

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

export interface OpenAIProviderOptions {
  apiKey?: string;
  modelName?: string;
}

/**
 * OpenAI AI Provider Skeleton
 * Live OpenAI API integration is scheduled for Phase 7 (OpenAI).
 */
export class OpenAIProviderStub implements AIProvider {
  public readonly name = 'OPENAI' as const;
  public readonly modelName: string;
  public readonly defaultModel: string;
  private readonly apiKey?: string;

  constructor(options?: OpenAIProviderOptions) {
    this.apiKey = options?.apiKey ?? (typeof process !== 'undefined' ? process.env?.['OPENAI_API_KEY'] : undefined);
    this.modelName =
      options?.modelName ??
      (typeof process !== 'undefined' ? process.env?.['OPENAI_MODEL'] : undefined) ??
      'configured-openai-model';
    this.defaultModel = this.modelName;
  }

  public async analyzePackage(_input: PackageAnalysisInput): Promise<PackageAnalysis> {
    throw new AppError({
      code: 'AI_PROVIDER_ERROR',
      message: 'OpenAIProvider live API integration is deferred to Phase 7 (OpenAI).',
      statusCode: 501,
    });
  }

  public async explainFinding(_input: FindingExplanationInput): Promise<FindingExplanation> {
    throw new AppError({
      code: 'AI_PROVIDER_ERROR',
      message: 'OpenAIProvider live API integration is deferred to Phase 7 (OpenAI).',
      statusCode: 501,
    });
  }

  public async analyzeEcommerceListing(_input: ListingAnalysisInput): Promise<ListingAnalysis> {
    throw new AppError({
      code: 'AI_PROVIDER_ERROR',
      message: 'OpenAIProvider live API integration is deferred to Phase 7 (OpenAI).',
      statusCode: 501,
    });
  }

  public async healthCheck(): Promise<AIHealthStatus> {
    return {
      provider: 'OPENAI',
      modelName: this.modelName,
      isHealthy: Boolean(this.apiKey),
      latencyMs: 0,
      message: this.apiKey ? 'OpenAIProvider configured (stub mode)' : 'OpenAIProvider API key missing',
      timestamp: new Date().toISOString(),
    };
  }
}

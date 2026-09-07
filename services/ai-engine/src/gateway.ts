import {
  AppError,
  type AIHealthStatus,
  type AIProvider,
  type AIProviderName,
  type FindingExplanation,
  type FindingExplanationInput,
  type ListingAnalysis,
  type ListingAnalysisInput,
  type PackageAnalysis,
  type PackageAnalysisInput,
} from '@lm-vision/shared-types';
import { MockAIProvider } from './providers/mock-provider.js';
import { GeminiProvider, type GeminiProviderOptions } from './providers/gemini-provider.js';

export interface AIEngineGatewayOptions {
  defaultProvider?: AIProviderName;
  geminiOptions?: GeminiProviderOptions;
  autoRegisterDefaults?: boolean;
}

/**
 * AI Gateway Registry & Dispatcher
 */
export class AIEngineGateway {
  private readonly providers = new Map<AIProviderName, AIProvider>();
  private defaultProvider: AIProviderName;

  constructor(options?: AIEngineGatewayOptions) {
    this.defaultProvider = options?.defaultProvider ?? 'MOCK';

    if (options?.autoRegisterDefaults) {
      this.registerProvider(new MockAIProvider());
      try {
        this.registerProvider(new GeminiProvider(options.geminiOptions));
      } catch {
        // Safe registration if env keys absent
      }
    }
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name?: AIProviderName): AIProvider {
    const target = name ?? this.defaultProvider;
    const provider = this.providers.get(target);

    if (!provider) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: `AI Provider '${target}' is not registered in the gateway.`,
        statusCode: 500,
      });
    }

    return provider;
  }

  public hasProvider(name: AIProviderName): boolean {
    return this.providers.has(name);
  }

  public setDefaultProvider(name: AIProviderName): void {
    if (!this.providers.has(name)) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: `Cannot set unregistered provider '${name}' as default.`,
      });
    }
    this.defaultProvider = name;
  }

  public getDefaultProviderName(): AIProviderName {
    return this.defaultProvider;
  }

  /**
   * Execute package analysis using specified or default provider
   */
  public async analyzePackage(
    input: PackageAnalysisInput,
    preferredProvider?: AIProviderName
  ): Promise<PackageAnalysis> {
    const provider = this.getProvider(preferredProvider);
    return provider.analyzePackage(input);
  }

  /**
   * Generate finding explanation using specified or default provider
   */
  public async explainFinding(
    input: FindingExplanationInput,
    preferredProvider?: AIProviderName
  ): Promise<FindingExplanation> {
    const provider = this.getProvider(preferredProvider);
    return provider.explainFinding(input);
  }

  /**
   * Analyze e-commerce listing comparison using specified or default provider
   */
  public async analyzeEcommerceListing(
    input: ListingAnalysisInput,
    preferredProvider?: AIProviderName
  ): Promise<ListingAnalysis> {
    const provider = this.getProvider(preferredProvider);
    return provider.analyzeEcommerceListing(input);
  }

  /**
   * Check health of specified or default provider
   */
  public async healthCheck(preferredProvider?: AIProviderName): Promise<AIHealthStatus> {
    const provider = this.getProvider(preferredProvider);
    return provider.healthCheck();
  }
}

/**
 * Creates a fully configured production AI Engine Gateway
 * with MockAIProvider and GeminiProvider pre-registered.
 */
export function createProductionGateway(options?: {
  defaultProvider?: AIProviderName;
  geminiOptions?: GeminiProviderOptions;
}): AIEngineGateway {
  const defaultProvider =
    options?.defaultProvider ??
    (typeof process !== 'undefined'
      ? (process.env['AI_DEFAULT_PROVIDER'] as AIProviderName) ||
        (process.env['AI_PROVIDER_DEFAULT'] as AIProviderName) ||
        'GEMINI'
      : 'GEMINI');

  const gateway = new AIEngineGateway({ defaultProvider });
  gateway.registerProvider(new MockAIProvider());
  gateway.registerProvider(new GeminiProvider(options?.geminiOptions));

  return gateway;
}

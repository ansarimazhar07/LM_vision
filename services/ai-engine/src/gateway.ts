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
import { GrokProvider, type GrokProviderOptions } from './providers/grokProvider.js';
import { ProviderRouter, type ProviderRouterOptions } from './providers/providerRouter.js';
import { ProviderError } from './providers/providerErrors.js';
import type { CanonicalAIObservationResult } from './providers/providerTypes.js';

export interface AIEngineGatewayOptions {
  defaultProvider?: AIProviderName;
  geminiOptions?: GeminiProviderOptions;
  grokOptions?: GrokProviderOptions;
  routerOptions?: ProviderRouterOptions;
  autoRegisterDefaults?: boolean;
}

/**
 * AI Gateway Registry & Failover Dispatcher
 */
export class AIEngineGateway {
  private readonly providers = new Map<AIProviderName, AIProvider>();
  private defaultProvider: AIProviderName;
  private router: ProviderRouter;
  private readonly routerOptions?: ProviderRouterOptions;

  constructor(options?: AIEngineGatewayOptions) {
    this.defaultProvider = options?.defaultProvider ?? 'MOCK';
    this.routerOptions = options?.routerOptions instanceof ProviderRouter ? undefined : options?.routerOptions;

    const geminiTimeout = Number(process.env['GEMINI_TIMEOUT_MS'] || 7000);
    const grokTimeout = Number(process.env['GROK_TIMEOUT_MS'] || 7000);
    const safeGeminiTimeout = isNaN(geminiTimeout) || geminiTimeout <= 0 ? 7000 : Math.min(geminiTimeout, 10000);
    const safeGrokTimeout = isNaN(grokTimeout) || grokTimeout <= 0 ? 7000 : grokTimeout;

    const gemini = new GeminiProvider({
      ...options?.geminiOptions,
      timeoutMs: options?.geminiOptions?.timeoutMs ?? safeGeminiTimeout,
    });
    const grok = new GrokProvider({
      ...options?.grokOptions,
      timeoutMs: options?.grokOptions?.timeoutMs ?? safeGrokTimeout,
    });

    this.providers.set('MOCK', new MockAIProvider());
    this.providers.set('GEMINI', gemini);
    this.providers.set('GROK', grok);

    this.router =
      options?.routerOptions instanceof ProviderRouter
        ? options.routerOptions
        : new ProviderRouter({
            ...options?.routerOptions,
            geminiProvider: gemini,
            grokProvider: grok,
            geminiOptions: options?.geminiOptions,
            grokOptions: options?.grokOptions,
          });
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
    if (provider.name === 'GEMINI' || provider.name === 'GROK') {
      this.router = new ProviderRouter({
        ...this.routerOptions,
        geminiProvider: this.providers.get('GEMINI'),
        grokProvider: this.providers.get('GROK'),
      });
    }
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

  public getRouter(): ProviderRouter {
    return this.router;
  }

  /**
   * Routes package analysis through the 3-tier failover router:
   * GEMINI -> xAI GROK -> CLOUD_AI_UNAVAILABLE
   */
  public async routePackageAnalysis(
    input: PackageAnalysisInput,
    preferredProvider?: AIProviderName
  ): Promise<CanonicalAIObservationResult> {
    if (preferredProvider === 'MOCK' || (!preferredProvider && this.defaultProvider === 'MOCK')) {
      const mockProvider = this.getProvider('MOCK');
      const start = Date.now();
      const analysis = await mockProvider.analyzePackage(input);
      return {
        provider: 'MOCK',
        model: 'mock-vision-engine-v1',
        status: 'CLOUD_AI_SUCCESS',
        observations: analysis.declarations,
        latencyMs: Date.now() - start,
        requestId: 'mock-request-id',
        generatedAt: new Date().toISOString(),
        packageAnalysis: analysis,
      };
    }

    return this.router.routePackageAnalysis(input, preferredProvider);
  }

  /**
   * Execute package analysis using specified or default provider
   */
  public async analyzePackage(
    input: PackageAnalysisInput,
    preferredProvider?: AIProviderName
  ): Promise<PackageAnalysis> {
    // If explicitly calling MOCK, bypass router
    if (preferredProvider === 'MOCK' || (!preferredProvider && this.defaultProvider === 'MOCK')) {
      const provider = this.getProvider(preferredProvider);
      return provider.analyzePackage(input);
    }

    const routerResult = await this.router.routePackageAnalysis(input, preferredProvider);

    if (routerResult.status === 'CLOUD_AI_SUCCESS' && routerResult.packageAnalysis) {
      return routerResult.packageAnalysis;
    }

    throw new ProviderError({
      provider: routerResult.fallbackFrom || 'GEMINI',
      category: 'PROVIDER_UNAVAILABLE',
      message: routerResult.error || 'All cloud AI providers failed or timed out.',
      httpStatus: 503,
      isRetryable: false,
    });
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
 * with MockAIProvider, GeminiProvider, and GrokProvider pre-registered.
 */
export function createProductionGateway(options?: {
  defaultProvider?: AIProviderName;
  geminiOptions?: GeminiProviderOptions;
  grokOptions?: GrokProviderOptions;
}): AIEngineGateway {
  const defaultProvider =
    options?.defaultProvider ??
    (typeof process !== 'undefined'
      ? (process.env['AI_DEFAULT_PROVIDER'] as AIProviderName) ||
        (process.env['AI_PROVIDER_DEFAULT'] as AIProviderName) ||
        'GEMINI'
      : 'GEMINI');

  const gateway = new AIEngineGateway({
    defaultProvider,
    geminiOptions: options?.geminiOptions,
    grokOptions: options?.grokOptions,
  });

  return gateway;
}

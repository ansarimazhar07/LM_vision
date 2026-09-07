import type {
  AIHealthStatus,
  AIProvider,
  FindingExplanation,
  FindingExplanationInput,
  ListingAnalysis,
  ListingAnalysisInput,
  PackageAnalysis,
  PackageAnalysisInput,
} from '@lm-vision/shared-types';

export interface MockAIProviderOptions {
  modelName?: string;
}

/**
 * Deterministic Mock AI Provider for testing and local development
 * without requiring live Gemini or OpenAI API keys.
 */
export class MockAIProvider implements AIProvider {
  public readonly name = 'MOCK' as const;
  public readonly modelName: string;
  public readonly defaultModel: string;

  constructor(options?: MockAIProviderOptions) {
    this.modelName =
      options?.modelName ??
      (typeof process !== 'undefined' ? process.env?.['MOCK_AI_MODEL'] : undefined) ??
      'mock-vision-engine-v1';
    this.defaultModel = this.modelName;
  }

  public async analyzePackage(input: PackageAnalysisInput): Promise<PackageAnalysis> {
    const now = new Date().toISOString();
    const primaryImageId = input.images[0]?.imageId ?? '00000000-0000-0000-0000-000000000000';

    return {
      provider: 'MOCK',
      modelName: this.modelName,
      quality: {
        overallScore: 0.95,
        isAcceptable: true,
        sharpness: 92,
        brightness: 88,
        glareDetected: false,
        blurDetected: false,
        shadowDetected: false,
        estimatedDpi: 300,
        warnings: [],
      },
      declarations: [
        {
          type: 'GENERIC_NAME',
          rawText: 'Herbal Anti-Dandruff Shampoo',
          normalizedValue: 'Herbal Anti-Dandruff Shampoo',
          unit: null,
          confidence: 0.98,
          detectedLanguage: 'en',
          region: {
            id: 'mock-region-1',
            imageId: primaryImageId,
            surface: 'FRONT',
            boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.35, unit: 'NORMALIZED' },
            text: 'Herbal Anti-Dandruff Shampoo',
            confidence: 0.98,
          },
        },
        {
          type: 'NET_QUANTITY',
          rawText: 'Net Vol. 180 ml',
          normalizedValue: 180,
          unit: 'ml',
          confidence: 0.96,
          detectedLanguage: 'en',
          region: {
            id: 'mock-region-2',
            imageId: primaryImageId,
            surface: 'FRONT',
            boundingBox: { xMin: 0.3, yMin: 0.75, xMax: 0.7, yMax: 0.85, unit: 'NORMALIZED' },
            text: 'Net Vol. 180 ml',
            confidence: 0.96,
          },
        },
        {
          type: 'MRP',
          rawText: 'MRP Rs. 240.00 (Incl. of all taxes)',
          normalizedValue: 240.0,
          unit: 'INR',
          confidence: 0.99,
          detectedLanguage: 'en',
          region: {
            id: 'mock-region-3',
            imageId: primaryImageId,
            surface: 'BACK',
            boundingBox: { xMin: 0.2, yMin: 0.6, xMax: 0.8, yMax: 0.7, unit: 'NORMALIZED' },
            text: 'MRP Rs. 240.00 (Incl. of all taxes)',
            confidence: 0.99,
          },
        },
      ],
      textRegions: [
        {
          id: 'mock-region-1',
          imageId: primaryImageId,
          surface: 'FRONT',
          boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.35, unit: 'NORMALIZED' },
          text: 'Herbal Anti-Dandruff Shampoo',
          confidence: 0.98,
        },
        {
          id: 'mock-region-2',
          imageId: primaryImageId,
          surface: 'FRONT',
          boundingBox: { xMin: 0.3, yMin: 0.75, xMax: 0.7, yMax: 0.85, unit: 'NORMALIZED' },
          text: 'Net Vol. 180 ml',
          confidence: 0.96,
        },
      ],
      visualMeasurements: [
        {
          id: 'mock-meas-1',
          type: 'FONT_HEIGHT',
          value: 3.2,
          unit: 'mm',
          confidence: 0.92,
          targetRegionId: 'mock-region-2',
          calibrationApplied: true,
          scaleFactorMmPerPixel: 0.05,
        },
      ],
      latencyMs: 85,
      usage: {
        promptTokens: 120,
        completionTokens: 350,
        totalTokens: 470,
      },
      timestamp: now,
    };
  }

  public async explainFinding(input: FindingExplanationInput): Promise<FindingExplanation> {
    return {
      explanationMarkdown: `### Finding Analysis: ${input.finding.title}\n\nThe product packaging was evaluated against statutory requirements. The detected declaration deviated from the expected standard.`,
      plainLanguageSummary: `The inspected package does not satisfy ${input.rule.title}. Expected: ${String(input.finding.expectedValue)}, Detected: ${String(input.finding.actualValue)}.`,
      statutoryReference: input.rule.ruleNumber,
      severityAssessment: input.finding.severity,
      recommendedCorrection: 'Update packaging label graphics to comply with standard declaration formatting and minimum font dimensions.',
      suggestedInspectorAction: 'Verify physical sample and issue advisory notice to manufacturer.',
      confidence: 'HIGH',
    };
  }

  public async analyzeEcommerceListing(input: ListingAnalysisInput): Promise<ListingAnalysis> {
    const now = new Date().toISOString();
    return {
      listingId: input.listing.id,
      mrpMatch: true,
      netQuantityMatch: true,
      countryOfOriginMatch: true,
      manufacturerMatch: true,
      discrepancies: [],
      overallConsistencyScore: 0.99,
      summary: 'All declarations on the physical package match the listed e-commerce attributes.',
      analyzedAt: now,
    };
  }

  public async healthCheck(): Promise<AIHealthStatus> {
    return {
      provider: 'MOCK',
      modelName: this.defaultModel,
      isHealthy: true,
      latencyMs: 5,
      message: 'Mock provider operational',
      timestamp: new Date().toISOString(),
    };
  }
}

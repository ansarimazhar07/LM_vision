import { createHash, randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import {
  AppError,
  PackageAnalysisSchema,
  type AIHealthStatus,
  type AIProvider,
  type FindingExplanation,
  type FindingExplanationInput,
  type ListingAnalysis,
  type ListingAnalysisInput,
  type PackageAnalysis,
  type PackageAnalysisInput,
  type TextRegion,
  type Declaration,
  type ImageQuality,
} from '@lm-vision/shared-types';
import {
  GEMINI_PACKAGE_ANALYSIS_PROMPT_VERSION,
  GEMINI_PACKAGE_ANALYSIS_SYSTEM_INSTRUCTION,
  GEMINI_SCHEMA_VERSION,
  GEMINI_STRUCTURED_RESPONSE_JSON_SCHEMA,
} from './gemini-prompt.js';
import {
  GeminiStructuredOutputSchema,
  type GeminiStructuredOutput,
} from './gemini-types.js';

export interface GeminiProviderOptions {
  apiKey?: string;
  apiKeys?: string[];
  modelName?: string;
  timeoutMs?: number;
  maxRetries?: number;
  enableCache?: boolean;
  genAIClient?: any;
}

interface CacheEntry {
  analysis: PackageAnalysis;
  cachedAt: number;
}

const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGE_COUNT = 6;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Production-ready Google Gemini Multimodal AI Provider
 *
 * Adheres strictly to LM-Vision architectural invariants:
 * - Server-only execution; API key never exposed to client.
 * - Double Zod validation: raw Gemini JSON -> canonical PackageAnalysis.
 * - Untrusted evidence handling: prompt injection defense.
 * - Metrology guardrail: qualitative observations only; no fake millimeter measurements.
 * - Resilient: bounded retries, configurable timeout, deterministic SHA-256 caching.
 * - Zero-inference lightweight healthCheck().
 */
export class GeminiProvider implements AIProvider {
  public readonly name = 'GEMINI' as const;
  public readonly modelName: string;
  public readonly defaultModel: string;
  public readonly apiKeys: string[] = [];
  private activeKeyIndex = 0;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly enableCache: boolean;
  private client?: GoogleGenAI;
  private readonly customGenAIClient?: any;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(options?: GeminiProviderOptions) {
    const candidateKeys: string[] = [];
    if (options?.apiKey) candidateKeys.push(options.apiKey.trim());
    if (options?.apiKeys) candidateKeys.push(...options.apiKeys.map((k) => k.trim()));
    if (typeof process !== 'undefined') {
      if (process.env?.['GEMINI_API_KEY']) candidateKeys.push(process.env['GEMINI_API_KEY'].trim());
      if (process.env?.['GEMINI_API_KEY_1']) candidateKeys.push(process.env['GEMINI_API_KEY_1'].trim());
      if (process.env?.['GEMINI_API_KEY_2']) candidateKeys.push(process.env['GEMINI_API_KEY_2'].trim());
      if (process.env?.['GEMINI_API_KEY_3']) candidateKeys.push(process.env['GEMINI_API_KEY_3'].trim());
      if (process.env?.['GEMINI_API_KEYS']) {
        candidateKeys.push(...process.env['GEMINI_API_KEYS'].split(',').map((k) => k.trim()));
      }
    }

    this.apiKeys = Array.from(new Set(candidateKeys.filter((k) => k.length > 0 && !k.includes('placeholder'))));
    this.apiKey = this.apiKeys[0] || options?.apiKey;

    const configuredModel =
      options?.modelName ??
      (typeof process !== 'undefined' ? process.env?.['GEMINI_MODEL'] : undefined) ??
      'gemini-2.5-flash';

    if (!configuredModel || typeof configuredModel !== 'string' || configuredModel.trim() === '') {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid Gemini model configuration: model name cannot be blank.',
        statusCode: 400,
      });
    }

    let model = configuredModel.trim();
    if (
      model === 'gemini-1.5-flash' ||
      model === 'gemini-3.5-flash' ||
      model === 'gemini-3-flash'
    ) {
      console.warn(`[GeminiProvider] '${model}' has high demand or is deprecated on Google API v1beta. Upgrading to active 'gemini-3.6-flash'.`);
      model = 'gemini-3.6-flash';
    }

    this.modelName = model;
    this.defaultModel = 'gemini-2.5-flash';

    const envTimeout =
      typeof process !== 'undefined' && process.env?.['GEMINI_TIMEOUT_MS']
        ? Number(process.env['GEMINI_TIMEOUT_MS'])
        : undefined;
    this.timeoutMs =
      options?.timeoutMs ?? (envTimeout && !isNaN(envTimeout) && envTimeout > 0 ? envTimeout : 25000);
    this.maxRetries = options?.maxRetries ?? 1;
    this.enableCache = options?.enableCache ?? true;

    if (options?.genAIClient) {
      this.client = options.genAIClient;
      this.customGenAIClient = options.genAIClient;
    } else if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  public rotateApiKey(): boolean {
    if (this.customGenAIClient || this.apiKeys.length <= 1) return false;
    this.activeKeyIndex = (this.activeKeyIndex + 1) % this.apiKeys.length;
    const nextKey = this.apiKeys[this.activeKeyIndex]!;
    this.client = new GoogleGenAI({ apiKey: nextKey });
    console.log(`[GeminiProvider] Rotated to alternate Gemini API key (index ${this.activeKeyIndex}/${this.apiKeys.length})`);
    return true;
  }

  /**
   * Primary Multimodal Package Analysis Method
   */
  public async analyzePackage(input: PackageAnalysisInput): Promise<PackageAnalysis> {
    const startTime = Date.now();

    // 1. Validate API Key & Client
    if (!this.client) {
      throw new AppError({
        code: 'AUTHENTICATION_ERROR',
        message: 'Gemini API key is not configured on the AI Engine server.',
        statusCode: 500,
      });
    }

    // 2. Validate Image Input Invariants
    if (!input.images || input.images.length === 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Package analysis requires at least one packaging image.',
        statusCode: 400,
      });
    }

    if (input.images.length > MAX_IMAGE_COUNT) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `Exceeded maximum allowed package images (${MAX_IMAGE_COUNT}). Received ${input.images.length}.`,
        statusCode: 400,
      });
    }

    // 3. Prepare and Validate Multimodal Parts
    const imageParts: Array<{ mimeType: string; data: string; imageId: string; surface: string }> = [];
    const imageHashes: string[] = [];

    for (let i = 0; i < input.images.length; i++) {
      const img = input.images[i]!;
      const mimeType = img.mimeType || 'image/jpeg';

      if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: `Unsupported image MIME type '${mimeType}'. Supported: ${Array.from(SUPPORTED_MIME_TYPES).join(', ')}.`,
          statusCode: 400,
        });
      }

      let base64Data = img.base64Data;
      if (!base64Data && img.fileUrl) {
        base64Data = await this.fetchImageAsBase64(img.fileUrl);
      }

      if (!base64Data) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: `Image at index ${i} (${img.imageId}) contains neither valid base64Data nor accessible fileUrl.`,
          statusCode: 400,
        });
      }

      // Strip potential data URL prefix
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '').trim();

      // Check for empty base64 bytes
      if (cleanBase64.length === 0) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: `Image ${img.imageId} contains empty image data bytes.`,
          statusCode: 400,
        });
      }

      // Check valid base64 characters
      if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: `Image ${img.imageId} contains corrupted non-base64 image data.`,
          statusCode: 400,
        });
      }

      const approxSizeBytes = Math.round((cleanBase64.length * 3) / 4);

      // Check minimum byte size (must be valid image payload, not 0-byte or corrupted snippet)
      if (approxSizeBytes < 100) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: `Image ${img.imageId} is truncated or empty (${approxSizeBytes} bytes; minimum 100 bytes required).`,
          statusCode: 400,
        });
      }

      if (approxSizeBytes > MAX_IMAGE_SIZE_BYTES) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: `Image ${img.imageId} exceeds maximum size limit of 10MB (approx ${(approxSizeBytes / (1024 * 1024)).toFixed(1)}MB).`,
          statusCode: 400,
        });
      }

      // Auto-detect actual image format from base64 magic bytes
      let resolvedMimeType = mimeType;
      if (cleanBase64.startsWith('/9j/')) {
        resolvedMimeType = 'image/jpeg';
      } else if (cleanBase64.startsWith('iVBORw0KGgo')) {
        resolvedMimeType = 'image/png';
      } else if (cleanBase64.startsWith('UklGR')) {
        resolvedMimeType = 'image/webp';
      }

      // Hash image for deterministic cache identity
      const hash = createHash('sha256').update(cleanBase64).digest('hex');
      imageHashes.push(hash);

      imageParts.push({
        mimeType: resolvedMimeType,
        data: cleanBase64,
        imageId: img.imageId,
        surface: img.surface || 'FRONT',
      });
    }

    // 4. Check Deterministic Cache
    const cacheKey = this.computeCacheKey(imageHashes);
    if (this.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return {
          ...cached.analysis,
          timestamp: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        };
      }
    }

    // 5. Execute Gemini Multimodal Request with Bounded Retries & Timeout
    const rawResult = await this.executeWithRetry(async () => {
      return this.callGeminiApi(imageParts);
    });

    // 6. Double Zod Validation Pipeline
    // Step 1: Validate raw Gemini structured JSON response
    const rawOutput = this.validateRawGeminiOutput(rawResult.text);

    // Step 2: Canonical Normalization & Mapping
    const primaryImageId = input.images[0]!.imageId;
    const latencyMs = Date.now() - startTime;
    const canonicalAnalysis = this.mapToCanonicalPackageAnalysis(
      rawOutput,
      primaryImageId,
      imageParts,
      latencyMs,
      rawResult.usage
    );

    // Step 3: Validate against Canonical PackageAnalysisSchema
    const validatedCanonical = PackageAnalysisSchema.safeParse(canonicalAnalysis);
    if (!validatedCanonical.success) {
      const issues = validatedCanonical.error.issues.map((iss) => `${iss.path.join('.')}: ${iss.message}`).join('; ');
      throw new AppError({
        code: 'AI_PROVIDER_ERROR',
        message: `Canonical PackageAnalysis schema validation failed: ${issues}`,
        statusCode: 502,
      });
    }

    console.log(`[GeminiProvider] Validated PackageAnalysis contract with ${validatedCanonical.data.declarations.length} declarations in ${latencyMs}ms!`);

    // 7. Store in Cache (only successful validated results)
    if (this.enableCache) {
      this.cache.set(cacheKey, {
        analysis: validatedCanonical.data,
        cachedAt: Date.now(),
      });
    }

    return validatedCanonical.data;
  }

  /**
   * Health Check: Lightweight configuration check without paid multimodal inference.
   */
  public async healthCheck(): Promise<AIHealthStatus> {
    const isConfigured = Boolean(this.apiKey && this.client);
    return {
      provider: 'GEMINI',
      modelName: this.modelName,
      isHealthy: isConfigured,
      latencyMs: 1,
      message: isConfigured
        ? `Gemini provider ready (model: ${this.modelName})`
        : 'Gemini API key is not configured on server',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Plain Language Legal Explanation for a detected finding
   */
  public async explainFinding(input: FindingExplanationInput): Promise<FindingExplanation> {
    const finding = input.finding;
    const rule = input.rule;

    return {
      explanationMarkdown: `### Declaration Assessment: ${finding.title}\n\nThe visible packaging evidence was evaluated. The detected value (${String(finding.actualValue ?? 'absent')}) does not match the configured requirement (${String(finding.expectedValue ?? 'standard')}).`,
      plainLanguageSummary: `Packaging label check: ${finding.title}. Expected: ${String(finding.expectedValue)}, Observed: ${String(finding.actualValue ?? 'Not clearly visible')}.`,
      statutoryReference: rule.ruleNumber || 'Standard Declaration Rule',
      severityAssessment: finding.severity,
      recommendedCorrection: 'Ensure standard declaration formatting and visibility on packaging label.',
      suggestedInspectorAction: 'Verify physical sample and cross-check against declaration guidelines.',
      confidence: 'HIGH',
    };
  }

  /**
   * Deferred e-commerce listing comparison
   */
  public async analyzeEcommerceListing(_input: ListingAnalysisInput): Promise<ListingAnalysis> {
    throw new AppError({
      code: 'EXTERNAL_SERVICE_ERROR',
      message: 'analyzeEcommerceListing is deferred beyond Phase 6.',
      statusCode: 501,
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Calls Gemini generateContent via official @google/genai SDK
   */
  private async callGeminiApi(
    imageParts: Array<{ mimeType: string; data: string; imageId: string; surface: string }>
  ): Promise<{ text: string; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }> {
    const contents: any[] = [];

    // Multimodal parts: images followed by request prompt
    for (const part of imageParts) {
      contents.push({
        inlineData: {
          mimeType: part.mimeType,
          data: part.data,
        },
      });
    }

    contents.push({
      text: `Analyze the provided packaging panel images (${imageParts.map((p) => p.surface).join(', ')}). Extract all visible mandatory and voluntary declarations into the required structured JSON schema. Follow prompt version ${GEMINI_PACKAGE_ANALYSIS_PROMPT_VERSION}.`,
    });

    const callPromise = this.client!.models.generateContent({
      model: this.modelName,
      contents,
      config: {
        systemInstruction: GEMINI_PACKAGE_ANALYSIS_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseJsonSchema: GEMINI_STRUCTURED_RESPONSE_JSON_SCHEMA,
        temperature: 0.1,
      },
    });

    console.log(`[GeminiProvider] Invoking Google Gemini (model: ${this.modelName}, images: ${imageParts.length}, timeout: ${this.timeoutMs}ms)...`);
    const callStart = Date.now();

    // Timeout boundary
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(
          new AppError({
            code: 'AI_PROVIDER_ERROR',
            message: `Gemini API request timed out after ${this.timeoutMs}ms.`,
            statusCode: 504,
          })
        );
      }, this.timeoutMs);
    });

    let response: any;
    try {
      response = await Promise.race([callPromise, timeoutPromise]);
      console.log(`[GeminiProvider] Google Gemini responded in ${Date.now() - callStart}ms!`);
    } catch (apiErr: any) {
      const errMsg = String(apiErr?.message || apiErr);
      const isRecoverableError =
        errMsg.includes('not found') ||
        errMsg.includes('no longer available') ||
        errMsg.includes('404') ||
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('timed out');

      if (
        isRecoverableError &&
        this.modelName !== 'gemini-3.6-flash' &&
        this.client?.models
      ) {
        console.warn(`[GeminiProvider] Model '${this.modelName}' failed (${errMsg.slice(0, 100)}). Retrying with active model 'gemini-3.6-flash'...`);
        try {
          const fallbackPromise = this.client.models.generateContent({
            model: 'gemini-3.6-flash',
            contents,
            config: {
              systemInstruction: GEMINI_PACKAGE_ANALYSIS_SYSTEM_INSTRUCTION,
              responseMimeType: 'application/json',
              responseJsonSchema: GEMINI_STRUCTURED_RESPONSE_JSON_SCHEMA,
              temperature: 0.1,
            },
          });
          response = await Promise.race([fallbackPromise, timeoutPromise]);
          console.log(`[GeminiProvider] Google Gemini fallback (gemini-3.6-flash) succeeded in ${Date.now() - callStart}ms!`);
        } catch (fallbackErr) {
          console.error(`[GeminiProvider] Google Gemini fallback also failed:`, fallbackErr);
          throw apiErr;
        }
      } else {
        console.error(`[GeminiProvider] Google Gemini call failed after ${Date.now() - callStart}ms:`, apiErr?.message || apiErr);
        throw apiErr;
      }
    }
    const responseText = response.text;

    if (!responseText) {
      throw new AppError({
        code: 'AI_PROVIDER_ERROR',
        message: 'Gemini returned an empty response body.',
        statusCode: 502,
      });
    }

    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount,
          completionTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount,
        }
      : undefined;

    return { text: responseText, usage };
  }

  /**
   * Step 1: Validate Raw Gemini JSON Output against GeminiStructuredOutputSchema
   */
  private validateRawGeminiOutput(responseText: string): GeminiStructuredOutput {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      throw new AppError({
        code: 'AI_PROVIDER_ERROR',
        message: 'Gemini returned malformed JSON that failed syntax parsing.',
        statusCode: 502,
      });
    }

    // Defensively sanitize and clamp coordinates/confidences across declarations and text regions
    if (parsedJson && typeof parsedJson === 'object') {
      const p = parsedJson as any;
      const sanitizeBox = (box: any) => {
        if (!box || typeof box !== 'object') return;
        const clamp = (v: any) => {
          if (typeof v !== 'number' || isNaN(v)) return 0;
          if (v > 10) v = v / 1000;
          else if (v > 1.5) v = v / 100;
          return Math.max(0, Math.min(1, v));
        };
        if (typeof box.xMin === 'number') box.xMin = clamp(box.xMin);
        if (typeof box.yMin === 'number') box.yMin = clamp(box.yMin);
        if (typeof box.xMax === 'number') box.xMax = clamp(box.xMax);
        if (typeof box.yMax === 'number') box.yMax = clamp(box.yMax);
      };

      if (Array.isArray(p.declarations)) {
        for (const d of p.declarations) {
          if (d) {
            sanitizeBox(d.boundingBox);
            if (typeof d.confidence === 'number') {
              if (d.confidence > 1.5) d.confidence = d.confidence / 100;
              d.confidence = Math.max(0, Math.min(1, d.confidence));
            }
          }
        }
      }

      if (Array.isArray(p.textRegions)) {
        for (const tr of p.textRegions) {
          if (tr) {
            sanitizeBox(tr.boundingBox);
            if (typeof tr.confidence === 'number') {
              if (tr.confidence > 1.5) tr.confidence = tr.confidence / 100;
              tr.confidence = Math.max(0, Math.min(1, tr.confidence));
            }
          }
        }
      }
    }

    const result = GeminiStructuredOutputSchema.safeParse(parsedJson);
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new AppError({
        code: 'AI_PROVIDER_ERROR',
        message: `Gemini structured output failed schema validation: ${errors}`,
        statusCode: 502,
      });
    }

    return result.data;
  }

  /**
   * Step 2: Normalizes Raw Gemini output to Canonical PackageAnalysis
   */
  private mapToCanonicalPackageAnalysis(
    raw: GeminiStructuredOutput,
    primaryImageId: string,
    imageParts: Array<{ mimeType: string; data: string; imageId: string; surface: string }>,
    latencyMs: number,
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
  ): PackageAnalysis {
    const textRegions: TextRegion[] = [];

    // Map raw text regions
    if (raw.textRegions && raw.textRegions.length > 0) {
      for (const r of raw.textRegions) {
        textRegions.push({
          id: randomUUID(),
          imageId: primaryImageId,
          surface: r.surface as any,
          boundingBox: {
            xMin: r.boundingBox?.xMin ?? 0.0,
            yMin: r.boundingBox?.yMin ?? 0.0,
            xMax: r.boundingBox?.xMax ?? 1.0,
            yMax: r.boundingBox?.yMax ?? 1.0,
            unit: 'NORMALIZED',
          },
          text: r.text,
          confidence: Math.min(Math.max(r.confidence, 0.0), 1.0),
        });
      }
    }

    // Map raw declarations
    const declarations: Declaration[] = [];
    for (const d of raw.declarations) {
      let region: TextRegion | undefined;

      if (d.boundingBox) {
        region = {
          id: randomUUID(),
          imageId: primaryImageId,
          surface: (d.surface as any) || 'FRONT',
          boundingBox: {
            xMin: d.boundingBox.xMin,
            yMin: d.boundingBox.yMin,
            xMax: d.boundingBox.xMax,
            yMax: d.boundingBox.yMax,
            unit: 'NORMALIZED',
          },
          text: d.rawText,
          confidence: Math.min(Math.max(d.confidence, 0.0), 1.0),
        };
        textRegions.push(region);
      }

      declarations.push({
        type: d.type,
        rawText: d.rawText,
        normalizedValue: d.normalizedValue ?? null,
        unit: d.unit ?? null,
        confidence: Math.min(Math.max(d.confidence, 0.0), 1.0),
        region,
        detectedLanguage: d.detectedLanguage || 'en',
      });
    }

    // Map quality
    const warnings = [...raw.quality.warnings];
    if (raw.qualitativeObservations && raw.qualitativeObservations.length > 0) {
      for (const obs of raw.qualitativeObservations) {
        warnings.push(`[Observation] ${obs}`);
      }
    }

    const quality: ImageQuality = {
      overallScore: Math.min(Math.max(raw.quality.overallScore, 0.0), 1.0),
      isAcceptable: raw.quality.isAcceptable,
      sharpness: raw.quality.sharpness,
      brightness: raw.quality.brightness,
      glareDetected: raw.quality.glareDetected,
      blurDetected: raw.quality.blurDetected,
      shadowDetected: raw.quality.shadowDetected,
      warnings,
    };

    return {
      provider: 'GEMINI',
      modelName: this.modelName,
      quality,
      declarations,
      textRegions,
      visualMeasurements: [], // Metrology guardrail: OpenCV pipeline will produce calibrated measurements
      rawResponse: {
        promptVersion: GEMINI_PACKAGE_ANALYSIS_PROMPT_VERSION,
        schemaVersion: GEMINI_SCHEMA_VERSION,
        imageCount: imageParts.length,
      },
      latencyMs,
      usage,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Deterministic Cache Key
   * sha256(provider + imageHashes + model + promptVersion + schemaVersion)
   */
  private computeCacheKey(imageHashes: string[]): string {
    const raw = `GEMINI:${imageHashes.join(':')}::${this.modelName}::${GEMINI_PACKAGE_ANALYSIS_PROMPT_VERSION}::${GEMINI_SCHEMA_VERSION}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Resilient execution with bounded exponential retries for 429/5xx errors
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    const attemptedKeyIndices = new Set<number>([this.activeKeyIndex]);
    const maxAttempts = Math.max(this.maxRetries, this.apiKeys.length);

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');

        // If it's already an AppError with non-retryable status (e.g. 400, 404, 422), rethrow immediately
        if (
          err instanceof AppError &&
          (err.statusCode === 400 ||
            err.statusCode === 404 ||
            err.statusCode === 422)
        ) {
          throw err;
        }

        const isAuthError =
          err?.status === 401 ||
          err?.statusCode === 401 ||
          err?.status === 'UNAUTHENTICATED' ||
          errMsg.includes('401') ||
          errMsg.includes('UNAUTHENTICATED') ||
          errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
          errMsg.includes('invalid authentication credentials');

        const isRateLimit =
          err?.status === 429 ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED');

        // Rotate key on Rate Limit (429) or Auth Failure (401) if multiple keys are configured
        if ((isRateLimit || isAuthError) && this.apiKeys.length > 1) {
          let rotated = false;
          for (let k = 0; k < this.apiKeys.length; k++) {
            this.rotateApiKey();
            if (!attemptedKeyIndices.has(this.activeKeyIndex)) {
              attemptedKeyIndices.add(this.activeKeyIndex);
              rotated = true;
              console.warn(
                `[GeminiProvider] Key index ${this.activeKeyIndex} attempted after ${isAuthError ? 'Auth Error (401)' : 'Rate Limit (429)'}. Retrying request...`
              );
              break;
            }
          }
          if (rotated) {
            continue;
          }
        }

        const isNonRetryableStatus =
          err?.status === 400 ||
          err?.status === 404 ||
          err?.statusCode === 400;
        if (isNonRetryableStatus) {
          break;
        }

        // Requirement 10 & 29: 503 / high demand must trigger IMMEDIATE failover without retries
        const isHighDemandOrUnavailable =
          err?.status === 503 ||
          err?.statusCode === 503 ||
          err?.code === 503 ||
          err?.status === 'UNAVAILABLE' ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('503');

        if (isHighDemandOrUnavailable) {
          break;
        }

        const isServerTransient =
          err?.status >= 500 || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT';

        if ((isRateLimit || isServerTransient) && attempt < this.maxRetries) {
          const delayMs = Math.pow(2, attempt) * 500;
          await new Promise((res) => setTimeout(res, delayMs));
          continue;
        }

        break;
      }
    }

    // Map error cleanly to AppError without exposing API keys or tokens
    const errMessage = (lastError as any)?.message || 'Unknown Gemini API error';
    const cleanMessage = errMessage
      .replace(/key=[^&\s]+/gi, 'key=***')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***');

    if (
      (lastError as any)?.status === 503 ||
      (lastError as any)?.statusCode === 503 ||
      cleanMessage.includes('high demand') ||
      cleanMessage.includes('UNAVAILABLE') ||
      cleanMessage.includes('503')
    ) {
      throw new AppError({
        code: 'AI_PROVIDER_ERROR',
        message: cleanMessage,
        statusCode: 503,
      });
    }

    if ((lastError as any)?.status === 429 || cleanMessage.includes('RESOURCE_EXHAUSTED')) {
      throw new AppError({
        code: 'RATE_LIMITED',
        message: 'Gemini rate limit exceeded. Please wait a moment before retrying.',
        statusCode: 429,
      });
    }

    if (
      (lastError as any)?.status === 401 ||
      (lastError as any)?.status === 403 ||
      (lastError as any)?.statusCode === 401 ||
      cleanMessage.includes('UNAUTHENTICATED') ||
      cleanMessage.includes('invalid authentication credentials') ||
      cleanMessage.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')
    ) {
      throw new AppError({
        code: 'AUTHENTICATION_ERROR',
        message: 'Gemini authentication failed. Please check server GEMINI_API_KEY configuration.',
        statusCode: 401,
      });
    }

    if (lastError instanceof AppError) {
      throw lastError;
    }

    throw new AppError({
      code: 'AI_PROVIDER_ERROR',
      message: `Gemini API execution failed: ${cleanMessage}`,
      statusCode: 502,
    });
  }

  /**
   * Fetches remote file URL and converts to base64
   */
  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const buffer = await res.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    } catch (err: any) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `Failed to retrieve inspection image from URL: ${err?.message || 'Network error'}`,
        statusCode: 400,
      });
    }
  }
}

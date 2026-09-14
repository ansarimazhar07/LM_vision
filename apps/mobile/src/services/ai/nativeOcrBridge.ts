import { NativeModules, Platform } from 'react-native';
import { registerNativeOCRBridge, type NativeOCRBridge } from '@lm-vision/perception';

export interface NativeOcrResultBlock {
  text: string;
  frame?: { x: number; y: number; width: number; height: number };
  boundingBox?: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  };
  confidence?: number | null;
  lines?: Array<{ text: string; confidence?: number | null }>;
  hasConflict?: boolean;
  verificationStatus?: 'VERIFIED' | 'REQUIRES_VERIFICATION';
  conflictDetail?: string;
}

export interface NativeOcrResponse {
  text: string;
  imageWidth?: number;
  imageHeight?: number;
  effectiveWidth?: number;
  effectiveHeight?: number;
  rotationDegrees?: number;
  multiPassExecuted?: boolean;
  preprocessingApplied?: string;
  hasConflict?: boolean;
  status?: 'SUCCESS' | 'REQUIRES_VERIFICATION';
  blocks: NativeOcrResultBlock[];
}

/**
 * Native OCR Bridge connecting Mobile NativeModules.LMVisionOcr
 * to @lm-vision/perception offline OCR engine.
 */
export class LMVisionNativeOCRBridge implements NativeOCRBridge {
  public async recognizeText(imageUriOrBase64: string): Promise<NativeOcrResponse> {
    const { LMVisionOcr } = NativeModules;
    if (!LMVisionOcr || typeof LMVisionOcr.recognizeText !== 'function') {
      throw new Error(
        `NATIVE_OCR_MODULE_UNAVAILABLE: LMVisionOcr native module is not linked on platform '${Platform.OS}'. ` +
        `Ensure this build includes LMVisionOcrPackage and bundled Google ML Kit dependencies.`
      );
    }

    try {
      const response: NativeOcrResponse = await LMVisionOcr.recognizeText(imageUriOrBase64);
      return response;
    } catch (err: any) {
      console.warn('[LMVisionNativeOCRBridge] Native ML Kit OCR error:', err?.message || err);
      throw err;
    }
  }

  public async analyzeImageQuality(imageUriOrBase64: string): Promise<any> {
    const { LMVisionOcr } = NativeModules;
    if (LMVisionOcr && typeof LMVisionOcr.analyzeImageQuality === 'function') {
      return await LMVisionOcr.analyzeImageQuality(imageUriOrBase64);
    }
    return null;
  }

  public async rectifyPerspective(imageUriOrBase64: string, quadPoints: number[]): Promise<any> {
    const { LMVisionOcr } = NativeModules;
    if (LMVisionOcr && typeof LMVisionOcr.rectifyPerspective === 'function') {
      return await LMVisionOcr.rectifyPerspective(imageUriOrBase64, quadPoints);
    }
    return null;
  }
}


let isBridgeInitialized = false;

/**
 * Initializes and registers the native OCR bridge with @lm-vision/perception.
 * Should be called at mobile application startup.
 */
export function initNativeOcrBridge(): boolean {
  if (isBridgeInitialized) return true;

  if (Platform.OS === 'android' && NativeModules.LMVisionOcr) {
    const bridge = new LMVisionNativeOCRBridge();
    registerNativeOCRBridge(bridge);
    isBridgeInitialized = true;
    console.log('[LMVisionNativeOCRBridge] Real on-device ML Kit OCR bridge registered successfully.');
    return true;
  }

  console.log('[LMVisionNativeOCRBridge] Native ML Kit module not active (development fallback active).');
  return false;
}

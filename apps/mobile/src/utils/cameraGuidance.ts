/**
 * Non-Blocking Advisory Camera Guidance (Phase B)
 *
 * Evaluates real-time or post-capture image quality indicators to give
 * inspectors helpful guidance tips.
 *
 * CRITICAL ARCHITECTURAL INVARIANT:
 * Camera guidance MUST REMAIN ADVISORY.
 * The inspector can ALWAYS capture the image regardless of lighting, glare, or blur.
 * Hard capture blocking or rejection is STRICTLY PROHIBITED in Phase B.
 */

export interface CameraGuidance {
  primaryTip: string;
  secondaryTips: string[];
  severity: 'INFO' | 'ADVISORY' | 'WARNING';
  /** Strictly false: capture is NEVER blocked */
  isCaptureBlocked: false;
}

export interface CameraQualityIndicators {
  sharpnessScore?: number | null;
  glareRatio?: number | null;
  glareDetected?: boolean;
  blurDetected?: boolean;
  exposureClassification?: 'NORMAL' | 'UNDEREXPOSED' | 'OVEREXPOSED';
  resolutionAdequate?: boolean;
}

/**
 * Computes non-blocking advisory tips based on empirical image indicators.
 */
export function evaluateCameraGuidance(
  indicators?: CameraQualityIndicators | null
): CameraGuidance {
  const secondaryTips: string[] = [];

  if (!indicators) {
    return {
      primaryTip: 'Align packaging label within camera frame',
      secondaryTips: [],
      severity: 'INFO',
      isCaptureBlocked: false,
    };
  }

  let primaryTip = 'Position package label clearly in view';
  let severity: 'INFO' | 'ADVISORY' | 'WARNING' = 'INFO';

  // 1. Check for blur
  if (indicators.blurDetected || (indicators.sharpnessScore != null && indicators.sharpnessScore < 40)) {
    primaryTip = 'Hold camera steady to capture sharp numbers and dates';
    severity = 'ADVISORY';
    secondaryTips.push('Avoid motion while tapping capture.');
  }

  // 2. Check for specular glare
  if (indicators.glareDetected || (indicators.glareRatio != null && indicators.glareRatio >= 0.03)) {
    if (severity === 'INFO') {
      primaryTip = 'Tilt camera slightly away from direct overhead light to avoid glare';
      severity = 'ADVISORY';
    } else {
      secondaryTips.push('Reflective glare detected on glossy surface; angle camera slightly.');
    }
  }

  // 3. Check exposure
  if (indicators.exposureClassification === 'UNDEREXPOSED') {
    if (severity === 'INFO') {
      primaryTip = 'Increase lighting or turn on flashlight for clearer text';
      severity = 'ADVISORY';
    } else {
      secondaryTips.push('Package is in low light.');
    }
  } else if (indicators.exposureClassification === 'OVEREXPOSED') {
    if (severity === 'INFO') {
      primaryTip = 'Direct hotspot detected; move package out of intense spotlight';
      severity = 'ADVISORY';
    } else {
      secondaryTips.push('Bright reflection may wash out text.');
    }
  }

  // 4. Check resolution / framing
  if (indicators.resolutionAdequate === false) {
    secondaryTips.push('Move closer to package for fine 4pt/6pt declaration print.');
  }

  return {
    primaryTip,
    secondaryTips,
    severity,
    isCaptureBlocked: false,
  };
}

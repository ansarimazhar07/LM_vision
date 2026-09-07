import type { VisualMeasurement } from '@lm-vision/shared-types';

/**
 * Mock CV Engine: Computes geometric metrics such as font height,
 * principal display panel area, and alignment coordinates.
 */
export function computeMockVisualMeasurements(): VisualMeasurement[] {
  return [
    {
      id: 'vm-font-height-net-qty',
      type: 'FONT_HEIGHT',
      value: 1.8,
      unit: 'mm',
      confidence: 0.85,
      targetRegionId: 'region-net-qty',
      targetSurface: 'FRONT',
      calibrationApplied: false,
      scaleFactorMmPerPixel: 0.045,
    },
    {
      id: 'vm-area-principal-display',
      type: 'PRINCIPAL_DISPLAY_PANEL_AREA',
      value: 12500,
      unit: 'mm',
      confidence: 0.92,
      targetRegionId: 'region-generic-name',
      targetSurface: 'FRONT',
      calibrationApplied: false,
    },
  ];
}

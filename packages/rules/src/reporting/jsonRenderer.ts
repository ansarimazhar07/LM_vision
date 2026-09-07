/**
 * Canonical JSON Report Renderer (Phase 9)
 *
 * Produces deterministic, validated machine-readable JSON representation
 * of an InspectionReport.
 */

import type { InspectionReport } from '@lm-vision/shared-types';

/**
 * Renders an InspectionReport to a formatted canonical JSON string
 */
export function renderReportToJson(report: InspectionReport, pretty = true): string {
  if (pretty) {
    return JSON.stringify(report, null, 2);
  }
  return JSON.stringify(report);
}

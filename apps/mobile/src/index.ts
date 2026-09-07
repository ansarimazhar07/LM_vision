import type { Inspection, InspectionStatus } from '@lm-vision/shared-types';
import { validatePayload, InspectionSchema } from '@lm-vision/validation';
import { STATUS_BADGE_MAP } from '@lm-vision/ui';

export { default as App } from './App';
export { getMobileConfig, isLocalOnlyMode, setLocalOnlyMode } from './config';
export { getRootRoute } from './navigation/guards';
export { createLocalInspectionDraft, LocalInspectionDraftSchema, CreateInspectionDraftInputSchema } from './state/draft';

export interface MobileAppShellState {
  currentInspection: Inspection | null;
  activeStatus: InspectionStatus;
  statusBadge: { label: string; color: string; bg: string };
}

/**
 * Validates and initializes an inspection session on the mobile client
 */
export function initializeMobileInspection(payload: unknown): MobileAppShellState {
  const validation = validatePayload(InspectionSchema, payload);
  if (!validation.success) {
    throw new Error(`Mobile inspection initialization failed: ${validation.errors[0]?.message}`);
  }

  const inspection = validation.data;
  return {
    currentInspection: inspection,
    activeStatus: inspection.status,
    statusBadge: STATUS_BADGE_MAP[inspection.findings[0]?.status ?? 'PASS'],
  };
}

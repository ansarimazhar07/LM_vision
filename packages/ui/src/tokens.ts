import type { FindingStatus, Severity, InspectionStatus } from '@lm-vision/shared-types';

export const COLOR_TOKENS = {
  ink: {
    950: '#0f172a',
    900: '#172033',
    700: '#334155',
    600: '#475569',
    500: '#64748b',
    300: '#cbd5e1',
    200: '#e2e8f0',
    100: '#f1f5f9',
    50: '#f8fafc',
  },
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
  },
  status: {
    pass: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    neutral: '#6b7280',
  },
  background: '#f5f7fb',
  surface: '#ffffff',
  border: '#dbe3ee',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const STATUS_BADGE_MAP: Record<FindingStatus, { label: string; color: string; bg: string }> = {
  PASS: { label: 'Compliant', color: '#065f46', bg: '#d1fae5' },
  WARNING: { label: 'Warning', color: '#92400e', bg: '#fef3c7' },
  SUSPECTED_NON_COMPLIANCE: { label: 'Suspected Violation', color: '#991b1b', bg: '#fee2e2' },
  MANUAL_REVIEW: { label: 'Manual Review Required', color: '#1e40af', bg: '#dbeafe' },
};

export const SEVERITY_BADGE_MAP: Record<Severity, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: 'Critical', color: '#7f1d1d', bg: '#fee2e2' },
  MAJOR: { label: 'Major', color: '#9a3412', bg: '#ffedd5' },
  MINOR: { label: 'Minor', color: '#854d0e', bg: '#fef9c3' },
  INFO: { label: 'Informational', color: '#1e3a8a', bg: '#eff6ff' },
};

export const INSPECTION_STATUS_MAP: Record<InspectionStatus, { label: string; progressPercent: number }> = {
  DRAFT: { label: 'Draft', progressPercent: 10 },
  CAPTURING: { label: 'Capturing Images', progressPercent: 20 },
  CAPTURED: { label: 'Images Captured', progressPercent: 30 },
  PROCESSING: { label: 'Processing Evidence', progressPercent: 50 },
  ANALYZING: { label: 'Analyzing Declarations', progressPercent: 60 },
  ANALYZED: { label: 'Analysis Complete', progressPercent: 70 },
  REVIEW_REQUIRED: { label: 'Review Required', progressPercent: 80 },
  NEEDS_VERIFICATION: { label: 'Needs Verification', progressPercent: 80 },
  READY_FOR_DECISION: { label: 'Ready for Decision', progressPercent: 85 },
  DECIDED: { label: 'Finalized', progressPercent: 90 },
  FINALIZED: { label: 'Finalized & Locked', progressPercent: 90 },
  REOPENED: { label: 'Reopened for Revision', progressPercent: 75 },
  SUPERSEDED: { label: 'Superseded by Reinspection', progressPercent: 100 },
  REPORT_GENERATED: { label: 'Report Generated', progressPercent: 95 },
  SYNCED: { label: 'Synchronized', progressPercent: 100 },
  ARCHIVED: { label: 'Archived', progressPercent: 100 },
};

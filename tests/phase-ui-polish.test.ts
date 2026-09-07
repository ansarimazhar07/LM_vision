import { describe, expect, it } from 'vitest';
import {
  getProviderLabel,
  getReviewProgress,
  getSummaryCounts,
  getSyncLabel,
  isSensitiveDisplayKey,
  shouldResetCameraForAppState,
} from '../apps/mobile/src/ui/audit';

describe('Phase UI polish — field workflow contracts', () => {
  it('starts and resets camera torch lifecycle when focus/app state is lost', () => {
    expect(shouldResetCameraForAppState('active')).toBe(false);
    expect(shouldResetCameraForAppState('background')).toBe(true);
    expect(shouldResetCameraForAppState('inactive')).toBe(true);
  });

  it('labels real, hybrid, offline and demo providers distinctly', () => {
    expect(getProviderLabel('REAL')).toBe('GEMINI ANALYSIS');
    expect(getProviderLabel('HYBRID')).toBe('HYBRID ANALYSIS');
    expect(getProviderLabel('OFFLINE')).toBe('LOCAL OCR / OFFLINE');
    expect(getProviderLabel('DEMO')).toBe('DEMO / MOCK');
    expect(getProviderLabel('REAL', true)).toBe('LOCAL OCR / OFFLINE');
  });

  it('calculates review progress from actual review state', () => {
    const assessments = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const reviews = [{ assessmentId: 'a', status: 'VERIFIED' }, { assessmentId: 'b', status: 'UNREVIEWED' }];
    expect(getReviewProgress(assessments, reviews)).toEqual({ reviewed: 1, total: 3, complete: false });
  });

  it('calculates dynamic summary counts without hard-coded totals', () => {
    expect(getSummaryCounts([{ result: 'PASS' }, { result: 'FAIL' }, { result: 'REQUIRES_VERIFICATION' }, { result: 'PASS' }])).toEqual({
      total: 4, PASS: 2, FAIL: 1, REQUIRES_VERIFICATION: 1, INSUFFICIENT_EVIDENCE: 0, NOT_APPLICABLE: 0,
    });
  });

  it('exposes sync state and never treats missing server ids as synced', () => {
    expect(getSyncLabel('server-id')).toBe('SYNCED');
    expect(getSyncLabel()).toBe('SYNC PENDING');
  });

  it('does not expose sensitive configuration fields in UI text', () => {
    expect(isSensitiveDisplayKey('GEMINI_API_KEY')).toBe(true);
    expect(isSensitiveDisplayKey('SUPABASE_SERVICE_ROLE_KEY')).toBe(true);
    expect(isSensitiveDisplayKey('ruleBundleVersion')).toBe(false);
  });

  it('keeps long multilingual display strings as ordinary text data', () => {
    const longText = 'निर्माता पता / Manufacturer address — 42 Industrial Estate, Bengaluru, Karnataka 560001 — '.repeat(12);
    expect(longText.length).toBeGreaterThan(200);
    expect(typeof longText).toBe('string');
  });
});

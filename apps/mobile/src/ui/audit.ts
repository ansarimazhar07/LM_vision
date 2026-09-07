export type UiAnalysisMode = 'REAL' | 'HYBRID' | 'OFFLINE' | 'DEMO';
export type UiAssessmentResult = 'PASS' | 'FAIL' | 'REQUIRES_VERIFICATION' | 'INSUFFICIENT_EVIDENCE' | 'NOT_APPLICABLE';

export function shouldResetCameraForAppState(state: string): boolean {
  return state !== 'active';
}

export function getProviderLabel(mode: UiAnalysisMode, fallback = false): string {
  if (fallback || mode === 'OFFLINE') return 'LOCAL OCR / OFFLINE';
  if (mode === 'REAL') return 'GEMINI ANALYSIS';
  if (mode === 'HYBRID') return 'HYBRID ANALYSIS';
  return 'DEMO / MOCK';
}

export function getReviewProgress<T extends { id: string }, R extends { assessmentId: string; status: string }>(assessments: T[], reviews: R[]): { reviewed: number; total: number; complete: boolean } {
  const reviewed = assessments.filter((assessment) => reviews.some((review) => review.assessmentId === assessment.id && review.status !== 'UNREVIEWED')).length;
  return { reviewed, total: assessments.length, complete: assessments.length > 0 && reviewed === assessments.length };
}

export function getSummaryCounts<T extends { result: UiAssessmentResult }>(assessments: T[]): Record<UiAssessmentResult | 'total', number> {
  const counts: Record<UiAssessmentResult | 'total', number> = { total: assessments.length, PASS: 0, FAIL: 0, REQUIRES_VERIFICATION: 0, INSUFFICIENT_EVIDENCE: 0, NOT_APPLICABLE: 0 };
  assessments.forEach((assessment) => { counts[assessment.result] += 1; });
  return counts;
}

export function getSyncLabel(serverId?: string, syncStatus?: string): string {
  if (syncStatus === 'SYNCED') return 'SYNCED';
  if (syncStatus === 'SYNC_CONFLICT') return 'SYNC CONFLICT';
  if (syncStatus === 'SYNC_FAILED') return 'SYNC FAILED';
  if (syncStatus === 'SYNCING') return 'SYNCING';
  if (syncStatus === 'PENDING_SYNC') return 'PENDING SYNC';
  return serverId ? 'SYNCED' : 'SYNC PENDING';
}

export function isSensitiveDisplayKey(key: string): boolean {
  return /(?:api[_-]?key|secret|service[_-]?role|access[_-]?token|password)/i.test(key);
}

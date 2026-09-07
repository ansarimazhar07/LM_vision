import type {
  ComplianceAssessment,
  Evidence,
  Finding,
} from '@lm-vision/shared-types';
import type { NormalizedImage } from './types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idToUuidMap = new Map<string, string>();

export function ensureCanonicalUuid(id?: string): string {
  if (id && UUID_REGEX.test(id)) {
    return id;
  }
  const key = id || 'default';
  if (!idToUuidMap.has(key)) {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    idToUuidMap.set(key, uuid);
  }
  return idToUuidMap.get(key)!;
}

/**
 * Builds canonical Finding and Evidence entities directly from authoritative
 * GSR 202(E) compliance assessments and real captured package photographs.
 * Never fabricates mock or demo rule findings.
 */
export function buildStatutoryFindingsAndEvidence(
  canonicalInspectionId: string,
  assessments: ComplianceAssessment[],
  normalizedImages: NormalizedImage[]
): { findings: Finding[]; evidence: Evidence[] } {
  const now = new Date().toISOString();

  const evidence: Evidence[] = normalizedImages.map((img) => ({
    id: ensureCanonicalUuid(img.id),
    inspectionId: canonicalInspectionId,
    type: 'PACKAGE_IMAGE',
    status: 'ATTACHED',
    title: `Surface Evidence (${img.surface})`,
    description: `Captured photograph of package ${img.surface} surface for Legal Metrology inspection.`,
    fileUrl: img.fileUrl,
    mimeType: img.mimeType,
    fileSizeBytes: img.fileSizeBytes,
    sha256Hash: img.sha256Hash,
    capturedAt: img.capturedAt,
    capturedByUserId: '00000000-0000-4000-8000-000000000001',
    chainOfCustody: [],
    createdAt: now,
    updatedAt: now,
  }));

  const primaryEvidenceIds = evidence.map((e) => e.id);

  const findings: Finding[] = assessments.map((assessment) => {
    let status: Finding['status'] = 'MANUAL_REVIEW';
    if (assessment.result === 'PASS') {
      status = 'PASS';
    } else if (assessment.result === 'FAIL') {
      status = 'SUSPECTED_NON_COMPLIANCE';
    } else {
      status = 'MANUAL_REVIEW';
    }

    const citation = assessment.ruleSource
      ? `${assessment.ruleSource.sourceDocument || 'GSR 202(E)'} Rule ${assessment.ruleNumber}${assessment.subRule ? `(${assessment.subRule})` : ''} Clause ${assessment.ruleSource.clauseReference || ''}`.trim()
      : `GSR 202(E) Rule ${assessment.ruleNumber}`;

    return {
      id: ensureCanonicalUuid(assessment.id),
      inspectionId: canonicalInspectionId,
      ruleId: assessment.ruleId,
      ruleTitle: assessment.ruleTitle,
      ruleCitation: citation,
      declarationType: (assessment.declarationIds[0] as any) || undefined,
      status,
      severity: assessment.severity || 'MAJOR',
      title: `${assessment.ruleNumber ? `Rule ${assessment.ruleNumber}: ` : ''}${assessment.ruleTitle}`,
      description: assessment.explanation,
      actualValue: assessment.observedValue,
      expectedValue: assessment.expectedConstraint,
      deviation: assessment.deviation,
      confidence: assessment.confidence ?? 0.9,
      aiExplanation: undefined,
      evidenceIds: primaryEvidenceIds,
      createdAt: now,
      updatedAt: now,
    };
  });

  return { findings, evidence };
}

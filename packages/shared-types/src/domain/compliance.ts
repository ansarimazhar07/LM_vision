import { z } from 'zod';
import {
  ComplianceResultSchema,
  EvidenceSufficiencySchema,
  RuleKindSchema,
  SeveritySchema,
} from '../enums/index.js';
import {
  ConfidenceScoreSchema,
  IsoTimestampSchema,
  UuidSchema,
} from './common.js';
import { LegalSourceMetadataSchema } from './rule.js';

/**
 * Canonical Compliance Assessment Entity (Phase 7)
 * 
 * Produced exclusively by the Deterministic Legal Metrology Rule Engine.
 * Represents an individual rule evaluation against extracted physical declarations,
 * measurements, and evidence.
 * 
 * ARCHITECTURAL INVARIANT:
 * Gemini is NEVER the legal authority. Gemini extracts observations.
 * The deterministic rule engine produces ComplianceAssessments.
 * The human inspector remains the final statutory decision authority.
 */
export const ComplianceAssessmentSchema = z.object({
  id: UuidSchema,
  inspectionId: UuidSchema,
  ruleId: z.string().min(1),
  ruleVersionId: z.string().min(1),
  ruleNumber: z.string().min(1),
  subRule: z.string().optional(),
  ruleTitle: z.string().min(1),
  ruleKind: RuleKindSchema.default('AUTHORITATIVE'),
  ruleSource: LegalSourceMetadataSchema,
  result: ComplianceResultSchema,
  evidenceSufficiency: EvidenceSufficiencySchema,
  severity: SeveritySchema.default('MAJOR'),
  explanation: z.string().min(1),
  observedValue: z.unknown().optional(),
  expectedConstraint: z.unknown().optional(),
  deviation: z.string().optional(),
  declarationIds: z.array(z.string()).default([]),
  evidenceIds: z.array(UuidSchema).default([]),
  confidence: ConfidenceScoreSchema,
  aiExplanation: z.string().optional(),
  engineVersion: z.string().min(1),
  ruleBundleId: z.string().min(1),
  evaluatedAt: IsoTimestampSchema,
  createdAt: IsoTimestampSchema,
});
export type ComplianceAssessment = z.infer<typeof ComplianceAssessmentSchema>;

/**
 * Summary Result of a Full Compliance Evaluation Run
 */
export const ComplianceEvaluationSummarySchema = z.object({
  inspectionId: UuidSchema,
  engineVersion: z.string().min(1),
  ruleBundleId: z.string().min(1),
  ruleCountEvaluated: z.number().int().nonnegative(),
  passCount: z.number().int().nonnegative(),
  failCount: z.number().int().nonnegative(),
  requiresVerificationCount: z.number().int().nonnegative(),
  notApplicableCount: z.number().int().nonnegative(),
  insufficientEvidenceCount: z.number().int().nonnegative(),
  assessments: z.array(ComplianceAssessmentSchema),
  overallStatus: ComplianceResultSchema,
  evaluatedAt: IsoTimestampSchema,
});
export type ComplianceEvaluationSummary = z.infer<typeof ComplianceEvaluationSummarySchema>;

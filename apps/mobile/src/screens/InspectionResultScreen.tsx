import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLOR_TOKENS } from '@lm-vision/ui';
import { computeAssessmentScore } from '@lm-vision/rules';
import type { ComplianceResult } from '@lm-vision/shared-types';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { ValidationModeBanner } from '../components/ValidationModeBanner';
import { isLocalOnlyMode } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'InspectionResult'>;

function getResultBadgeProps(result: ComplianceResult): { label: string; bg: string; color: string } {
  switch (result) {
    case 'PASS':
      return { label: 'PASS', bg: '#ecfdf5', color: '#047857' };
    case 'FAIL':
      return { label: 'FAIL', bg: '#fef2f2', color: '#b91c1c' };
    case 'REQUIRES_VERIFICATION':
      return { label: 'VERIFICATION REQ.', bg: '#fffbeb', color: '#b45309' };
    case 'NOT_APPLICABLE':
      return { label: 'NOT APPLICABLE', bg: '#f3f4f6', color: '#4b5563' };
    case 'INSUFFICIENT_EVIDENCE':
      return { label: 'INSUFFICIENT EVIDENCE', bg: '#f5f3ff', color: '#6d28d9' };
    default:
      return { label: result, bg: '#f3f4f6', color: '#374151' };
  }
}

export function InspectionResultScreen({ navigation }: Props): React.JSX.Element {
  const workflow = useInspectionWorkflow();
  const draft = workflow.activeDraft;
  const [showAllRules, setShowAllRules] = useState(false);

  const declarations = draft?.declarations || [];
  const evidence = draft?.evidence || [];
  const assessments = draft?.complianceAssessments || [];
  const summary = draft?.complianceSummary;
  const aiScore = draft?.aiAnalysis?.quality?.overallScore ?? 0.93;

  const scoreBreakdown = useMemo(() => {
    return computeAssessmentScore({
      assessments,
      packageAnalysis: draft?.aiAnalysis,
    });
  }, [assessments, draft?.aiAnalysis]);

  const isLocal = isLocalOnlyMode() || draft?.aiAnalysis?.provider === 'LOCAL_OCR';
  const isGemini = !isLocal && draft?.aiAnalysis?.provider === 'GEMINI';
  const providerLabel = isLocal
    ? 'LOCAL OCR / OFFLINE'
    : isGemini
    ? 'GEMINI 3.5 FLASH EXTRACTION'
    : 'DETERMINISTIC MOCK AI';
  const modelName = draft?.aiAnalysis?.modelName || (isLocal ? 'ondevice-ocr-cv-v1' : 'gemini-3.5-flash');

  const overallStatus = summary?.overallStatus || (assessments.some((a) => a.result === 'FAIL') ? 'FAIL' : 'PASS');
  const overallBadge = getResultBadgeProps(overallStatus);

  const displayedAssessments = showAllRules ? assessments : assessments.slice(0, 4);

  return (
    <Screen title="Inspection Summary">
      <View style={styles.scrollContent}>
        <ValidationModeBanner />
        {/* Product & Lifecycle Header */}
        <Surface style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.providerBadgeRow}>
                <Badge
                  label={providerLabel}
                  bg={isGemini ? '#eff6ff' : '#f0fdf4'}
                  color={isGemini ? '#1d4ed8' : '#047857'}
                  size="sm"
                />
              </View>
              <Text style={styles.productTitle}>
                {draft?.productName || 'Inspected Commodity'}
              </Text>
              <Text style={styles.metaText}>
                {draft?.category} · {draft?.packageType} · Extraction: {modelName}
              </Text>
            </View>
            <Badge label="Review Required" bg="#dbeafe" color="#1e40af" />
          </View>
          <View style={styles.divider} />
          <ConfidenceBar score={aiScore} label="Observational Extraction Confidence" />
        </Surface>

        {/* Prominent Offline / Zero-Declaration Action Banner */}
        {declarations.length === 0 && (
          <Surface style={styles.offlineActionCard}>
            <View style={styles.offlineActionHeader}>
              <Text style={styles.offlineActionIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.offlineActionTitle}>
                  {isLocal ? 'On-Device Verification Required' : 'No Declarations Extracted from Image'}
                </Text>
                <Text style={styles.offlineActionText}>
                  {isLocal
                    ? 'Running in on-device mode (Expo Go sandbox). Camera evidence is saved locally. Tap below to verify or enter packaging declarations from the physical item to run statutory GSR 202(E) rules offline.'
                    : 'AI vision did not detect clear declarations from the captured photograph. Tap below to verify package declarations.'}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <Button
                label="✍️ Verify / Enter Package Declarations"
                onPress={() => navigation.navigate('Declarations')}
              />
            </View>
          </Surface>
        )}

        {/* LM-Vision Assessment Score (Non-Statutory Operational Guidance) */}
        <Surface style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.scoreEyebrow}>NON-STATUTORY OPERATIONAL SUMMARY</Text>
              <Text style={styles.scoreTitle}>LM-Vision Assessment Score</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreNumber}>{scoreBreakdown.overallScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>

          <View style={styles.scoreBreakdownGrid}>
            <View style={styles.scoreSubItem}>
              <Text style={styles.scoreSubLabel}>Mandatory Rules</Text>
              <Text style={styles.scoreSubVal}>{scoreBreakdown.mandatoryDeclarationsScore}%</Text>
            </View>
            <View style={styles.scoreSubItem}>
              <Text style={styles.scoreSubLabel}>MRP Compliance</Text>
              <Text style={styles.scoreSubVal}>{scoreBreakdown.mrpComplianceScore}%</Text>
            </View>
            <View style={styles.scoreSubItem}>
              <Text style={styles.scoreSubLabel}>Net Quantity</Text>
              <Text style={styles.scoreSubVal}>{scoreBreakdown.netQuantityComplianceScore}%</Text>
            </View>
            <View style={styles.scoreSubItem}>
              <Text style={styles.scoreSubLabel}>Evidence Quality</Text>
              <Text style={styles.scoreSubVal}>{scoreBreakdown.evidenceSufficiencyScore}%</Text>
            </View>
          </View>

          <Text style={styles.scoreDisclaimer}>{scoreBreakdown.disclaimer}</Text>
        </Surface>

        {/* SECTION 1: DETERMINISTIC LEGAL METROLOGY COMPLIANCE ENGINE */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Rule Engine Assessment (GSR 202(E))</Text>
          <Badge label={overallBadge.label} bg={overallBadge.bg} color={overallBadge.color} size="sm" />
        </View>

        <Surface style={styles.complianceCard}>
          <View style={styles.bundleHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bundleTitle}>The Legal Metrology (Packaged Commodities) Rules, 2011</Text>
              <Text style={styles.bundleSub}>
                Statutory Source: G.S.R. 202(E) · Software Bundle: {summary?.ruleBundleId || 'LM-IN-RULES-2026.09'}
              </Text>
            </View>
          </View>

          {/* Aggregated Rule Outcome Counters */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricBox, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}>
              <Text style={[styles.metricCount, { color: '#15803d' }]}>{summary?.passCount ?? assessments.filter((a) => a.result === 'PASS').length}</Text>
              <Text style={styles.metricLabel}>Pass</Text>
            </View>
            <View style={[styles.metricBox, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}>
              <Text style={[styles.metricCount, { color: '#b91c1c' }]}>{summary?.failCount ?? assessments.filter((a) => a.result === 'FAIL').length}</Text>
              <Text style={styles.metricLabel}>Fail</Text>
            </View>
            <View style={[styles.metricBox, { borderColor: '#fde68a', backgroundColor: '#fffbeb' }]}>
              <Text style={[styles.metricCount, { color: '#b45309' }]}>
                {summary?.requiresVerificationCount ?? assessments.filter((a) => a.result === 'REQUIRES_VERIFICATION').length}
              </Text>
              <Text style={styles.metricLabel}>Verify</Text>
            </View>
            <View style={[styles.metricBox, { borderColor: '#ddd6fe', backgroundColor: '#f5f3ff' }]}>
              <Text style={[styles.metricCount, { color: '#6d28d9' }]}>
                {summary?.insufficientEvidenceCount ?? assessments.filter((a) => a.result === 'INSUFFICIENT_EVIDENCE').length}
              </Text>
              <Text style={styles.metricLabel}>No Evidence</Text>
            </View>
          </View>

          {/* Rule Assessments List */}
          <View style={styles.rulesList}>
            {displayedAssessments.map((item) => {
              const badge = getResultBadgeProps(item.result);
              return (
                <View key={item.id} style={styles.ruleItem}>
                  <View style={styles.ruleItemHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.ruleItemNumber}>
                        Rule {item.ruleNumber} {item.subRule ? `(${item.subRule})` : ''}
                      </Text>
                      <Text style={styles.ruleItemTitle}>{item.ruleTitle}</Text>
                      <Text style={styles.ruleCitation}>
                        GSR 202(E) Page {item.ruleSource.sourcePage} · Clause: {item.ruleSource.clauseReference}
                      </Text>
                    </View>
                    <Badge label={badge.label} bg={badge.bg} color={badge.color} size="sm" />
                  </View>
                  <Text style={styles.ruleExplanation}>{item.explanation}</Text>
                  {item.deviation ? (
                    <Text style={styles.ruleDeviation}>Deviation: {item.deviation}</Text>
                  ) : null}
                  <View style={styles.evidenceSufficiencyRow}>
                    <Text style={styles.evidenceSufficiencyText}>
                      Evidence: {item.evidenceSufficiency} · Engine: v{item.engineVersion}
                    </Text>
                    <Pressable
                      onPress={() =>
                        navigation.navigate('LegalRuleDetail', {
                          ruleId: item.ruleId || item.ruleNumber,
                        })
                      }
                      style={styles.ruleItemLink}
                    >
                      <Text style={styles.ruleItemLinkText}>View Statutory Rule GSR 202(E) →</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          {assessments.length > 4 && (
            <Pressable
              style={styles.expandButton}
              onPress={() => setShowAllRules((prev) => !prev)}
            >
              <Text style={styles.expandButtonText}>
                {showAllRules ? 'Show Fewer Rules ▲' : `View All ${assessments.length} Evaluated Rules (${assessments.length - 4} more) ▼`}
              </Text>
            </Pressable>
          )}
        </Surface>

        {/* SECTION 2: OBSERVATIONAL EXTRACTIONS */}
        <Text style={styles.sectionHeading}>
          {isLocal ? 'Local Observation (On-Device OCR)' : 'Observational Extractions'}
        </Text>

        {declarations.length === 0 && (
          <Surface style={styles.zeroDeclCard}>
            <Text style={styles.zeroDeclTitle}>Physical Verification Required</Text>
            <Text style={styles.zeroDeclText}>
              0 declarations were auto-detected from camera pixels. Under GSR 202(E), you can record physical package values to evaluate statutory compliance.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Declarations')}
              style={styles.zeroDeclActionBtn}
            >
              <Text style={styles.zeroDeclActionText}>Verify / Enter Physical Declarations →</Text>
            </Pressable>
          </Surface>
        )}

        {/* Declarations Card */}
        <Surface style={styles.navCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Declarations')}
            style={styles.cardPressable}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Mandatory Physical Declarations</Text>
                <Text style={styles.cardDesc}>
                  Net quantity, MRP, manufacturer, consumer care, date
                </Text>
              </View>
              <Badge
                label={declarations.length > 0 ? `${declarations.length} extracted` : '0 extracted (Verify)'}
                bg={declarations.length > 0 ? '#d1fae5' : '#fffbeb'}
                color={declarations.length > 0 ? '#065f46' : '#b45309'}
                size="sm"
              />
            </View>
            <View style={styles.linkRow}>
              <Text style={styles.linkText}>
                {declarations.length > 0 ? 'View Extracted Declarations →' : 'Enter / Verify Declarations →'}
              </Text>
            </View>
          </Pressable>
        </Surface>

        {/* Evidence Card */}
        <Surface style={styles.navCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Evidence')}
            style={styles.cardPressable}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Attached Evidence & Packaging Media</Text>
                <Text style={styles.cardDesc}>
                  Photographs with SHA-256 integrity and chain of custody
                </Text>
              </View>
              <Badge label={`${evidence.length} attached`} bg="#f3f4f6" color="#374151" size="sm" />
            </View>
            <View style={styles.linkRow}>
              <Text style={styles.linkText}>Manage Evidence Media →</Text>
            </View>
          </Pressable>
        </Surface>

        {/* Visual Evidence Heatmap Card */}
        <Surface style={styles.navCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('EvidenceViewer')}
            style={styles.cardPressable}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Visual Evidence Heatmap</Text>
                <Text style={styles.cardDesc}>
                  Interactive declaration bounding overlays, pan & zoom, and specular glare reduction
                </Text>
              </View>
              <Badge label="HEATMAP READY" bg="#eff6ff" color="#1d4ed8" size="sm" />
            </View>
            <View style={styles.linkRow}>
              <Text style={[styles.linkText, { color: '#2563eb', fontWeight: '700' }]}>
                Open Visual Evidence Heatmap →
              </Text>
            </View>
          </Pressable>
        </Surface>

        {/* SECTION 3: STATUTORY LEGAL GATE */}
        <Surface style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Statutory Legal Gate Invariant</Text>
          <Text style={styles.noticeText}>
            {isLocal
              ? 'On-device OCR extracts observational facts from package photographs without cloud AI. Compliance is evaluated deterministically against GSR 202(E) 2011 rules. The authenticated human inspector retains sole statutory authority to issue official decisions.'
              : 'Gemini Multimodal Vision extracts observational facts from package photographs. Compliance is evaluated deterministically against GSR 202(E) 2011 rules. The authenticated human inspector retains sole statutory authority to issue official decisions.'}
          </Text>
        </Surface>

        {/* Primary CTA */}
        <View style={styles.ctaContainer}>
          <Button
            label="Start Human-in-the-Loop Review →"
            onPress={() => navigation.navigate('InspectorReview')}
          />
          <Button
            label="Review Summary & Finalize"
            variant="secondary"
            onPress={() => navigation.navigate('ReviewSummary')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  headerCard: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerBadgeRow: {
    marginBottom: 6,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    flexShrink: 1,
    lineHeight: 23,
  },
  metaText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    flexShrink: 1,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
    lineHeight: 18,
  },
  complianceCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bundleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
    lineHeight: 20,
  },
  bundleSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    flexShrink: 1,
    lineHeight: 17,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 2,
  },
  rulesList: {
    gap: 10,
  },
  ruleItem: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  ruleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  ruleItemNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e40af',
  },
  ruleItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 1,
    flexShrink: 1,
    lineHeight: 18,
  },
  ruleCitation: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    flexShrink: 1,
    lineHeight: 16,
  },
  ruleExplanation: {
    fontSize: 12,
    color: '#374151',
    marginTop: 6,
    lineHeight: 16,
  },
  ruleDeviation: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
    marginTop: 4,
  },
  evidenceSufficiencyRow: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 4,
  },
  evidenceSufficiencyText: {
    fontSize: 10,
    color: '#9ca3af',
  },
  expandButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  navCard: {
    padding: 0,
    overflow: 'hidden',
  },
  cardPressable: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  linkRow: {
    marginTop: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR_TOKENS.primary[700],
  },
  noticeCard: {
    padding: 14,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 2,
  },
  noticeText: {
    fontSize: 12,
    color: '#1e3a8a',
    lineHeight: 16,
  },
  ctaContainer: {
    marginTop: 6,
  },
  zeroDeclCard: {
    padding: 16,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 8,
  },
  zeroDeclTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 4,
  },
  zeroDeclText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
    marginBottom: 10,
  },
  zeroDeclActionBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  zeroDeclActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  offlineActionCard: {
    padding: 16,
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1.5,
    borderRadius: 8,
    marginBottom: 12,
  },
  offlineActionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  offlineActionIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  offlineActionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 4,
  },
  offlineActionText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 18,
  },
  scoreCard: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    marginBottom: 14,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  scoreTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  scoreMax: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginLeft: 2,
  },
  scoreBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  scoreSubItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
  },
  scoreSubLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  scoreSubVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  scoreDisclaimer: {
    fontSize: 10,
    color: '#94a3b8',
    fontStyle: 'italic',
    lineHeight: 14,
  },
  ruleItemLink: {
    marginTop: 6,
    paddingTop: 4,
  },
  ruleItemLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
});

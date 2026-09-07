import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getAllAuthoritativeRules } from '@lm-vision/rules';
import type { Rule } from '@lm-vision/shared-types';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ValidationModeBanner } from '../components/ValidationModeBanner';

type Props = NativeStackScreenProps<RootStackParamList, 'LegalRuleDetail'>;

export function LegalRuleDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const { ruleId } = route.params;

  const rule: Rule | undefined = useMemo(() => {
    const rules = getAllAuthoritativeRules();
    // Match by exact ruleId or ruleNumber (e.g. "6(1)(a)" or "GSR-202E-RULE-06-01-A")
    return (
      rules.find((r) => r.ruleId === ruleId) ||
      rules.find((r) => r.ruleNumber.toLowerCase() === ruleId.toLowerCase()) ||
      rules.find((r) => r.ruleNumber.replace(/\s+/g, '').toLowerCase() === ruleId.replace(/\s+/g, '').toLowerCase())
    );
  }, [ruleId]);

  if (!rule) {
    return (
      <Screen title="Rule Detail">
        <Surface style={styles.errorCard}>
          <Text style={styles.errorTitle}>Statutory Rule Not Found</Text>
          <Text style={styles.errorBody}>
            The requested rule reference &quot;{ruleId}&quot; is not in the authoritative GSR 202(E) 2011 bundle.
          </Text>
          <Button label="Back to Rule Library" onPress={() => navigation.goBack()} />
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen title={`Rule ${rule.ruleNumber}`}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ValidationModeBanner />

        {/* Header Summary */}
        <Surface style={styles.headerCard}>
          <View style={styles.badgeRow}>
            <Badge label={`RULE ${rule.ruleNumber}`} bg="#dbeafe" color="#1e40af" />
            <Badge label="AUTHORITATIVE" bg="#dcfce7" color="#166534" size="sm" />
            <Badge severity={rule.severity} />
          </View>
          <Text style={styles.ruleTitle}>{rule.title}</Text>
          <Text style={styles.ruleSubTitle}>
            Clause: {rule.sourceMetadata?.clauseReference || `Rule ${rule.ruleNumber}`} · Version {rule.version}
          </Text>
        </Surface>

        {/* Section 1: Official Statutory Text */}
        <Surface style={styles.statutoryCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.statutoryIcon}>📜</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.statutoryEyebrow}>PRIMARY LEGISLATION SOURCE</Text>
              <Text style={styles.statutoryHeading}>Official Statutory Text</Text>
            </View>
            <Badge label="VERIFIED SOURCE" bg="#ecfdf5" color="#047857" size="sm" />
          </View>
          <View style={styles.statutoryQuoteBox}>
            <Text style={styles.statutoryText}>&ldquo;{rule.description}&rdquo;</Text>
          </View>
          <Text style={styles.statutoryCitationNotice}>
            Statutory Citation: The Legal Metrology (Packaged Commodities) Rules, 2011 · Gazette Notification G.S.R. 202(E), Page {rule.sourceMetadata?.sourcePage || 5}
          </Text>
        </Surface>

        {/* Section 2: Statutory Provenance & Gazette Metadata */}
        <Surface style={styles.card}>
          <Text style={styles.sectionHeading}>Gazette Provenance & Metadata</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Statutory Document:</Text>
              <Text style={styles.metaVal}>{rule.sourceMetadata?.sourceDocument || 'Legal Metrology (Packaged Commodities) Rules, 2011'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Gazette Notification:</Text>
              <Text style={styles.metaVal}>{rule.sourceMetadata?.gazetteNotificationNumber || 'GSR 202 (E)'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Promulgation Date:</Text>
              <Text style={styles.metaVal}>7th March, 2011</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Effective Date:</Text>
              <Text style={styles.metaVal}>1st April, 2011</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Official PDF Page:</Text>
              <Text style={styles.metaVal}>Page {rule.sourceMetadata?.sourcePage || 'N/A'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Applies To:</Text>
              <Text style={styles.metaVal}>
                {rule.applicability?.appliesToDomestic ? 'Domestic' : ''}
                {rule.applicability?.appliesToDomestic && rule.applicability?.appliesToImported ? ' & ' : ''}
                {rule.applicability?.appliesToImported ? 'Imported Packages' : ''}
              </Text>
            </View>
          </View>
        </Surface>

        {/* Section 3: Regulatory Requirement & Exceptions */}
        <Surface style={styles.card}>
          <Text style={styles.sectionHeading}>Regulatory Requirement</Text>
          <Text style={styles.reqText}>{rule.requirement}</Text>

          {rule.exceptions && rule.exceptions.length > 0 && (
            <View style={styles.exceptionsBox}>
              <Text style={styles.exceptionsTitle}>Statutory Provisos & Exceptions:</Text>
              {rule.exceptions.map((ex, idx) => (
                <Text key={idx} style={styles.exceptionItem}>
                  • {ex}
                </Text>
              ))}
            </View>
          )}
        </Surface>

        {/* Section 4: LM-Vision Implementation Note (Clearly demarcated from law) */}
        <Surface style={styles.implCard}>
          <View style={styles.implHeader}>
            <Text style={styles.implEyebrow}>SOFTWARE SYSTEM SPECIFICATION</Text>
            <Text style={styles.implTitle}>LM-Vision Rule Engine Implementation</Text>
          </View>
          <Text style={styles.implDisclaimer}>
            The technical specification below details how the deterministic rule engine verifies
            observational declarations. This specification does NOT alter the statutory text.
          </Text>

          <View style={styles.implGrid}>
            <View style={styles.implRow}>
              <Text style={styles.implLabel}>Internal Rule ID:</Text>
              <Text style={styles.implValMono}>{rule.ruleId}</Text>
            </View>
            <View style={styles.implRow}>
              <Text style={styles.implLabel}>Validation Logic:</Text>
              <Text style={styles.implVal}>{rule.validationType}</Text>
            </View>
            <View style={styles.implRow}>
              <Text style={styles.implLabel}>Human Verification:</Text>
              <Text style={styles.implVal}>
                {rule.humanVerificationRequired ? 'Mandatory Inspector Confirmation' : 'Automated Condition Check'}
              </Text>
            </View>
            <View style={styles.implRow}>
              <Text style={styles.implLabel}>Authority Gate:</Text>
              <Text style={styles.implVal}>Sole Statutory Inspector Authority</Text>
            </View>
          </View>
        </Surface>

        {/* Actions */}
        <View style={styles.actionRow}>
          <Button label="← Back" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  headerCard: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  ruleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 24,
  },
  ruleSubTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  statutoryCard: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#fffdf5',
    borderColor: '#fef3c7',
    borderWidth: 1.5,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statutoryIcon: {
    fontSize: 22,
  },
  statutoryEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  statutoryHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78350f',
  },
  statutoryQuoteBox: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
    marginVertical: 8,
  },
  statutoryText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1f2937',
    fontStyle: 'italic',
  },
  statutoryCitationNotice: {
    fontSize: 11,
    color: '#92400e',
    marginTop: 6,
    lineHeight: 16,
  },
  card: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  metaGrid: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    width: 140,
  },
  metaVal: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  reqText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  exceptionsBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  exceptionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  exceptionItem: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 4,
  },
  implCard: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    marginBottom: 16,
  },
  implHeader: {
    marginBottom: 6,
  },
  implEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  implTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  implDisclaimer: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 12,
  },
  implGrid: {
    gap: 6,
  },
  implRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  implLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  implVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  implValMono: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#047857',
  },
  actionRow: {
    marginTop: 4,
  },
  errorCard: {
    padding: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#b91c1c',
    marginBottom: 6,
  },
  errorBody: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
});

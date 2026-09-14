import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ValidationModeBanner } from '../components/ValidationModeBanner';
import {
  comparePackages,
  type PackageComparisonSubject,
  type PackageComparisonResult,
} from '@lm-vision/perception';

type Props = NativeStackScreenProps<RootStackParamList, 'PackageComparison'>;

export function PackageComparisonScreen({ navigation }: Props): React.JSX.Element {
  const workflow = useInspectionWorkflow();
  const activeDraft = workflow.activeDraft;
  const history = workflow.completedInspections || [];

  // Comparison Subject A: Current active draft
  const subjectA: PackageComparisonSubject = useMemo(() => {
    return {
      inspectionId: activeDraft?.localId || 'draft-current',
      productName: activeDraft?.productName || 'Atta Premium Whole Wheat',
      brandName: activeDraft?.brandName || 'Golden Mills',
      category: activeDraft?.category || 'FOOD_GRAINS',
      packageType: activeDraft?.packageType || 'POUCH',
      batchNumber: activeDraft?.batchNumber || 'BATCH-2026-A',
      declarations: activeDraft?.declarations || [],
      assessments: activeDraft?.complianceAssessments || [],
      fusedPackage: (activeDraft?.aiAnalysis as any)?.rawResponse?.phaseD,
    };
  }, [activeDraft]);

  // Comparison Subject B: Selectable from history or reference batch
  const [selectedBIndex, setSelectedBIndex] = useState(0);

  const candidateSubjectsB: PackageComparisonSubject[] = useMemo(() => {
    const fromHistory: PackageComparisonSubject[] = history
      .filter((h) => h.localId !== activeDraft?.localId)
      .map((h) => ({
        inspectionId: h.localId,
        productName: h.productName || 'Reference Package',
        brandName: (h as any).brandName || 'Brand Ref',
        category: h.category || 'FOOD_GRAINS',
        packageType: h.packageType || 'POUCH',
        batchNumber: (h as any).batchNumber || 'BATCH-PREV',
        declarations: h.declarations || [],
        assessments: h.complianceAssessments || [],
        fusedPackage: (h.aiAnalysis as any)?.rawResponse?.phaseD,
      }));

    // Add reference demo fixtures if history is sparse
    const referenceFixtures: PackageComparisonSubject[] = [
      {
        inspectionId: 'ref-fixture-b1',
        productName: activeDraft?.productName || 'Atta Premium Whole Wheat',
        brandName: activeDraft?.brandName || 'Golden Mills',
        category: activeDraft?.category || 'FOOD_GRAINS',
        packageType: 'POUCH',
        batchNumber: 'BATCH-2026-REF-01',
        declarations: [
          {
            type: 'MRP',
            rawText: 'MRP Rs. 275.00 (incl. of all taxes)',
            normalizedValue: 275,
            unit: 'INR',
            confidence: 0.98,
            detectedLanguage: 'en',
            region: {
              id: 'r1',
              imageId: 'img-ref-1',
              surface: 'BACK',
              boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.2, unit: 'NORMALIZED' as const },
              text: 'MRP Rs. 275.00',
              confidence: 0.98,
            },
          },
          {
            type: 'NET_QUANTITY',
            rawText: '5 kg',
            normalizedValue: 5000,
            unit: 'g',
            confidence: 0.99,
            detectedLanguage: 'en',
            region: {
              id: 'r2',
              imageId: 'img-ref-1',
              surface: 'FRONT',
              boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.4, yMax: 0.4, unit: 'NORMALIZED' as const },
              text: '5 kg',
              confidence: 0.99,
            },
          },
          {
            type: 'MANUFACTURER_NAME_ADDRESS',
            rawText: 'Golden Mills Packaging Ltd, Plot 12, Industrial Area, Noida UP 201301',
            confidence: 0.95,
            detectedLanguage: 'en',
            region: {
              id: 'r3',
              imageId: 'img-ref-1',
              surface: 'BACK',
              boundingBox: { xMin: 0.1, yMin: 0.5, xMax: 0.9, yMax: 0.6, unit: 'NORMALIZED' as const },
              text: 'Golden Mills Packaging Ltd',
              confidence: 0.95,
            },
          },
          {
            type: 'DATE_OF_PACKAGING',
            rawText: 'PKD 02/2026',
            confidence: 0.92,
            detectedLanguage: 'en',
            region: {
              id: 'r4',
              imageId: 'img-ref-1',
              surface: 'BACK',
              boundingBox: { xMin: 0.1, yMin: 0.7, xMax: 0.4, yMax: 0.8, unit: 'NORMALIZED' as const },
              text: 'PKD 02/2026',
              confidence: 0.92,
            },
          },
        ],
      },
      {
        inspectionId: 'ref-fixture-unrelated',
        productName: 'Herbal Anti-Dandruff Shampoo 200ml',
        brandName: 'Velvet Herbal Care',
        category: 'COSMETICS',
        packageType: 'BOTTLE',
        declarations: [
          {
            type: 'MRP',
            rawText: 'MRP Rs. 185.00',
            normalizedValue: 185,
            confidence: 0.95,
            detectedLanguage: 'en',
            region: {
              id: 'ru1',
              imageId: 'img-ref-2',
              surface: 'BACK',
              boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.2, unit: 'NORMALIZED' as const },
              text: 'MRP Rs. 185.00',
              confidence: 0.95,
            },
          },
        ],
      },
    ];

    return [...fromHistory, ...referenceFixtures];
  }, [history, activeDraft]);

  const subjectB: PackageComparisonSubject = candidateSubjectsB[selectedBIndex] ?? candidateSubjectsB[0]!;

  const comparisonResult: PackageComparisonResult = useMemo(() => {
    if (!subjectA || !subjectB) {
      return {
        comparability: 'NOT_COMPARABLE',
        comparabilityRationale: 'Insufficient data to perform comparison.',
        packageA: { id: '', name: '', brand: '' },
        packageB: { id: '', name: '', brand: '' },
        differences: [],
        summary: '',
        disclaimer: '',
      };
    }
    return comparePackages(subjectA, subjectB);
  }, [subjectA, subjectB]);

  const comparabilityBadge = useMemo(() => {
    switch (comparisonResult.comparability) {
      case 'COMPARABLE':
        return { label: 'COMPARABLE', bg: '#ecfdf5', color: '#047857' };
      case 'PARTIALLY_COMPARABLE':
        return { label: 'PARTIALLY COMPARABLE', bg: '#fffbeb', color: '#b45309' };
      case 'NOT_COMPARABLE':
        return { label: 'NOT COMPARABLE', bg: '#fef2f2', color: '#b91c1c' };
    }
  }, [comparisonResult.comparability]);

  return (
    <Screen title="Package Comparison">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ValidationModeBanner />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>PACKAGE-TO-PACKAGE COMPARISON</Text>
          <Text style={styles.title}>Observational Cross-Package Analysis</Text>
          <Text style={styles.subtitle}>
            Compare structured declarations and evidence between physical packages or production batches.
          </Text>
        </View>

        {/* Comparability Banner */}
        <Surface style={styles.comparabilityCard}>
          <View style={styles.comparabilityHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.comparabilityHeading}>Comparability Validation</Text>
              <Text style={styles.comparabilitySub}>{comparisonResult.comparabilityRationale}</Text>
            </View>
            <Badge
              label={comparabilityBadge.label}
              bg={comparabilityBadge.bg}
              color={comparabilityBadge.color}
            />
          </View>
        </Surface>

        {/* Comparison Selector Strip */}
        <Surface style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Select Comparison Target (Package B):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
            {candidateSubjectsB.map((cand, idx) => {
              const isSelected = idx === selectedBIndex;
              return (
                <Pressable
                  key={cand.inspectionId}
                  onPress={() => setSelectedBIndex(idx)}
                  style={[styles.selectorChip, isSelected && styles.selectorChipActive]}
                >
                  <Text style={[styles.selectorChipText, isSelected && styles.selectorChipTextActive]}>
                    {cand.productName || cand.brandName} ({cand.batchNumber || 'Batch'})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Surface>

        {/* Side-by-Side Subject Overview */}
        <View style={styles.sideBySideContainer}>
          <Surface style={[styles.packageCard, { flex: 1, marginRight: 6 }]}>
            <View style={styles.packageCardHeader}>
              <Badge label="PACKAGE A (Current)" bg="#eff6ff" color="#1d4ed8" size="sm" />
            </View>
            <Text style={styles.packName}>{subjectA.productName}</Text>
            <Text style={styles.packSub}>{subjectA.brandName} · {subjectA.batchNumber}</Text>
          </Surface>

          <Surface style={[styles.packageCard, { flex: 1, marginLeft: 6 }]}>
            <View style={styles.packageCardHeader}>
              <Badge label="PACKAGE B (Reference)" bg="#f5f3ff" color="#6d28d9" size="sm" />
            </View>
            <Text style={styles.packName}>{subjectB.productName}</Text>
            <Text style={styles.packSub}>{subjectB.brandName} · {subjectB.batchNumber}</Text>
          </Surface>
        </View>

        {/* MRP Comparison Card */}
        {comparisonResult.mrpComparison && (
          <Surface style={styles.metricCard}>
            <Text style={styles.metricTitle}>Maximum Retail Price (MRP) Comparison</Text>
            <View style={styles.mrpRow}>
              <View style={styles.mrpCol}>
                <Text style={styles.mrpLabel}>Package A MRP</Text>
                <Text style={styles.mrpVal}>
                  {comparisonResult.mrpComparison.valueA !== null ? `₹${comparisonResult.mrpComparison.valueA.toFixed(2)}` : 'N/A'}
                </Text>
              </View>
              <View style={styles.mrpDivider} />
              <View style={styles.mrpCol}>
                <Text style={styles.mrpLabel}>Package B MRP</Text>
                <Text style={styles.mrpVal}>
                  {comparisonResult.mrpComparison.valueB !== null ? `₹${comparisonResult.mrpComparison.valueB.toFixed(2)}` : 'N/A'}
                </Text>
              </View>
            </View>
            <Text style={styles.mrpDesc}>{comparisonResult.mrpComparison.description}</Text>
          </Surface>
        )}

        {/* Net Quantity Comparison Card */}
        {comparisonResult.quantityComparison && (
          <Surface style={styles.metricCard}>
            <Text style={styles.metricTitle}>Net Quantity Comparison</Text>
            <Text style={styles.metricDesc}>{comparisonResult.quantityComparison.description}</Text>
          </Surface>
        )}

        {/* Field-by-Field Differences Table */}
        <Surface style={styles.tableCard}>
          <Text style={styles.tableTitle}>Declarations Comparison Table</Text>
          {comparisonResult.differences.map((diff, idx) => (
            <View key={idx} style={[styles.tableRow, idx > 0 && styles.tableRowBorder]}>
              <View style={styles.tableFieldHeader}>
                <Text style={styles.tableFieldName}>{diff.fieldName}</Text>
                <Badge
                  label={diff.hasDifference ? 'DIFFERENCE OBSERVED' : 'IDENTICAL'}
                  bg={diff.hasDifference ? '#fff7ed' : '#ecfdf5'}
                  color={diff.hasDifference ? '#c2410c' : '#047857'}
                  size="sm"
                />
              </View>

              <View style={styles.tableValuesRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.valSubLabel}>Package A:</Text>
                  <Text style={styles.valText}>{String(diff.valueA)}</Text>
                </View>
                <View style={{ flex: 1, paddingLeft: 8 }}>
                  <Text style={styles.valSubLabel}>Package B:</Text>
                  <Text style={styles.valText}>{String(diff.valueB)}</Text>
                </View>
              </View>

              <Text style={styles.diffDescription}>{diff.differenceDescription}</Text>
            </View>
          ))}
        </Surface>

        {/* Statutory Integrity Guardrail Notice */}
        <Surface style={styles.guardrailCard}>
          <Text style={styles.guardrailTitle}>Statutory Integrity Guardrail</Text>
          <Text style={styles.guardrailText}>
            Differences between packages are observational and informational. A difference in price,
            packaging format, or quantity between batches or variants does NOT constitute an automatic
            statutory violation. Statutory non-compliance is determined exclusively by the Rule Engine
            evaluating applicable Legal Metrology rules.
          </Text>
        </Surface>

        <View style={styles.actionRow}>
          <Button label="← Back to Inspection" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    marginBottom: 12,
  },
  eyebrow: {
    color: '#4338ca',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  comparabilityCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  comparabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparabilityHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  comparabilitySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  selectorCard: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  selectorScroll: {
    flexDirection: 'row',
  },
  selectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  selectorChipActive: {
    backgroundColor: '#6366f1',
  },
  selectorChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  selectorChipTextActive: {
    color: '#ffffff',
  },
  sideBySideContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  packageCard: {
    padding: 12,
    borderRadius: 10,
  },
  packageCardHeader: {
    marginBottom: 6,
  },
  packName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  packSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  metricCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  metricDesc: {
    fontSize: 13,
    color: '#334155',
  },
  mrpRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  mrpCol: {
    flex: 1,
    alignItems: 'center',
  },
  mrpDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  mrpLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  mrpVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  mrpDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  tableCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  tableRow: {
    paddingVertical: 10,
  },
  tableRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tableFieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tableFieldName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  tableValuesRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  valSubLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  valText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
  },
  diffDescription: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontStyle: 'italic',
  },
  guardrailCard: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    marginBottom: 16,
  },
  guardrailTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  guardrailText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  actionRow: {
    marginTop: 4,
  },
});

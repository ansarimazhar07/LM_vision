import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Declaration, DeclarationType } from '@lm-vision/shared-types';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { ProviderBadge } from '../components/ProviderBadge';
import { WorkflowProgress } from '../components/WorkflowProgress';
import { isLocalOnlyMode } from '../config';

const DECLARATION_TITLES: Record<string, string> = {
  GENERIC_NAME: 'Generic Name / Commodity Title',
  NET_QUANTITY: 'Net Quantity',
  MRP: 'Maximum Retail Price (MRP)',
  MANUFACTURER_NAME_ADDRESS: 'Manufacturer Details',
  CONSUMER_CARE_DETAILS: 'Consumer Care Helpline',
  DATE_OF_PACKAGING: 'Date of Packaging',
  DATE_OF_MANUFACTURE: 'Date of Manufacture',
  COUNTRY_OF_ORIGIN: 'Country of Origin',
};

interface PresetPackage {
  label: string;
  name: string;
  netQty: string;
  mrp: string;
  date: string;
  manufacturer: string;
  consumerCare: string;
  origin: string;
}

const PRESETS: PresetPackage[] = [
  {
    label: 'Atta 5kg',
    name: 'Whole Wheat Atta',
    netQty: '5 kg',
    mrp: '249.00',
    date: '03/2026',
    manufacturer: 'Golden Mills Packaging Ltd., Plot 12, Industrial Area, Noida, UP - 201301',
    consumerCare: '1800-111-2222, care@goldenmills.com',
    origin: 'India',
  },
  {
    label: 'Shampoo 200ml',
    name: 'Anti-Dandruff Herbal Shampoo',
    netQty: '200 ml',
    mrp: '185.00',
    date: '01/2026',
    manufacturer: 'Velvet Cosmetics Ltd., 45 Chemical Zone, Vapi, Gujarat - 396195',
    consumerCare: '1800-222-3333, support@velvet.in',
    origin: 'India',
  },
  {
    label: 'Biscuits 100g',
    name: 'Butter Cookies',
    netQty: '100 g',
    mrp: '30.00',
    date: '02/2026',
    manufacturer: 'Crisp Bakers India Ltd., Peenya, Bengaluru, Karnataka - 560058',
    consumerCare: '080-28390000, consumer@crispbakers.com',
    origin: 'India',
  },
  {
    label: 'Oil 1L',
    name: 'Refined Sunflower Oil',
    netQty: '1 l (910 g)',
    mrp: '165.00',
    date: '04/2026',
    manufacturer: 'Pure Foods Refinery, NH-8, Mehsana, Gujarat - 384002',
    consumerCare: '1800-444-5555, support@purefoods.co.in',
    origin: 'India',
  },
];

export function DeclarationsScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const workflow = useInspectionWorkflow();
  const declarations = workflow.activeDraft?.declarations || [];
  const existingName = workflow.activeDraft?.productName || '';

  const isLocal = isLocalOnlyMode() || workflow.aiMode === 'LOCAL_ONLY' || workflow.aiMode === 'OFFLINE';

  const [showForm, setShowForm] = useState(declarations.length === 0);
  const [genericName, setGenericName] = useState(
    existingName || declarations.find((d) => d.type === 'GENERIC_NAME')?.rawText || ''
  );
  const [netQuantity, setNetQuantity] = useState(
    declarations.find((d) => d.type === 'NET_QUANTITY')?.rawText || ''
  );
  const [mrp, setMrp] = useState(
    String(declarations.find((d) => d.type === 'MRP')?.normalizedValue || '')
  );
  const [date, setDate] = useState(
    declarations.find((d) => d.type === 'DATE_OF_PACKAGING' || d.type === 'DATE_OF_MANUFACTURE')?.rawText || ''
  );
  const [manufacturer, setManufacturer] = useState(
    declarations.find((d) => d.type === 'MANUFACTURER_NAME_ADDRESS')?.rawText || ''
  );
  const [consumerCare, setConsumerCare] = useState(
    declarations.find((d) => d.type === 'CONSUMER_CARE_DETAILS')?.rawText || ''
  );
  const [countryOfOrigin, setCountryOfOrigin] = useState(
    declarations.find((d) => d.type === 'COUNTRY_OF_ORIGIN')?.rawText || 'India'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const applyPreset = (preset: PresetPackage) => {
    setGenericName(preset.name);
    setNetQuantity(preset.netQty);
    setMrp(preset.mrp);
    setDate(preset.date);
    setManufacturer(preset.manufacturer);
    setConsumerCare(preset.consumerCare);
    setCountryOfOrigin(preset.origin);
  };

  const handleSaveDeclarations = () => {
    const newDeclarations: Declaration[] = [];
    const draftImages = workflow.activeDraft?.images || [];
    const frontImg = draftImages.find((img) => img.surface === 'FRONT') || draftImages[0];
    const backImg = draftImages.find((img) => img.surface === 'BACK') || draftImages[1] || frontImg;

    // 1. Generic Name
    if (genericName.trim()) {
      newDeclarations.push({
        type: 'GENERIC_NAME' as DeclarationType,
        rawText: genericName.trim(),
        normalizedValue: genericName.trim(),
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
        region: frontImg
          ? {
              id: 'decl-region-name',
              imageId: frontImg.id,
              surface: frontImg.surface,
              boundingBox: { xMin: 0.12, yMin: 0.18, xMax: 0.88, yMax: 0.30, unit: 'NORMALIZED' },
              text: genericName.trim(),
              confidence: 1.0,
            }
          : undefined,
      });
    }

    // 2. Net Quantity
    if (netQuantity.trim()) {
      const match = netQuantity.trim().match(/([0-9.]+)\s*([a-zA-Z]+)?/);
      const val = match && match[1] ? parseFloat(match[1]) : undefined;
      const unit = match && match[2] ? match[2] : 'g';
      newDeclarations.push({
        type: 'NET_QUANTITY' as DeclarationType,
        rawText: netQuantity.trim(),
        normalizedValue: val !== undefined && !isNaN(val) ? val : netQuantity.trim(),
        unit,
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
        region: frontImg
          ? {
              id: 'decl-region-netqty',
              imageId: frontImg.id,
              surface: frontImg.surface,
              boundingBox: { xMin: 0.18, yMin: 0.74, xMax: 0.82, yMax: 0.86, unit: 'NORMALIZED' },
              text: netQuantity.trim(),
              confidence: 1.0,
            }
          : undefined,
      });
    }

    // 3. MRP
    if (mrp.trim()) {
      const num = parseFloat(mrp.replace(/[^0-9.]/g, ''));
      newDeclarations.push({
        type: 'MRP' as DeclarationType,
        rawText: `MRP ₹ ${mrp.trim()} (Incl. of all taxes)`,
        normalizedValue: !isNaN(num) ? num : mrp.trim(),
        unit: 'INR',
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
        region: backImg
          ? {
              id: 'decl-region-mrp',
              imageId: backImg.id,
              surface: backImg.surface,
              boundingBox: { xMin: 0.10, yMin: 0.16, xMax: 0.90, yMax: 0.28, unit: 'NORMALIZED' },
              text: `MRP ₹ ${mrp.trim()}`,
              confidence: 1.0,
            }
          : undefined,
      });
    }

    // 4. Date of Packaging
    if (date.trim()) {
      newDeclarations.push({
        type: 'DATE_OF_PACKAGING' as DeclarationType,
        rawText: date.trim(),
        normalizedValue: date.trim(),
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
        region: backImg
          ? {
              id: 'decl-region-date',
              imageId: backImg.id,
              surface: backImg.surface,
              boundingBox: { xMin: 0.10, yMin: 0.32, xMax: 0.55, yMax: 0.42, unit: 'NORMALIZED' },
              text: date.trim(),
              confidence: 1.0,
            }
          : undefined,
      });
    }

    // 5. Manufacturer
    if (manufacturer.trim()) {
      newDeclarations.push({
        type: 'MANUFACTURER_NAME_ADDRESS' as DeclarationType,
        rawText: manufacturer.trim(),
        normalizedValue: manufacturer.trim(),
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
        region: backImg
          ? {
              id: 'decl-region-mfr',
              imageId: backImg.id,
              surface: backImg.surface,
              boundingBox: { xMin: 0.10, yMin: 0.45, xMax: 0.90, yMax: 0.58, unit: 'NORMALIZED' },
              text: manufacturer.trim(),
              confidence: 1.0,
            }
          : undefined,
      });
    }

    // 6. Consumer Care
    if (consumerCare.trim()) {
      newDeclarations.push({
        type: 'CONSUMER_CARE_DETAILS' as DeclarationType,
        rawText: consumerCare.trim(),
        normalizedValue: consumerCare.trim(),
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
        region: backImg
          ? {
              id: 'decl-region-care',
              imageId: backImg.id,
              surface: backImg.surface,
              boundingBox: { xMin: 0.10, yMin: 0.62, xMax: 0.90, yMax: 0.74, unit: 'NORMALIZED' },
              text: consumerCare.trim(),
              confidence: 1.0,
            }
          : undefined,
      });
    }

    // 7. Country of Origin
    if (countryOfOrigin.trim()) {
      newDeclarations.push({
        type: 'COUNTRY_OF_ORIGIN' as DeclarationType,
        rawText: countryOfOrigin.trim(),
        normalizedValue: countryOfOrigin.trim(),
        confidence: 1.0,
        isFormatStandard: true,
        detectedLanguage: 'en',
        region: backImg
          ? {
              id: 'decl-region-origin',
              imageId: backImg.id,
              surface: backImg.surface,
              boundingBox: { xMin: 0.10, yMin: 0.78, xMax: 0.60, yMax: 0.88, unit: 'NORMALIZED' },
              text: countryOfOrigin.trim(),
              confidence: 1.0,
            }
          : undefined,
      });
    }

    workflow.updatePhysicalDeclarations(newDeclarations);
    setSaveSuccess(true);
    setShowForm(false);
  };

  return (
    <Screen title="Statutory Declarations">
      <View style={styles.scrollContent}>
        <WorkflowProgress current="analyze" />

        <Surface style={styles.headerCard}>
          <View style={styles.demoTag}>
            <ProviderBadge mode={workflow.aiMode} />
          </View>
          <Text style={styles.headerTitle}>Physical Package Declarations</Text>
          <Text style={styles.headerDesc}>
            Mandatory declarations under the Legal Metrology (Packaged Commodities) Rules, 2011 (GSR 202(E)).
          </Text>
        </Surface>

        {/* Local Verification Notice */}
        {isLocal && (
          <Surface style={styles.localNoticeCard}>
            <Text style={styles.localNoticeTitle}>Local Offline Validation Mode</Text>
            <Text style={styles.localNoticeText}>
              All image evidence and photogrammetric calibration are retained on-device. If optical character recognition requires human verification or was unlinked, you can enter or confirm the physical package declarations below to evaluate GSR 202(E) compliance rules.
            </Text>
          </Surface>
        )}

        {/* Toggle / Add Declarations Button */}
        <View style={styles.actionRow}>
          <Button
            label={showForm ? 'Hide Verification Form ▲' : '✏️ Verify / Enter Declarations ▼'}
            variant="secondary"
            onPress={() => setShowForm((prev) => !prev)}
          />
          {declarations.length > 0 && (
            <>
              <Button
                label="🔍 Heatmap"
                variant="secondary"
                onPress={() => navigation.navigate('EvidenceViewer')}
              />
              <Button
                label="View Results →"
                onPress={() => navigation.navigate('InspectionResult')}
              />
            </>
          )}
        </View>

        {/* PHYSICAL DECLARATIONS ENTRY FORM */}
        {showForm && (
          <Surface style={styles.formCard}>
            <Text style={styles.formTitle}>Physical Package Verification Form</Text>
            <Text style={styles.formSubtitle}>
              Record the values physically visible on the packaging panels in your hands.
            </Text>

            {/* Presets Row */}
            <Text style={styles.fieldLabel}>Quick Test Presets:</Text>
            <View style={styles.presetsRow}>
              {PRESETS.map((preset) => (
                <Pressable
                  key={preset.label}
                  style={styles.presetChip}
                  onPress={() => applyPreset(preset)}
                >
                  <Text style={styles.presetChipText}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>1. Generic Name / Commodity Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Anti-Dandruff Shampoo, Atta, Biscuits"
                placeholderTextColor="#9ca3af"
                value={genericName}
                onChangeText={setGenericName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>2. Net Quantity (with metric unit)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 200 ml, 5 kg, 100 g, 1 l"
                placeholderTextColor="#9ca3af"
                value={netQuantity}
                onChangeText={setNetQuantity}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>3. Maximum Retail Price (MRP in ₹)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 185.00"
                placeholderTextColor="#9ca3af"
                value={mrp}
                onChangeText={setMrp}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>4. Date of Packaging / Manufacture</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 01/2026, 2026-01"
                placeholderTextColor="#9ca3af"
                value={date}
                onChangeText={setDate}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>5. Manufacturer / Packer Name & Address</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="e.g. Velvet Cosmetics Ltd., Vapi, Gujarat - 396195"
                placeholderTextColor="#9ca3af"
                value={manufacturer}
                onChangeText={setManufacturer}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>6. Consumer Care Contact Details</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 1800-222-3333, support@velvet.in"
                placeholderTextColor="#9ca3af"
                value={consumerCare}
                onChangeText={setConsumerCare}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>7. Country of Origin</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. India"
                placeholderTextColor="#9ca3af"
                value={countryOfOrigin}
                onChangeText={setCountryOfOrigin}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Button
                label="Apply & Run Statutory GSR 202(E) Rules"
                onPress={handleSaveDeclarations}
              />
            </View>
          </Surface>
        )}

        {/* Success Banner */}
        {saveSuccess && (
          <Surface style={styles.successBanner}>
            <Text style={styles.successTitle}>Declarations Applied ✓</Text>
            <Text style={styles.successText}>
              GSR 202(E) statutory rules evaluated. You can proceed to the inspection results or start inspector review.
            </Text>
          </Surface>
        )}

        {/* LIST OF ACTIVE DECLARATIONS */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionHeading}>Current Package Declarations</Text>
          <Badge
            label={`${declarations.length} recorded`}
            bg={declarations.length > 0 ? '#d1fae5' : '#f3f4f6'}
            color={declarations.length > 0 ? '#065f46' : '#6b7280'}
            size="sm"
          />
        </View>

        {declarations.length === 0 ? (
          <Surface style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Zero Declarations Auto-Extracted</Text>
            <Text style={styles.emptyText}>
              No declarations have been recorded yet. Use the Physical Package Verification Form above to enter values from the real package.
            </Text>
          </Surface>
        ) : (
          declarations.map((decl, index) => {
            const title = DECLARATION_TITLES[decl.type] || decl.type;
            const surface = decl.region?.surface || 'PHYSICAL_INSPECTION';

            return (
              <Surface key={`${decl.type}-${index}`} style={styles.declCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.declType}>{title}</Text>
                  <Badge label={`Surface: ${surface}`} bg="#f3f4f6" color="#4b5563" size="sm" />
                </View>

                {/* Raw Extracted Text */}
                <View style={styles.rawTextContainer}>
                  <Text style={styles.rawTextLabel}>Label Declaration:</Text>
                  <Text style={styles.rawTextContent}>"{decl.rawText}"</Text>
                </View>

                {/* Normalized Parsed Value */}
                {decl.normalizedValue !== undefined && decl.normalizedValue !== null && (
                  <View style={styles.normRow}>
                    <Text style={styles.normLabel}>Normalized Statutory Value:</Text>
                    <Text style={styles.normValue}>
                      {String(decl.normalizedValue)} {decl.unit || ''}
                    </Text>
                  </View>
                )}

                {/* Format Compliance Tag */}
                <View style={styles.tagRow}>
                  {decl.isFormatStandard ? (
                    <Badge label="Standard Format ✓" bg="#d1fae5" color="#065f46" size="sm" />
                  ) : (
                    <Badge label="Non-Standard Format ⚠" bg="#fef3c7" color="#92400e" size="sm" />
                  )}
                </View>

                <View style={styles.divider} />
                <ConfidenceBar score={decl.confidence} label="Verification Confidence" />
              </Surface>
            );
          })
        )}

        {/* Next Step CTA */}
        {declarations.length > 0 && (
          <View style={styles.bottomCtaRow}>
            <Button
              label="Proceed to Inspection Summary →"
              onPress={() => navigation.navigate('InspectionResult')}
            />
          </View>
        )}
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
  demoTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerDesc: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  localNoticeCard: {
    padding: 14,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
  },
  localNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 3,
  },
  localNoticeText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  formCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    marginTop: 4,
  },
  presetChip: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  inputGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  textInput: {
    minHeight: 42,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    fontSize: 13,
    color: '#111827',
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  successBanner: {
    padding: 12,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 8,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
  },
  successText: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  declCard: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  declType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  rawTextContainer: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  rawTextLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  rawTextContent: {
    fontSize: 13,
    color: '#1f2937',
    fontStyle: 'italic',
    lineHeight: 19,
    flexShrink: 1,
  },
  normRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 6,
  },
  normLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  normValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  tagRow: {
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 8,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomCtaRow: {
    marginTop: 8,
  },
});

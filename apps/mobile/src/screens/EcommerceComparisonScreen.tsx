import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

type Props = NativeStackScreenProps<RootStackParamList, 'EcommerceComparison'>;

type InputMode = 'MANUAL' | 'PASTE_TEXT' | 'JSON_INPUT';

type ComparisonResultStatus = 'MATCH' | 'MISMATCH' | 'INSUFFICIENT_EVIDENCE';

interface ComparisonRow {
  field: string;
  physicalValue: string;
  listingValue: string;
  status: ComparisonResultStatus;
  note: string;
}

export function EcommerceComparisonScreen({ navigation }: Props): React.JSX.Element {
  const workflow = useInspectionWorkflow();
  const draft = workflow.activeDraft;

  // Extract physical package observations from active draft
  const physicalDecl = useMemo(() => {
    const decls = draft?.declarations || [];
    const mrpDecl = decls.find((d) => d.type === 'MRP');
    const netQtyDecl = decls.find((d) => d.type === 'NET_QUANTITY');
    const mfrDecl = decls.find((d) => d.type === 'MANUFACTURER_NAME_ADDRESS');
    const nameDecl = decls.find((d) => d.type === 'GENERIC_NAME');

    return {
      productName: draft?.productName || nameDecl?.rawText || 'Wheat Atta Premium',
      genericName: nameDecl?.rawText || 'Whole Wheat Flour',
      mrp: mrpDecl ? String(mrpDecl.normalizedValue) : '249.00',
      netQty: netQtyDecl?.rawText || '5 kg',
      manufacturer: mfrDecl?.rawText || 'Golden Mills Pvt Ltd',
      packSize: draft?.packageType || 'Pouch',
    };
  }, [draft]);

  const [inputMode, setInputMode] = useState<InputMode>('MANUAL');

  // Manual input fields
  const [listingName, setListingName] = useState(physicalDecl.productName);
  const [listingMrp, setListingMrp] = useState('299.00'); // Default demo fixture showing online premium
  const [listingNetQty, setListingNetQty] = useState(physicalDecl.netQty);
  const [listingMfr, setListingMfr] = useState(physicalDecl.manufacturer);
  const [listingPackSize, setListingPackSize] = useState(physicalDecl.packSize);

  // Raw paste / JSON input
  const [rawText, setRawText] = useState('');
  const [jsonText, setJsonText] = useState(
    JSON.stringify(
      {
        listingTitle: physicalDecl.productName,
        price: 299.0,
        quantity: physicalDecl.netQty,
        sellerOrManufacturer: physicalDecl.manufacturer,
      },
      null,
      2
    )
  );

  const handleParseJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.listingTitle) setListingName(String(parsed.listingTitle));
      if (parsed.price) setListingMrp(String(parsed.price));
      if (parsed.quantity) setListingNetQty(String(parsed.quantity));
      if (parsed.sellerOrManufacturer) setListingMfr(String(parsed.sellerOrManufacturer));
      if (parsed.packagingFormat) setListingPackSize(String(parsed.packagingFormat));
      setInputMode('MANUAL');
    } catch {
      // JSON parse error handled gracefully
    }
  };

  const handleParsePastedText = () => {
    // Parse key lines from pasted text
    const lines = rawText.split('\n');
    lines.forEach((l) => {
      if (/mrp|price|rs\.?|₹/i.test(l)) {
        const match = l.match(/([0-9]+(?:\.[0-9]{1,2})?)/);
        if (match && match[1]) setListingMrp(match[1]);
      } else if (/net\s*qty|weight|vol|size/i.test(l)) {
        setListingNetQty(l.trim());
      }
    });
    setInputMode('MANUAL');
  };

  // Perform Field-by-Field Semantic Comparison
  const comparisons: ComparisonRow[] = useMemo(() => {
    const rows: ComparisonRow[] = [];

    // 1. Product Name
    const pName = physicalDecl.productName.trim().toLowerCase();
    const lName = listingName.trim().toLowerCase();
    if (!lName) {
      rows.push({
        field: 'Product Name',
        physicalValue: physicalDecl.productName,
        listingValue: 'Not specified',
        status: 'INSUFFICIENT_EVIDENCE',
        note: 'Online listing omits commodity identifier.',
      });
    } else if (pName === lName || pName.includes(lName) || lName.includes(pName)) {
      rows.push({
        field: 'Product Name',
        physicalValue: physicalDecl.productName,
        listingValue: listingName,
        status: 'MATCH',
        note: 'Product titles are semantically equivalent.',
      });
    } else {
      rows.push({
        field: 'Product Name',
        physicalValue: physicalDecl.productName,
        listingValue: listingName,
        status: 'MISMATCH',
        note: 'Declared physical brand title differs from online listing title.',
      });
    }

    // 2. Maximum Retail Price (MRP)
    const pMrp = parseFloat(physicalDecl.mrp);
    const lMrp = parseFloat(listingMrp);
    if (isNaN(lMrp) || lMrp <= 0) {
      rows.push({
        field: 'Maximum Retail Price (MRP)',
        physicalValue: `₹${physicalDecl.mrp}`,
        listingValue: 'Not specified',
        status: 'INSUFFICIENT_EVIDENCE',
        note: 'Online listing did not specify a valid retail price.',
      });
    } else if (Math.abs(pMrp - lMrp) < 0.01) {
      rows.push({
        field: 'Maximum Retail Price (MRP)',
        physicalValue: `₹${pMrp.toFixed(2)}`,
        listingValue: `₹${lMrp.toFixed(2)}`,
        status: 'MATCH',
        note: 'Physical package MRP matches online listed price exactly.',
      });
    } else {
      const diff = lMrp - pMrp;
      const pct = ((diff / pMrp) * 100).toFixed(1);
      const direction = diff > 0 ? `+₹${diff.toFixed(2)} (+${pct}% premium)` : `-₹${Math.abs(diff).toFixed(2)} (${pct}% discount)`;
      rows.push({
        field: 'Maximum Retail Price (MRP)',
        physicalValue: `₹${pMrp.toFixed(2)}`,
        listingValue: `₹${lMrp.toFixed(2)}`,
        status: 'MISMATCH',
        note: `Price discrepancy detected: Difference of ${direction}.`,
      });
    }

    // 3. Net Quantity
    const pQty = physicalDecl.netQty.trim().toLowerCase();
    const lQty = listingNetQty.trim().toLowerCase();
    if (!lQty) {
      rows.push({
        field: 'Net Quantity',
        physicalValue: physicalDecl.netQty,
        listingValue: 'Not specified',
        status: 'INSUFFICIENT_EVIDENCE',
        note: 'Online listing omits net quantity declaration.',
      });
    } else if (pQty === lQty || pQty.replace(/\s+/g, '') === lQty.replace(/\s+/g, '')) {
      rows.push({
        field: 'Net Quantity',
        physicalValue: physicalDecl.netQty,
        listingValue: listingNetQty,
        status: 'MATCH',
        note: 'Quantity and units are identical.',
      });
    } else {
      rows.push({
        field: 'Net Quantity',
        physicalValue: physicalDecl.netQty,
        listingValue: listingNetQty,
        status: 'MISMATCH',
        note: `Physical package states '${physicalDecl.netQty}' while listing advertises '${listingNetQty}'.`,
      });
    }

    // 4. Manufacturer / Importer
    const pMfr = physicalDecl.manufacturer.trim().toLowerCase();
    const lMfr = listingMfr.trim().toLowerCase();
    if (!lMfr) {
      rows.push({
        field: 'Manufacturer / Packer',
        physicalValue: physicalDecl.manufacturer,
        listingValue: 'Not specified',
        status: 'INSUFFICIENT_EVIDENCE',
        note: 'Online listing does not declare manufacturer identity.',
      });
    } else if (pMfr.includes(lMfr) || lMfr.includes(pMfr)) {
      rows.push({
        field: 'Manufacturer / Packer',
        physicalValue: physicalDecl.manufacturer,
        listingValue: listingMfr,
        status: 'MATCH',
        note: 'Manufacturer declaration verified across sources.',
      });
    } else {
      rows.push({
        field: 'Manufacturer / Packer',
        physicalValue: physicalDecl.manufacturer,
        listingValue: listingMfr,
        status: 'MISMATCH',
        note: 'Manufacturer identity conflict between package label and online listing.',
      });
    }

    // 5. Pack Size / Packaging Type
    rows.push({
      field: 'Packaging Format',
      physicalValue: physicalDecl.packSize,
      listingValue: listingPackSize,
      status: physicalDecl.packSize.toLowerCase() === listingPackSize.toLowerCase() ? 'MATCH' : 'MISMATCH',
      note: 'Packaging type verification.',
    });

    return rows;
  }, [physicalDecl, listingName, listingMrp, listingNetQty, listingMfr, listingPackSize]);

  const mismatchCount = comparisons.filter((c) => c.status === 'MISMATCH').length;
  const matchCount = comparisons.filter((c) => c.status === 'MATCH').length;

  return (
    <Screen title="E-Commerce Cross-Check">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ValidationModeBanner />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CROSS-SOURCE EVIDENCE VERIFICATION</Text>
          <Text style={styles.title}>Physical vs. Online Listing</Text>
          <Text style={styles.subtitle}>
            Compare physical package declarations against e-commerce platform catalog records.
          </Text>
        </View>

        {/* Input Selector Strip */}
        <Surface style={styles.inputModeCard}>
          <Text style={styles.inputModeHeading}>Catalog Evidence Source</Text>
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setInputMode('MANUAL')}
              style={[styles.tabBtn, inputMode === 'MANUAL' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, inputMode === 'MANUAL' && styles.tabTextActive]}>
                Manual Entry
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setInputMode('PASTE_TEXT')}
              style={[styles.tabBtn, inputMode === 'PASTE_TEXT' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, inputMode === 'PASTE_TEXT' && styles.tabTextActive]}>
                Paste Text
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setInputMode('JSON_INPUT')}
              style={[styles.tabBtn, inputMode === 'JSON_INPUT' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, inputMode === 'JSON_INPUT' && styles.tabTextActive]}>
                Catalog JSON
              </Text>
            </Pressable>
          </View>

          {/* Form Based on Selected Mode */}
          {inputMode === 'MANUAL' && (
            <View style={styles.formGrid}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Online Listed Product Title:</Text>
                <TextInput
                  style={styles.textInput}
                  value={listingName}
                  onChangeText={setListingName}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Online Listed MRP (₹):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={listingMrp}
                    onChangeText={setListingMrp}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Online Net Quantity:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={listingNetQty}
                    onChangeText={setListingNetQty}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Online Seller / Manufacturer:</Text>
                <TextInput
                  style={styles.textInput}
                  value={listingMfr}
                  onChangeText={setListingMfr}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Online Packaging Format:</Text>
                <TextInput
                  style={styles.textInput}
                  value={listingPackSize}
                  onChangeText={setListingPackSize}
                />
              </View>
            </View>
          )}

          {inputMode === 'PASTE_TEXT' && (
            <View style={styles.formGrid}>
              <Text style={styles.inputLabel}>Paste Raw E-Commerce Listing Text:</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={rawText}
                onChangeText={setRawText}
                placeholder="Paste listing details copied from Amazon, Flipkart, Blinkit..."
                multiline
                numberOfLines={4}
              />
              <Button label="Extract Listing Fields" onPress={handleParsePastedText} />
            </View>
          )}

          {inputMode === 'JSON_INPUT' && (
            <View style={styles.formGrid}>
              <Text style={styles.inputLabel}>Structured Catalog JSON:</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaMono]}
                value={jsonText}
                onChangeText={setJsonText}
                multiline
                numberOfLines={5}
              />
              <Button label="Load JSON Payload" onPress={handleParseJson} />
            </View>
          )}
        </Surface>

        {/* Comparison Summary Banner */}
        <Surface style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Comparison Outcome</Text>
            <View style={styles.summaryBadges}>
              <Badge label={`${matchCount} MATCH`} bg="#dcfce7" color="#166534" size="sm" />
              {mismatchCount > 0 && (
                <Badge label={`${mismatchCount} DISCREPANCY`} bg="#fee2e2" color="#991b1b" size="sm" />
              )}
            </View>
          </View>
          <Text style={styles.summarySub}>
            {mismatchCount > 0
              ? 'Observational discrepancies detected between physical package and catalog record.'
              : 'Physical package declarations match online catalog listing.'}
          </Text>
        </Surface>

        {/* Field-by-Field Comparison Table */}
        <View style={styles.tableContainer}>
          {comparisons.map((row, idx) => {
            const isMismatch = row.status === 'MISMATCH';
            const isMatch = row.status === 'MATCH';

            return (
              <Surface key={idx} style={[styles.rowCard, isMismatch && styles.rowCardMismatch]}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowFieldTitle}>{row.field}</Text>
                  <Badge
                    label={row.status}
                    bg={isMatch ? '#dcfce7' : isMismatch ? '#fee2e2' : '#f3f4f6'}
                    color={isMatch ? '#166534' : isMismatch ? '#991b1b' : '#4b5563'}
                    size="sm"
                  />
                </View>

                <View style={styles.sideBySideRow}>
                  <View style={styles.sideCol}>
                    <Text style={styles.sideLabel}>Physical Package:</Text>
                    <Text style={styles.sideValuePhysical}>{row.physicalValue}</Text>
                  </View>
                  <View style={styles.sideDivider} />
                  <View style={styles.sideCol}>
                    <Text style={styles.sideLabel}>Online Catalog:</Text>
                    <Text
                      style={[
                        styles.sideValueListing,
                        isMismatch && { color: '#dc2626', fontWeight: '800' },
                      ]}
                    >
                      {row.listingValue}
                    </Text>
                  </View>
                </View>

                <Text style={styles.rowNote}>{row.note}</Text>
              </Surface>
            );
          })}
        </View>

        {/* Crucial Architectural Guardrail Notice (Section L2) */}
        <Surface style={styles.guardrailCard}>
          <Text style={styles.guardrailTitle}>Statutory Integrity Guardrail (Section L2)</Text>
          <Text style={styles.guardrailText}>
            Observational discrepancies between physical package labels and online catalog records do
            NOT constitute an automatic legal determination of fraud, counterfeiting, or deceptive practice.
            Discrepancies are recorded as observational evidence for the authorized human inspector to
            evaluate under the Legal Metrology (Packaged Commodities) Rules, 2011.
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
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  inputModeCard: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  inputModeHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  formGrid: {
    gap: 10,
  },
  inputGroup: {
    gap: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 75,
    textAlignVertical: 'top',
  },
  textAreaMono: {
    height: 90,
    fontFamily: 'monospace',
    fontSize: 11,
    textAlignVertical: 'top',
  },
  summaryCard: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  summarySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  tableContainer: {
    gap: 10,
    marginBottom: 14,
  },
  rowCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  rowCardMismatch: {
    borderColor: '#fca5a5',
    borderWidth: 1.5,
    backgroundColor: '#fffafb',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowFieldTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  sideBySideRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    gap: 10,
  },
  sideCol: {
    flex: 1,
  },
  sideDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  sideLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  sideValuePhysical: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  sideValueListing: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  rowNote: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 15,
  },
  guardrailCard: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    marginBottom: 16,
  },
  guardrailTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    marginBottom: 4,
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

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Screen, Surface } from '../components/Screen';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { MobileSourceTypeSchema, type MobileSourceType } from '../state/draft';
import { CommodityCategorySchema, PackagingTypeSchema, type CommodityCategory, type PackagingType } from '@lm-vision/shared-types';
import type { RootStackParamList } from '../navigation/types';

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label.replaceAll('_', ' ')}
      </Text>
    </Pressable>
  );
}

export function NewInspectionScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const workflow = useInspectionWorkflow();
  const [sourceType, setSourceType] = useState<MobileSourceType>('PHYSICAL');
  const [category, setCategory] = useState<CommodityCategory>('PERSONAL_CARE_COSMETICS');
  const [packageType, setPackageType] = useState<PackagingType>('BOTTLE');
  const [productName, setProductName] = useState<string>('');

  const continueToCapture = (): void => {
    workflow.startInspection({
      sourceType,
      category,
      packageType,
      productName: productName.trim() ? productName.trim() : undefined,
    });
    navigation.navigate('CameraCapture');
  };

  return (
    <Screen title="New Inspection">
      <Text style={styles.title}>New inspection</Text>
      <Text style={styles.subtitle}>Set the commodity category and packaging type before image capture.</Text>
      <Surface>
        <Text style={styles.heading}>Commodity / Product Name (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Atta 500g, Shampoo 200ml, Biscuits..."
          placeholderTextColor="#94a3b8"
          value={productName}
          onChangeText={setProductName}
          autoCapitalize="words"
        />
      </Surface>
      <Surface>
        <Text style={styles.heading}>Source</Text>
        <View style={styles.options}>
          {MobileSourceTypeSchema.options.map((value) => (
            <Option key={value} label={value} selected={sourceType === value} onPress={() => setSourceType(value)} />
          ))}
        </View>
      </Surface>
      <Surface>
        <Text style={styles.heading}>Commodity category</Text>
        <View style={styles.options}>
          {CommodityCategorySchema.options.slice(0, 5).map((value) => (
            <Option key={value} label={value} selected={category === value} onPress={() => setCategory(value)} />
          ))}
        </View>
      </Surface>
      <Surface>
        <Text style={styles.heading}>Package type</Text>
        <View style={styles.options}>
          {PackagingTypeSchema.options.slice(0, 6).map((value) => (
            <Option key={value} label={value} selected={packageType === value} onPress={() => setPackageType(value)} />
          ))}
        </View>
      </Surface>
      <Surface>
        <Text style={styles.heading}>AI Vision Engine</Text>
        <View style={styles.options}>
          <Option
            label="Google Gemini 3.5 Flash (Cloud AI - Recommended)"
            selected={workflow.aiMode === 'REAL'}
            onPress={() => workflow.setAiMode('REAL')}
          />
          <Option
            label="Local Offline Only (On-Device Validation)"
            selected={workflow.aiMode === 'LOCAL_ONLY' || workflow.aiMode === 'OFFLINE'}
            onPress={() => workflow.setAiMode('LOCAL_ONLY')}
          />
        </View>
      </Surface>
      <Button label="Proceed to Camera Capture" onPress={continueToCapture} />
      <Text style={styles.note}>
        Captures packaging surface evidence and evaluates declarations under the Legal Metrology (Packaged Commodities) Rules.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 16, lineHeight: 23 },
  heading: { color: '#0f172a', fontSize: 17, fontWeight: '800', marginBottom: 14 },
  options: { gap: 10 },
  option: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
  optionSelected: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  optionText: { color: '#334155', fontSize: 15, fontWeight: '600' },
  optionTextSelected: { color: '#3730a3' },
  textInput: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: 15,
    color: '#0f172a',
  },
  note: { color: '#64748b', textAlign: 'center', fontSize: 13, lineHeight: 19 },
});

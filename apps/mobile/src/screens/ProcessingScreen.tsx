import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLOR_TOKENS } from '@lm-vision/ui';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import type { AIExecutionMode } from '../services/ai/aiClientAdapter';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Button } from '../components/Button';
import { ProgressSteps, type ProgressStepItem } from '../components/ProgressSteps';
import { ProviderBadge } from '../components/ProviderBadge';
import { WorkflowProgress } from '../components/WorkflowProgress';
import { ValidationModeBanner } from '../components/ValidationModeBanner';
import { isLocalOnlyMode } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'AIProcessing'>;

const GEMINI_PIPELINE_STEPS: ProgressStepItem[] = [
  {
    key: 'prep',
    label: 'Image normalization & preparation',
    description: 'Validating captured packaging panels and encoding payload',
  },
  {
    key: 'upload',
    label: 'Secure evidence transmission',
    description: 'Sending photographs to server-side LM-Vision AI Engine',
  },
  {
    key: 'gemini',
    label: 'Gemini multimodal analysis',
    description: 'Extracting physical declarations via schema-constrained JSON',
  },
  {
    key: 'mapping',
    label: 'Canonical schema validation',
    description: 'Double-validating raw output into canonical PackageAnalysis contract',
  },
  {
    key: 'rules',
    label: 'Evidence linking & rule evaluation',
    description: 'Linking real photographs as physical evidence to findings',
  },
];

const LOCAL_ONLY_PIPELINE_STEPS: ProgressStepItem[] = [
  {
    key: 'quality',
    label: 'Image Quality Assessment',
    description: 'Evaluating on-device photographic quality heuristics and legibility',
  },
  {
    key: 'ocr',
    label: 'On-Device OCR',
    description: 'Scanning text bounding regions locally (100% offline perception)',
  },
  {
    key: 'declarations',
    label: 'Declaration Extraction',
    description: 'Detecting MRP, Net Quantity, Dates, Manufacturer, and Contact details',
  },
  {
    key: 'normalization',
    label: 'Normalization',
    description: 'Normalizing metric units and dates deterministically',
  },
  {
    key: 'rules',
    label: 'GSR 202(E) Rule Evaluation',
    description: 'Evaluating statutory Legal Metrology rules deterministically on-device',
  },
  {
    key: 'review',
    label: 'Inspector Review',
    description: 'Preparing evidence package and provenance trail for human inspector',
  },
];

const OFFLINE_PIPELINE_STEPS: ProgressStepItem[] = [
  {
    key: 'normalization',
    label: 'Image normalization & preparation',
    description: 'Validating captured packaging photographs on-device',
  },
  {
    key: 'quality',
    label: 'Image quality assessment',
    description: 'Evaluating on-device resolution, contrast, and statutory legibility',
  },
  {
    key: 'ocr',
    label: 'On-device OCR text extraction',
    description: 'Scanning text regions and coordinates locally (100% offline)',
  },
  {
    key: 'declarations',
    label: 'Candidate extraction & normalization',
    description: 'Extracting MRP, Net Qty, Dates, and Manufacturer declarations',
  },
  {
    key: 'geometry',
    label: 'Geometry & font height measurement',
    description: 'Measuring display area and numeral height on-device',
  },
  {
    key: 'rules',
    label: 'Authoritative GSR 202(E) rule evaluation',
    description: 'Evaluating statutory Legal Metrology rules deterministically',
  },
];

const HYBRID_PIPELINE_STEPS: ProgressStepItem[] = [
  {
    key: 'local',
    label: 'Local OCR extraction',
    description: 'Executing on-device text perception across packaging surfaces',
  },
  {
    key: 'gemini',
    label: 'Gemini multimodal analysis',
    description: 'Sending package evidence to Gemini vision engine',
  },
  {
    key: 'conflict',
    label: 'Observation cross-comparison',
    description: 'Cross-verifying declarations & detecting evidence conflicts',
  },
  {
    key: 'rules',
    label: 'Authoritative GSR 202(E) rule evaluation',
    description: 'Evaluating statutory Legal Metrology rules deterministically',
  },
];

const MOCK_PIPELINE_STEPS: ProgressStepItem[] = [
  {
    key: 'normalization',
    label: 'Image normalization',
    description: 'Validating captured packaging photographs and mapping panels',
  },
  {
    key: 'quality',
    label: 'Image quality assessment',
    description: 'Evaluating sharpness, glare, and statutory legibility heuristics',
  },
  {
    key: 'ocr',
    label: 'OCR text extraction',
    description: 'Extracting text bounding regions across package panels',
  },
  {
    key: 'declarations',
    label: 'Declaration classification',
    description: 'Classifying 6 mandatory Packaged Commodities declarations',
  },
  {
    key: 'cv',
    label: 'Geometry measurements',
    description: 'Measuring typography numeral height and display area',
  },
  {
    key: 'rules',
    label: 'Demo/Test rule evaluation',
    description: 'Evaluating non-statutory Demo/Test rules and linking evidence',
  },
];

export function ProcessingScreen({ navigation }: Props): React.JSX.Element {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workflow = useInspectionWorkflow();

  const activeMode = workflow.aiMode;
  const isLocalOnly = isLocalOnlyMode() || activeMode === 'LOCAL_ONLY';

  const steps = useMemo(() => {
    if (isLocalOnly) return LOCAL_ONLY_PIPELINE_STEPS;
    if (fallbackNotice || activeMode === 'OFFLINE') return OFFLINE_PIPELINE_STEPS;
    if (activeMode === 'HYBRID') return HYBRID_PIPELINE_STEPS;
    if (activeMode === 'REAL') return GEMINI_PIPELINE_STEPS;
    return MOCK_PIPELINE_STEPS;
  }, [activeMode, fallbackNotice, isLocalOnly]);

  const runPipeline = (modeOverride?: AIExecutionMode) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const runMode = isLocalOnly ? 'LOCAL_ONLY' : (modeOverride || workflow.aiMode);
    setPipelineError(null);
    setFallbackNotice(null);
    setIsCompleted(false);
    setCurrentStepIndex(0);

    const targetSteps =
      isLocalOnly
        ? LOCAL_ONLY_PIPELINE_STEPS
        : runMode === 'OFFLINE'
        ? OFFLINE_PIPELINE_STEPS
        : runMode === 'HYBRID'
        ? HYBRID_PIPELINE_STEPS
        : runMode === 'REAL'
        ? GEMINI_PIPELINE_STEPS
        : MOCK_PIPELINE_STEPS;

    let step = 0;
    const interval = setInterval(() => {
      if (step < targetSteps.length - 1) {
        step += 1;
        setCurrentStepIndex(step);
      }
    }, 550);
    intervalRef.current = interval;

    void workflow
      .executeAnalysis(runMode, {
        onFallback: (reason) => {
          setFallbackNotice(reason);
        },
      })
      .then((result) => {
        clearInterval(interval);
        intervalRef.current = null;
        if (result.fallbackNotice) {
          setFallbackNotice(result.fallbackNotice);
        }
        if (result.success) {
          setCurrentStepIndex(targetSteps.length - 1);
          setIsCompleted(true);
          timeoutRef.current = setTimeout(() => {
            navigation.replace('InspectionResult');
          }, 700);
        } else {
          setPipelineError(result.error || 'Inspection analysis pipeline encountered an error.');
        }
      })
      .catch((err: any) => {
        clearInterval(interval);
        intervalRef.current = null;
        setPipelineError(err?.message || 'Failed to complete pipeline execution.');
      });
  };

  useEffect(() => {
    runPipeline();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchToOffline = () => {
    workflow.setAiMode('OFFLINE');
    runPipeline('OFFLINE');
  };

  const handleSwitchToDemo = () => {
    workflow.setAiMode('DEMO');
    runPipeline('DEMO');
  };

  const bannerProps = useMemo(() => {
    if (isLocalOnly) {
      return {
        tag: 'LOCAL OCR / OFFLINE (VALIDATION MODE)',
        tagBg: '#ecfdf5',
        tagColor: '#047857',
        title: 'On-Device Perception & Rule Evaluation',
        desc: 'Extracting statutory declarations and evaluating authoritative GSR 202(E) rules 100% on-device. Zero network requests.',
        borderStyle: styles.offlineBanner,
      };
    }
    if (fallbackNotice || activeMode === 'OFFLINE') {
      return {
        tag: 'LOCAL ON-DEVICE OCR (OFFLINE)',
        tagBg: '#ecfdf5',
        tagColor: '#047857',
        title: 'On-Device OCR & Computer Vision',
        desc: 'Extracting statutory declarations and measuring typography height 100% locally on-device. Zero network calls.',
        borderStyle: styles.offlineBanner,
      };
    }
    if (activeMode === 'HYBRID') {
      return {
        tag: 'HYBRID CONSENSUS (ON-DEVICE + GEMINI)',
        tagBg: '#eff6ff',
        tagColor: '#1d4ed8',
        title: 'Hybrid Consensus Perception',
        desc: 'Cross-verifying on-device OCR observations with Gemini Multimodal cloud vision to detect discrepancies.',
        borderStyle: styles.hybridBanner,
      };
    }
    if (activeMode === 'REAL') {
      return {
        tag: 'GEMINI MULTIMODAL AI (ONLINE)',
        tagBg: '#f5f3ff',
        tagColor: '#6d28d9',
        title: 'Google Gemini Multimodal Analysis',
        desc: 'Sending user-captured packaging photographs to trusted LM-Vision AI Engine for schema-constrained declaration extraction.',
        borderStyle: styles.geminiBanner,
      };
    }
    return {
      tag: 'DEMO / MOCK PIPELINE (LOCAL)',
      tagBg: COLOR_TOKENS.primary[50],
      tagColor: COLOR_TOKENS.primary[700],
      title: 'Modular Simulated Vision Pipeline',
      desc: 'Processing user-captured photographs through deterministic normalization, quality, OCR, declaration, geometry, and non-statutory Demo/Test rules.',
      borderStyle: styles.mockBanner,
    };
  }, [activeMode, fallbackNotice]);

  return (
    <Screen title={isLocalOnly ? 'Local Validation Processing' : 'AI Processing'}>
      <View style={styles.container}>
        <ValidationModeBanner />
        <WorkflowProgress current="analyze" />
        {/* Explicit Fallback Notification Banner */}
        {fallbackNotice && (
          <Surface style={styles.fallbackCard}>
            <View style={styles.fallbackTag}>
              <Text style={styles.fallbackTagText}>OFFLINE FALLBACK</Text>
            </View>
            <Text style={styles.fallbackTitle}>Network Unavailable</Text>
            <Text style={styles.fallbackDesc}>{fallbackNotice}</Text>
          </Surface>
        )}

        {/* Transparent Active Pipeline Banner */}
        <Surface style={[styles.bannerCard, bannerProps.borderStyle]}>
          <ProviderBadge mode={fallbackNotice ? 'OFFLINE' : activeMode} />
          <View style={[styles.bannerTag, { backgroundColor: bannerProps.tagBg }]}>
            <Text style={[styles.bannerTagText, { color: bannerProps.tagColor }]}>
              {bannerProps.tag}
            </Text>
          </View>
          <Text style={styles.bannerTitle}>{bannerProps.title}</Text>
          <Text style={styles.bannerDesc}>{bannerProps.desc}</Text>
        </Surface>

        {/* Pipeline Failure State Card */}
        {pipelineError ? (
          <Surface style={styles.errorCard}>
            <Text style={styles.errorTitle}>Analysis Pipeline Failed</Text>
            <Text style={styles.errorDesc}>{pipelineError}</Text>
            <View style={styles.errorActions}>
              <Button label="Retry Analysis" onPress={() => runPipeline()} />
              <View style={{ height: 8 }} />
              <Button
                label="Switch to Offline OCR (On-Device)"
                variant="secondary"
                onPress={handleSwitchToOffline}
              />
              <View style={{ height: 8 }} />
              <Button
                label="Switch to Demo Analysis"
                variant="secondary"
                onPress={handleSwitchToDemo}
              />
              <View style={{ height: 8 }} />
              <Button
                label="Return to Camera"
                variant="secondary"
                onPress={() => navigation.navigate('CameraCapture')}
              />
            </View>
          </Surface>
        ) : (
          /* Milestone Stepper */
          <Surface style={styles.stepsCard}>
            <Text style={styles.stepsHeader}>Processing Stages</Text>
            <ProgressSteps steps={steps} currentIndex={currentStepIndex} />
          </Surface>
        )}

        {/* Manual Continue Button in case auto-advance paused */}
        {isCompleted && !pipelineError && (
          <View style={styles.bottomAction}>
            <Button
              label="View Inspection Results"
              onPress={() => navigation.replace('InspectionResult')}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  bannerCard: {
    padding: 16,
    borderLeftWidth: 4,
  },
  geminiBanner: {
    borderLeftColor: '#7c3aed', // Purple
  },
  offlineBanner: {
    borderLeftColor: '#059669', // Emerald green
  },
  hybridBanner: {
    borderLeftColor: '#2563eb', // Indigo / Blue
  },
  mockBanner: {
    borderLeftColor: COLOR_TOKENS.primary[600],
  },
  bannerTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bannerTagText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  fallbackCard: {
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706', // Amber
    backgroundColor: '#fffbeb',
  },
  fallbackTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  fallbackTagText: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 4,
  },
  fallbackDesc: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
  stepsCard: {
    padding: 16,
  },
  stepsHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  bottomAction: {
    marginTop: 8,
  },
  errorCard: {
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 6,
  },
  errorDesc: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorActions: {
    marginTop: 4,
  },
});

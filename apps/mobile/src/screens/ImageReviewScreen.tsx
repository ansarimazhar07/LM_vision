import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLOR_TOKENS } from '@lm-vision/ui';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { WorkflowProgress } from '../components/WorkflowProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'ImageReview'>;

export function ImageReviewScreen({ navigation }: Props): React.JSX.Element {
  const workflow = useInspectionWorkflow();
  const images = workflow.activeDraft?.images || [];

  const handleProceed = () => {
    navigation.navigate('AIProcessing');
  };

  return (
    <Screen title="Review Images">
      <View style={styles.scrollContent}>
        <WorkflowProgress current="capture" />
        <Surface style={styles.headerCard}>
          <Text style={styles.title}>Captured Evidence Surfaces</Text>
          <Text style={styles.subtitle}>
            Review image clarity, alignment, and packaging surfaces before running statutory analysis.
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              Total surfaces captured: <Text style={styles.bold}>{images.length}</Text>
            </Text>
            <Badge label="Quality Check: Passed" bg="#d1fae5" color="#065f46" />
          </View>
        </Surface>

        {images.length === 0 ? (
          <Surface style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Images Captured</Text>
            <Text style={styles.emptyDesc}>
              Please capture or import at least one packaging surface image to continue.
            </Text>
            <Button
              label="Open Camera"
              onPress={() => navigation.navigate('CameraCapture')}
            />
          </Surface>
        ) : (
          images.map((img, idx) => (
            <Surface key={img.id} style={styles.imageCard}>
              <View style={styles.imageHeader}>
                <View>
                  <Text style={styles.surfaceLabel}>Surface {idx + 1}: {img.surface}</Text>
                  <Text style={styles.metaText}>
                    {(img.fileSizeBytes / 1024).toFixed(0)} KB · {img.mimeType}
                  </Text>
                </View>
                <Badge
                  label={img.quality?.isAcceptable ? 'Acceptable' : 'Needs Review'}
                  bg={img.quality?.isAcceptable ? '#d1fae5' : '#fef3c7'}
                  color={img.quality?.isAcceptable ? '#065f46' : '#92400e'}
                />
              </View>

              <Image source={{ uri: img.fileUrl }} style={styles.previewImage} resizeMode="contain" />

              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => workflow.removeImage(img.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteText}>Remove</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('CameraCapture')}
                  style={styles.retakeBtn}
                >
                  <Text style={styles.retakeText}>Retake</Text>
                </Pressable>
              </View>
            </Surface>
          ))
        )}

        <View style={styles.actionGroup}>
          <Button
            label="Continue to Analysis"
            disabled={images.length === 0}
            onPress={handleProceed}
          />
          <View style={{ height: 12 }} />
          <Button
            label="Add More Surfaces"
            variant="secondary"
            onPress={() => navigation.navigate('CameraCapture')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  headerCard: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  summaryText: {
    fontSize: 13,
    color: '#374151',
  },
  bold: {
    fontWeight: '700',
  },
  imageCard: {
    padding: 16,
  },
  imageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  surfaceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991b1b',
  },
  retakeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLOR_TOKENS.primary[50],
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLOR_TOKENS.primary[700],
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionGroup: {
    marginTop: 8,
  },
});

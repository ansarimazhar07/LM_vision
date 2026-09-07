import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { COLOR_TOKENS } from '@lm-vision/ui';

export interface ProgressStepItem {
  key: string;
  label: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: ProgressStepItem[];
  currentIndex: number; // 0 to steps.length
}

export function ProgressSteps({ steps, currentIndex }: ProgressStepsProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive = idx === currentIndex;
        const isPending = idx > currentIndex;

        return (
          <View key={step.key} style={styles.stepRow}>
            {/* Step indicator circle and line */}
            <View style={styles.indicatorCol}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                  isPending && styles.circlePending,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : isActive ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.stepNum}>{idx + 1}</Text>
                )}
              </View>
              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.connectorLine,
                    isCompleted && styles.connectorLineCompleted,
                  ]}
                />
              )}
            </View>

            {/* Step text */}
            <View style={styles.textCol}>
              <Text
                style={[
                  styles.label,
                  isCompleted && styles.labelCompleted,
                  isActive && styles.labelActive,
                  isPending && styles.labelPending,
                ]}
              >
                {step.label}
              </Text>
              {step.description ? (
                <Text style={styles.description}>{step.description}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 56,
  },
  indicatorCol: {
    alignItems: 'center',
    width: 32,
    marginRight: 14,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: COLOR_TOKENS.status.pass,
  },
  circleActive: {
    backgroundColor: COLOR_TOKENS.primary[600],
  },
  circlePending: {
    backgroundColor: '#e5e7eb',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  stepNum: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  connectorLineCompleted: {
    backgroundColor: COLOR_TOKENS.status.pass,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
    paddingBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  labelCompleted: {
    color: '#111827',
  },
  labelActive: {
    color: COLOR_TOKENS.primary[700],
    fontWeight: '700',
  },
  labelPending: {
    color: '#9ca3af',
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 17,
    flexShrink: 1,
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLOR_TOKENS } from '@lm-vision/ui';

export type WorkflowStage = 'capture' | 'analyze' | 'assess' | 'review' | 'decision' | 'report';

const STAGES: { key: WorkflowStage; label: string }[] = [
  { key: 'capture', label: 'Capture' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'assess', label: 'Assess' },
  { key: 'review', label: 'Review' },
  { key: 'decision', label: 'Decision' },
  { key: 'report', label: 'Report' },
];

export function WorkflowProgress({ current }: { current: WorkflowStage }): React.JSX.Element {
  const activeIndex = STAGES.findIndex((stage) => stage.key === current);
  return (
    <View accessibilityLabel={`Inspection workflow: ${STAGES[activeIndex]?.label ?? current}`} style={styles.container}>
      {STAGES.map((stage, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;
        return (
          <React.Fragment key={stage.key}>
            <View style={styles.item}>
              <View style={[styles.dot, complete && styles.complete, active && styles.active]}>
                <Text style={[styles.dotText, (complete || active) && styles.dotTextActive]}>{complete ? '✓' : index + 1}</Text>
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{stage.label}</Text>
            </View>
            {index < STAGES.length - 1 ? <View style={[styles.line, complete && styles.lineComplete]} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', width: '100%', paddingVertical: 4 },
  item: { alignItems: 'center', flex: 1, minWidth: 0 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR_TOKENS.ink[100] },
  complete: { backgroundColor: COLOR_TOKENS.status.pass },
  active: { backgroundColor: COLOR_TOKENS.primary[700] },
  dotText: { color: COLOR_TOKENS.ink[500], fontSize: 10, fontWeight: '800' },
  dotTextActive: { color: '#ffffff' },
  label: { color: COLOR_TOKENS.ink[500], fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'center', marginTop: 5, flexShrink: 1 },
  labelActive: { color: COLOR_TOKENS.primary[700] },
  line: { height: 2, flex: 1, marginTop: 11, backgroundColor: COLOR_TOKENS.ink[200] },
  lineComplete: { backgroundColor: COLOR_TOKENS.status.pass },
});

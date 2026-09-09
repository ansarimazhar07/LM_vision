import React from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLOR_TOKENS, SPACING, RADII } from '@lm-vision/ui';

export interface ScreenProps extends ScrollViewProps {
  title?: string;
  children: React.ReactNode;
}

export function Screen({ children, contentContainerStyle, ...props }: ScreenProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView {...props} contentContainerStyle={[styles.content, contentContainerStyle]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Surface({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }): React.JSX.Element {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function SectionHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }): React.JSX.Element {
  return (
    <View style={styles.sectionHeader}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOR_TOKENS.background },
  content: { flexGrow: 1, padding: SPACING.xl, gap: SPACING.lg, paddingBottom: 32 },
  surface: { backgroundColor: COLOR_TOKENS.surface, borderRadius: RADII.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLOR_TOKENS.border, shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  sectionHeader: { gap: 5 },
  eyebrow: { color: COLOR_TOKENS.primary[700], fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  sectionTitle: { color: COLOR_TOKENS.ink[950], fontSize: 21, lineHeight: 27, fontWeight: '800', flexShrink: 1 },
  sectionDescription: { color: COLOR_TOKENS.ink[500], fontSize: 14, lineHeight: 21, flexShrink: 1 },
});

export const screenColors = COLOR_TOKENS;

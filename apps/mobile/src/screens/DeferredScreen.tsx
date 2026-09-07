import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Screen, Surface } from '../components/Screen';
import type { RootStackParamList } from '../navigation/types';

export type DeferredScreenProps = NativeStackScreenProps<RootStackParamList, keyof Omit<RootStackParamList, 'Auth' | 'App'>>;
export function DeferredScreen({ route, navigation }: DeferredScreenProps): React.JSX.Element {
  return <Screen contentContainerStyle={styles.content}><Text style={styles.kicker}>PLANNED WORKFLOW</Text><Text style={styles.title}>{route.name.replace(/([A-Z])/g, ' $1').trim()}</Text><Surface><Text style={styles.heading}>Not available in Phase 3</Text><Text style={styles.body}>This route is intentionally reserved for the future inspection workflow. No camera, upload, AI, rule, evidence, e-commerce, or report operation is performed here.</Text></Surface><Button label="Back to home" onPress={() => navigation.navigate('App')} /></Screen>;
}
const styles = StyleSheet.create({ content: { justifyContent: 'center' }, kicker: { color: '#4f46e5', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }, title: { color: '#0f172a', fontSize: 30, fontWeight: '800' }, heading: { color: '#0f172a', fontSize: 18, fontWeight: '800' }, body: { color: '#475569', fontSize: 16, lineHeight: 24, marginTop: 10 } });

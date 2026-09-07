import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { Screen, Surface } from '../components/Screen';
import { Badge } from '../components/Badge';
import { getMobileConfig } from '../config';
import { useAuth } from '../auth/AuthProvider';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { ProviderBadge } from '../components/ProviderBadge';
import { SyncStatusBanner } from '../components/SyncStatusBanner';

export function ProfileScreen(): React.JSX.Element {
  const { authUser, signOut, updateProfileName, isDemoMode, error: authError } = useAuth();
  const workflow = useInspectionWorkflow();
  const config = getMobileConfig();

  const currentFullName = authUser?.user_metadata?.full_name || 'Legal Metrology Inspector';
  const email = authUser?.email || (isDemoMode ? 'demo.inspector@lm-vision.gov.in' : 'No email available');
  const role = (authUser?.user_metadata?.role as string) || 'INSPECTOR';

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(currentFullName);
  const [saving, setSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput.trim().length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    setFeedbackMessage(null);
    const res = await updateProfileName(nameInput.trim());
    setSaving(false);
    if (res.success) {
      setIsEditing(false);
      setFeedbackMessage('Profile name updated successfully.');
    } else {
      Alert.alert('Update Failed', res.error || 'Could not update profile name.');
    }
  };

  return (
    <Screen title="Inspector Profile">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>OFFICIAL IDENTITY & GOVERNANCE</Text>
        <Text style={styles.title}>Inspector Profile</Text>

        <SyncStatusBanner />

        {feedbackMessage ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>✓ {feedbackMessage}</Text>
          </View>
        ) : null}

        {/* Identity & Account Card */}
        <Surface style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {currentFullName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              {isEditing ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="Enter full name"
                    autoFocus
                  />
                  <View style={styles.saveCancelRow}>
                    <Pressable
                      onPress={handleSaveName}
                      disabled={saving}
                      style={[styles.smallBtn, styles.saveBtn]}
                    >
                      <Text style={styles.smallBtnText}>{saving ? '...' : 'Save'}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setNameInput(currentFullName);
                        setIsEditing(false);
                      }}
                      style={[styles.smallBtn, styles.cancelBtn]}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.nameActionRow}>
                    <Text style={styles.name}>{currentFullName}</Text>
                    <Pressable onPress={() => setIsEditing(true)} style={styles.editPencil}>
                      <Text style={styles.editPencilText}>✏️ Edit</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.email}>{email}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Statutory Role:</Text>
              <View style={styles.badgeWrap}>
                <Badge label={role.toUpperCase()} bg="#dbeafe" color="#1e40af" size="sm" />
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Session Type:</Text>
              <View style={styles.badgeWrap}>
                {isDemoMode ? (
                  <Badge label="DEMO SIMULATION" bg="#fef3c7" color="#b45309" size="sm" />
                ) : (
                  <Badge label="VERIFIED SUPABASE AUTH" bg="#dcfce7" color="#166534" size="sm" />
                )}
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Account Status:</Text>
              <Text style={styles.metaValActive}>Active & Authorized</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Role Escalation:</Text>
              <Text style={styles.metaValDisabled}>Locked (Admin Managed Only)</Text>
            </View>
          </View>
        </Surface>

        {/* System & Architecture Governance */}
        <Surface style={styles.card}>
          <Text style={styles.cardHeading}>System & Compliance Configuration</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Active AI Mode:</Text>
              <ProviderBadge mode={workflow.aiMode} />
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Sync State:</Text>
              <Text style={styles.metaVal}>{workflow.syncSnapshot.state}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Rule Bundle:</Text>
              <Text style={styles.metaVal}>LM-IN-RULES-2026.09 (GSR 202(E))</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Rules Status:</Text>
              <Text style={styles.metaValActive}>Authoritative & Immutable</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Client Version:</Text>
              <Text style={styles.metaVal}>0.1.0 (Phase 12 Productization)</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Environment:</Text>
              <Text style={styles.metaVal}>{config.NEXT_PUBLIC_APP_ENV}</Text>
            </View>
          </View>
        </Surface>

        {/* Authority Notice */}
        <Surface style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Statutory Integrity Guardrail</Text>
          <Text style={styles.noticeText}>
            Under Section 15 of the Legal Metrology Act, 2009, statutory rules and regulatory
            thresholds cannot be altered by client devices. All inspection records are signed
            with cryptographic SHA-256 hashes preserving full chain of custody.
          </Text>
        </Surface>

        {authError ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {authError}
          </Text>
        ) : null}

        <View style={styles.actionRow}>
          <Button
            label={isDemoMode ? 'Exit Demo Inspector' : 'Sign Out of Account'}
            variant="secondary"
            onPress={() => {
              void signOut();
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
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
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    marginBottom: 12,
  },
  feedbackCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  feedbackText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  nameActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  editPencil: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  editPencilText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  email: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
    flexShrink: 1,
  },
  editRow: {
    gap: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  saveCancelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
  },
  saveBtn: {
    backgroundColor: '#2563eb',
  },
  smallBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#e2e8f0',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  metaGrid: {
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 0,
  },
  metaVal: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  metaValActive: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
  },
  metaValDisabled: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeWrap: {
    alignItems: 'flex-end',
  },
  cardHeading: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  noticeCard: {
    padding: 14,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
  },
  noticeTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  noticeText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    color: '#b91c1c',
    marginBottom: 12,
    fontSize: 13,
  },
  actionRow: {
    marginTop: 4,
  },
});

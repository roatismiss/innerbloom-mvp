import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { optInAnalytics, optOutAnalytics } from '../../lib/analytics';
import { unregisterPushTokenForCurrentDevice } from '../../lib/queries/notifications';
import { callRpc } from '../../lib/queries/client';
import { queryClient } from '../../lib/queries/query-client';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { useMoodStore } from '../../store/mood';

const C = {
  surface:                '#fff8f6',
  surfaceRaised:          '#ffffff',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainer:       '#ffe9e4',
  primary:                '#994531',
  primaryContainer:       '#e8836b',
  onPrimaryContainer:     '#641e0e',
  secondaryContainer:     '#b8e6e0',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  error:                  '#ba1a1a',
  errorContainer:         '#ffdad6',
  onErrorContainer:       '#410002',
} as const;

const ANALYTICS_OPTOUT_KEY = 'innerbloom.analyticsOptOut.v1';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  const [analyticsOn, setAnalyticsOn] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  // Restore the saved analytics preference on mount.
  useEffect(() => {
    AsyncStorage.getItem(ANALYTICS_OPTOUT_KEY).then((v) => {
      if (v === '1') setAnalyticsOn(false);
    });
  }, []);

  function toggleAnalytics(next: boolean) {
    void Haptics.selectionAsync();
    setAnalyticsOn(next);
    if (next) {
      optInAnalytics();
      void AsyncStorage.removeItem(ANALYTICS_OPTOUT_KEY);
    } else {
      optOutAnalytics();
      void AsyncStorage.setItem(ANALYTICS_OPTOUT_KEY, '1');
    }
  }

  async function clearSessionState() {
    try { await unregisterPushTokenForCurrentDevice(); } catch { /* ignore */ }
    if (supabase) {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
    }
    signOut();
    useMoodStore.getState().reset();
    queryClient.clear();
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently erases your profile, check-ins, journal entries, conversations and everything else. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: runDelete },
      ],
    );
  }

  async function runDelete() {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await callRpc<undefined, void>('delete_my_account');
      await clearSessionState();
      router.replace('/(auth)/login');
    } catch (e: unknown) {
      deletingRef.current = false;
      setDeleting(false);
      Alert.alert(
        'Couldn’t delete your account',
        'Something went wrong. Please check your connection and try again.',
      );
      // eslint-disable-next-line no-console
      console.error('delete_account_failed', e);
    }
  }

  return (
    <View style={s.root}>
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.primary} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Settings &amp; Privacy</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48, gap: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Legal ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>LEGAL</Text>
          <View style={s.card}>
            <Row
              icon="shield-lock-outline"
              label="Privacy Policy"
              onPress={() => router.push('/legal?doc=privacy')}
            />
            <Divider />
            <Row
              icon="file-document-outline"
              label="Terms of Service"
              onPress={() => router.push('/legal?doc=terms')}
            />
          </View>
        </View>

        {/* ── Data preferences ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>DATA &amp; PRIVACY</Text>
          <View style={s.card}>
            <View style={s.rowToggle}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={s.rowLabel}>Anonymous usage analytics</Text>
                <Text style={s.rowSub}>
                  Helps us improve InnerBloom. We never collect your journal, chat
                  or mood notes — only that an action happened.
                </Text>
              </View>
              <Switch
                value={analyticsOn}
                onValueChange={toggleAnalytics}
                trackColor={{ false: C.outlineVariant, true: C.secondaryContainer }}
                thumbColor={Platform.OS === 'android' ? (analyticsOn ? C.primary : '#f4f3f4') : undefined}
                accessibilityLabel="Toggle anonymous usage analytics"
              />
            </View>
          </View>
        </View>

        {/* ── Account ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ACCOUNT</Text>
          <View style={s.card}>
            <Row icon="logout" label="Sign out" onPress={() => { void clearSessionState().then(() => router.replace('/(auth)/login')); }} />
          </View>

          <Pressable
            onPress={confirmDelete}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.85 }, deleting && { opacity: 0.6 }]}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={C.error} />
            <Text style={s.deleteText}>{deleting ? 'Deleting…' : 'Delete my account'}</Text>
          </Pressable>
          <Text style={s.deleteHint}>
            Permanently erases all your data. This cannot be undone.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <MaterialCommunityIcons name={icon} size={20} color={C.primary} />
      <Text style={s.rowLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      <MaterialCommunityIcons name="chevron-right" size={22} color={C.outline} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontFamily: 'NunitoSans_600SemiBold', fontSize: 18, color: C.onSurface },
  section: { gap: 10 },
  sectionLabel: { fontFamily: 'NunitoSans_600SemiBold', fontSize: 12, letterSpacing: 1, color: C.outline, paddingLeft: 4 },
  card: { backgroundColor: C.surfaceRaised, borderRadius: 18, borderWidth: 1, borderColor: C.surfaceContainer, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  rowToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { fontFamily: 'NunitoSans_600SemiBold', fontSize: 15, color: C.onSurface },
  rowSub: { fontFamily: 'NunitoSans_400Regular', fontSize: 12.5, lineHeight: 18, color: C.onSurfaceVariant, marginTop: 3 },
  divider: { height: 1, backgroundColor: C.surfaceContainer, marginLeft: 48 },
  deleteBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 9999,
    backgroundColor: C.errorContainer,
  },
  deleteText: { fontFamily: 'NunitoSans_600SemiBold', fontSize: 14, color: C.error, letterSpacing: 0.3 },
  deleteHint: { fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: C.outline, textAlign: 'center', marginTop: 8 },
});

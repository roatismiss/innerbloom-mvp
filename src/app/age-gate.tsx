import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { type RefObject, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ui as C } from '@/constants/palette';
import { track } from '@/lib/analytics';
import { MIN_AGE, ageFromISO, useAgeGate } from '../store/age-gate';

// First step of the app. A neutral, self-declared date-of-birth check that keeps
// InnerBloom 16+. Neutral by design — it never reveals the passing threshold, so
// it can't be reverse-engineered by a minor re-trying. Built with plain inputs
// (no native date picker) so it behaves identically on the web PWA.

const CURRENT_YEAR = new Date().getFullYear();

export default function AgeGateScreen() {
  const insets = useSafeAreaInsets();
  const status = useAgeGate((s) => s.status);
  const setBirthDate = useAgeGate((s) => s.setBirthDate);

  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');

  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  // Fires once when the gate first appears, so the funnel starts here.
  useEffect(() => {
    track('age_gate_shown');
  }, []);

  // A previously-blocked device lands straight on the locked view.
  if (status === 'blocked') {
    return <BlockedView insets={insets} />;
  }

  function onChangeMonth(v: string) {
    const digits = v.replace(/[^0-9]/g, '').slice(0, 2);
    setMonth(digits);
    if (error) setError('');
    if (digits.length === 2) dayRef.current?.focus();
  }

  function onChangeDay(v: string) {
    const digits = v.replace(/[^0-9]/g, '').slice(0, 2);
    setDay(digits);
    if (error) setError('');
    if (digits.length === 2) yearRef.current?.focus();
  }

  function onChangeYear(v: string) {
    const digits = v.replace(/[^0-9]/g, '').slice(0, 4);
    setYear(digits);
    if (error) setError('');
  }

  function handleContinue() {
    const m = Number(month);
    const d = Number(day);
    const y = Number(year);

    // Structural validity first.
    if (!month || !day || year.length !== 4) {
      return fail('Please enter your full date of birth.');
    }
    if (m < 1 || m > 12) return fail('That month doesn’t look right.');
    if (y < 1900 || y > CURRENT_YEAR) return fail('That year doesn’t look right.');

    // Calendar validity — rejects e.g. 31 Feb. Re-reading the parts back proves
    // the date didn't roll over into the next month.
    const probe = new Date(y, m - 1, d);
    if (
      probe.getFullYear() !== y ||
      probe.getMonth() !== m - 1 ||
      probe.getDate() !== d ||
      d < 1
    ) {
      return fail('That date doesn’t look right.');
    }
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    // A future date yields a negative age — treat it as a typo, not a lockout.
    if (ageFromISO(iso) < 0) {
      return fail('That date is in the future.');
    }
    const verdict = setBirthDate(iso);

    if (verdict === 'allowed') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Funnel event only. The user's actual age / age-band is a demographic
      // trait — it belongs on the PostHog person profile via identify(), never
      // as an event property. (Demographics are handled separately.)
      track('age_gate_passed');
      router.replace('/onboarding');
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      track('age_gate_blocked');
      // State flips to 'blocked' → component re-renders into BlockedView.
    }
  }

  function fail(msg: string) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError(msg);
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background blobs — opacity-only soft look (RN has no blur filter). */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[s.blob, s.blobTopLeft]} />
        <View style={[s.blob, s.blobMidRight]} />
        <View style={[s.blob, s.blobBottom]} />
      </View>

      <View
        style={[s.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      >
        <Animated.View entering={FadeInDown.delay(60).springify()} style={s.header}>
          <View style={s.logoBadge}>
            <MaterialCommunityIcons name="head-heart-outline" size={32} color={C.onPrimaryContainer} />
          </View>
          <Text style={s.brandName}>InnerBloom</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()} style={s.card}>
          <Text style={s.headline}>A quick check first</Text>
          <Text style={s.subtitle}>
            Confirm your date of birth so we can keep InnerBloom a safe,
            age-appropriate space for you.
          </Text>

          {/* DOB — three segmented fields, labelled so order is unambiguous. */}
          <View style={s.dobRow}>
            <DobField
              label="Month"
              placeholder="MM"
              value={month}
              onChangeText={onChangeMonth}
              maxLength={2}
              autoFocus
            />
            <DobField
              label="Day"
              placeholder="DD"
              value={day}
              onChangeText={onChangeDay}
              maxLength={2}
              inputRef={dayRef}
            />
            <DobField
              label="Year"
              placeholder="YYYY"
              value={year}
              onChangeText={onChangeYear}
              maxLength={4}
              flex={1.4}
              inputRef={yearRef}
              onSubmitEditing={handleContinue}
              returnKeyType="done"
            />
          </View>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [s.cta, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={s.ctaLabel}>Continue</Text>
          </Pressable>

          <View style={s.privacyRow}>
            <MaterialCommunityIcons name="lock-outline" size={13} color={C.outline} />
            <Text style={s.privacyText}>
              Stays on your device — used only to confirm your age.{' '}
              <Text
                style={s.privacyLink}
                onPress={() => router.push('/legal?doc=privacy')}
              >
                Privacy
              </Text>
            </Text>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

function DobField({
  label,
  placeholder,
  value,
  onChangeText,
  maxLength,
  flex = 1,
  autoFocus = false,
  inputRef,
  onSubmitEditing,
  returnKeyType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  maxLength: number;
  flex?: number;
  autoFocus?: boolean;
  inputRef?: RefObject<TextInput | null>;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done';
}) {
  return (
    <View style={{ flex, gap: 8 }}>
      <Text style={s.dobLabel}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={s.dobInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.placeholder}
        keyboardType="number-pad"
        maxLength={maxLength}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        textAlign="center"
        accessibilityLabel={`Birth ${label.toLowerCase()}`}
      />
    </View>
  );
}

function BlockedView({ insets }: { insets: { top: number; bottom: number } }) {
  return (
    <View style={s.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[s.blob, s.blobTopLeft]} />
        <View style={[s.blob, s.blobBottom]} />
      </View>

      <View
        style={[
          s.inner,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, justifyContent: 'center' },
        ]}
      >
        <Animated.View entering={FadeInDown.delay(60).springify()} style={s.blockedCard}>
          <View style={s.blockedIcon}>
            <MaterialCommunityIcons name="sprout-outline" size={36} color={C.primary} />
          </View>
          <Text style={s.blockedHeadline}>Come back when you’re a little older</Text>
          <Text style={s.blockedBody}>
            InnerBloom is made for ages {MIN_AGE} and up. Thank you for your honesty
            — we’ll be here when the time is right.
          </Text>
          <Text style={s.blockedBodyItalic}>
            If you’re going through something hard right now, please talk to a
            parent, teacher, or another adult you trust. You deserve support.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },

  // ── Blobs ──────────────────────────────────────────────────────────────────
  blob: { position: 'absolute', borderRadius: 9999, opacity: 0.55 },
  blobTopLeft: { width: 380, height: 380, backgroundColor: C.secondaryFixed, top: -100, left: -100 },
  blobMidRight: { width: 280, height: 280, backgroundColor: C.surfaceHigh, top: '38%', right: -80 },
  blobBottom: { width: 460, height: 460, backgroundColor: C.primaryFixed, bottom: -160, left: '15%' },

  inner: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: { alignItems: 'center', gap: 10, width: '100%', maxWidth: 440, marginBottom: 24 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  brandName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
    color: C.primary,
    textAlign: 'center',
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: C.surfaceLowest,
    borderRadius: 32,
    padding: 28,
    gap: 16,
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  headline: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurfaceVariant,
  },

  // ── DOB inputs ─────────────────────────────────────────────────────────────
  dobRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  dobLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.3,
    color: C.onSurface,
    paddingLeft: 4,
  },
  dobInput: {
    backgroundColor: C.surfaceContainer,
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 12,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18,
    color: C.onSurface,
    letterSpacing: 1,
  },
  errorText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    color: C.error,
    textAlign: 'center',
  },

  // ── CTA ────────────────────────────────────────────────────────────────────
  cta: {
    backgroundColor: C.primaryContainer,
    height: 56,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#994531',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.8,
    color: C.onPrimaryContainer,
    textTransform: 'uppercase',
  },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  privacyText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: C.outline,
    textAlign: 'center',
  },
  privacyLink: {
    fontFamily: 'NunitoSans_600SemiBold',
    color: C.tertiary,
    textDecorationLine: 'underline',
  },

  // ── Blocked view ───────────────────────────────────────────────────────────
  blockedCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: C.surfaceLowest,
    borderRadius: 32,
    padding: 32,
    gap: 16,
    alignItems: 'center',
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  blockedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedHeadline: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  blockedBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 23,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  blockedBodyItalic: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 15,
    lineHeight: 23,
    color: C.primary,
    textAlign: 'center',
  },
});

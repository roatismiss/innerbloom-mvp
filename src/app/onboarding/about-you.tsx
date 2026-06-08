import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ui as C } from '@/constants/palette';
import { track } from '../../lib/analytics';
import { useOnboardingDraft } from '../../store/onboarding-draft';
import type { Gender } from '../../types/database';

// Step 4 of 5 — optional gender, for inclusive personalization. Age is NOT asked
// here: it's derived from the date of birth the age gate already collected (see
// blooming.tsx). 4 options (incl. "Prefer not to say") — binary-only alienates
// users, including LGBTQ+ users in the PH pilot.

type Option = {
  key: Gender;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

const OPTIONS: Option[] = [
  { key: 'female',            label: 'Female',            icon: 'gender-female' },
  { key: 'male',              label: 'Male',              icon: 'gender-male' },
  { key: 'non_binary',        label: 'Non-binary',        icon: 'gender-non-binary' },
  { key: 'prefer_not_to_say', label: 'Prefer not to say', icon: 'account-outline' },
];

export default function OnboardingAboutYouScreen() {
  const insets = useSafeAreaInsets();
  const draftGender = useOnboardingDraft((s) => s.gender);
  const setDraftGender = useOnboardingDraft((s) => s.setGender);
  const [selected, setSelected] = useState<Gender | null>(draftGender);

  const handleSelect = (key: Gender) => {
    void Haptics.selectionAsync();
    // Tapping the active option clears it — the whole step is optional.
    setSelected((cur) => (cur === key ? null : key));
  };

  const handleContinue = () => {
    void Haptics.selectionAsync();
    setDraftGender(selected);
    // Funnel fact only — whether they answered, NOT the value. The gender value
    // is a person property set via identify() at commit, never an event prop.
    track('onboarding_step_completed', { step: 'about_you', provided: selected !== null });
    router.replace('/onboarding/name');
  };

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: '80%' }]} />
        </View>
        <View style={s.headerRow}>
          <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
            <MaterialCommunityIcons name="chevron-left" size={20} color={C.onSurfaceVariant} />
            <Text style={s.backLabel}>Back</Text>
          </Pressable>
          <Text style={s.stepLabel}>4 of 5</Text>
        </View>
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(60).springify()} style={s.heading}>
          <Text style={s.title}>A little about you</Text>
          <Text style={s.subtitle}>
            This helps us make InnerBloom feel like yours. It&apos;s optional, and
            only you ever see it.
          </Text>
        </Animated.View>

        <View style={s.list}>
          {OPTIONS.map((opt, i) => {
            const active = selected === opt.key;
            return (
              <Animated.View key={opt.key} entering={FadeInDown.delay(120 + i * 50).springify()}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={opt.label}
                  onPress={() => handleSelect(opt.key)}
                  style={({ pressed }) => [
                    s.card,
                    active && s.cardActive,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={[s.iconCircle, active && s.iconCircleActive]}>
                    <MaterialCommunityIcons
                      name={opt.icon}
                      size={22}
                      color={active ? C.onPrimaryContainer : C.primary}
                    />
                  </View>
                  <Text style={[s.cardLabel, active && s.cardLabelActive]}>{opt.label}</Text>
                  <View style={[s.radio, active && s.radioActive]}>
                    {active && <MaterialCommunityIcons name="check" size={14} color={C.onPrimaryContainer} />}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [s.cta, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          <Text style={s.ctaLabel}>{selected ? 'Continue' : 'Skip for now'}</Text>
          <MaterialCommunityIcons
            name={selected ? 'arrow-right' : 'chevron-right'}
            size={18}
            color={C.onPrimaryContainer}
          />
        </Pressable>
        <Text style={s.helperText}>You can change this anytime in settings</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Header
  header: { paddingHorizontal: 24, paddingBottom: 8, gap: 16 },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainer,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 9999, backgroundColor: C.primaryContainer },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 20, letterSpacing: 0.28, color: C.onSurfaceVariant,
  },
  stepLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 20, letterSpacing: 0.28, color: C.onSurfaceVariant,
  },

  // Content
  scroll: { paddingHorizontal: 24, paddingTop: 24 },
  heading: { marginBottom: 32 },
  title: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32, lineHeight: 40, letterSpacing: -0.32, color: C.primary, marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 18, lineHeight: 28, color: C.onSurfaceVariant,
  },

  // List
  list: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  cardActive: { backgroundColor: C.surfaceContainer, borderColor: C.primary },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircleActive: { backgroundColor: C.primaryContainer },
  cardLabel: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17, lineHeight: 24, color: C.onSurface,
  },
  cardLabelActive: { color: C.primary },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: C.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { backgroundColor: C.primaryContainer, borderColor: C.primaryContainer },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  cta: {
    width: '100%',
    maxWidth: 400,
    height: 56,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#994531',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase', color: C.onPrimaryContainer,
  },
  helperText: {
    marginTop: 16,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 20, letterSpacing: 0.28, color: C.outline,
  },
});

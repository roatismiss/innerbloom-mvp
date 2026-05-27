import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useOnboardingDraft } from '../../store/onboarding-draft';
import type { CheckinFrequency } from '../../types/database';

const C = {
  primary:                '#994531',
  primaryContainer:       '#e8836b',
  onPrimaryContainer:     '#641e0e',
  primaryFixed:           '#ffdad2',
  onPrimaryFixed:         '#3d0600',
  secondaryFixed:         '#90f2fc',
  onSecondaryFixed:       '#002022',
  tertiaryFixed:          '#ffd9e1',
  onTertiaryFixed:        '#3f001a',
  surface:                '#fff8f6',
  surfaceContainer:       '#ffe9e4',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainerHigh:   '#ffe2db',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
};

type FrequencyKey = 'daily' | 'weekly' | 'asNeeded';

// UI key → DB enum. The DB doesn't model 'weekly' literally — 'few_per_week'
// is the closest semantic match, leaving 'flexible' for the no-pressure path.
const FREQ_TO_DB: Record<FrequencyKey, CheckinFrequency> = {
  daily:    'daily',
  weekly:   'few_per_week',
  asNeeded: 'flexible',
};
const DB_TO_FREQ: Record<CheckinFrequency, FrequencyKey> = {
  daily:        'daily',
  few_per_week: 'weekly',
  flexible:     'asNeeded',
};

type Option = {
  id: FrequencyKey;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBg: string;
  iconColor: string;
};

const OPTIONS: Option[] = [
  {
    id: 'daily',
    title: 'Daily Check-ins',
    subtitle: 'Best for building lasting resilience',
    icon: 'calendar-month',
    iconBg: C.primaryFixed,
    iconColor: C.onPrimaryFixed,
  },
  {
    id: 'weekly',
    title: 'Weekly Reflections',
    subtitle: 'A slower pace for deep processing',
    icon: 'schedule',
    iconBg: C.secondaryFixed,
    iconColor: C.onSecondaryFixed,
  },
  {
    id: 'asNeeded',
    title: 'When I need it',
    subtitle: 'No pressure, just here for you',
    icon: 'favorite',
    iconBg: C.tertiaryFixed,
    iconColor: C.onTertiaryFixed,
  },
];

export default function OnboardingFrequencyScreen() {
  const insets = useSafeAreaInsets();
  const draftFrequency = useOnboardingDraft((s) => s.frequency);
  const setDraftFrequency = useOnboardingDraft((s) => s.setFrequency);
  const [selected, setSelected] = useState<FrequencyKey | null>(
    draftFrequency ? DB_TO_FREQ[draftFrequency] : null,
  );

  const handleSelect = (id: FrequencyKey) => {
    void Haptics.selectionAsync();
    setSelected(id);
  };

  const handleNext = () => {
    if (!selected) return;
    void Haptics.selectionAsync();
    setDraftFrequency(FREQ_TO_DB[selected]);
    router.replace('/onboarding/blooming');
  };

  const enabled = selected !== null;

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <MaterialIcons name="chevron-left" size={20} color={C.onSurfaceVariant} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
          <Text style={styles.stepLabel}>3 of 3</Text>
        </View>
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>How often should we check in?</Text>
          <Text style={styles.subtitle}>
            Gentle nudges to keep your blooming journey on track.
          </Text>
        </View>

        <View style={styles.cardList}>
          {OPTIONS.map((opt) => {
            const active = selected === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelect(opt.id)}
                style={({ pressed }) => [
                  styles.card,
                  active && styles.cardActive,
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: opt.iconBg }]}>
                  <MaterialIcons name={opt.icon} size={24} color={opt.iconColor} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{opt.title}</Text>
                  <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Decorative image */}
        <View style={styles.imageWrap}>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuBYfw4Dm4mlHRZoRybIritr9L_i1bb52iVB2xUV50g8dMfhA10NFdDrIw6rfQmuC-MQI38t9uREO9OKZ0j1IOHXTHwJBjBaiKBr4ADEqBV8IFtQtmUc4y6Mwg5cWiAdUSj7WCeLmyXAqctX3ECRrr0i8_XvLiTXWU5OayPY3e-jgNSycB8rYN5vbvvKTLWxdVf8fXFo4pNUd7swMxrP-kYkgVc5xDn92TgEI0EJHPuc37kEyKRRTdhO69s7SltRYxa1SalwINBLeQ',
            }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="overlay" x1="0" y1="1" x2="0" y2="0">
                  <Stop offset="0" stopColor={C.primary} stopOpacity={0.2} />
                  <Stop offset="1" stopColor={C.primary} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#overlay)" />
            </Svg>
          </View>
        </View>
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          disabled={!enabled}
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextBtn,
            !enabled && styles.nextBtnDisabled,
            pressed && enabled && { transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.nextLabel}>Next</Text>
        </Pressable>
        <Text style={styles.helperText}>You can change this anytime in settings</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 16,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainer,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: C.onSurfaceVariant,
  },
  stepLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: C.onSurfaceVariant,
  },

  // Scroll content
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // Heading
  heading: {
    marginBottom: 32,
  },
  title: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
    color: C.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 18,
    lineHeight: 28,
    color: C.onSurfaceVariant,
  },

  // Cards
  cardList: {
    gap: 16,
    marginBottom: 48,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    padding: 24,
    borderRadius: 24,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  cardActive: {
    backgroundColor: C.surfaceContainer,
    borderColor: C.primary,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    paddingTop: 2,
  },
  cardTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.onSurface,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: C.onSurfaceVariant,
  },

  // Decorative image
  imageWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 48,
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  nextBtn: {
    width: '100%',
    maxWidth: 400,
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.onPrimaryContainer,
  },
  helperText: {
    marginTop: 16,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: C.outline,
  },
});

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboardingDraft } from '../../store/onboarding-draft';

const C = {
  primary:               '#994531',
  primaryContainer:      '#e8836b',
  primaryFixed:          '#ffdad2',
  onPrimary:             '#ffffff',
  onPrimaryContainer:    '#641e0e',
  onPrimaryFixedVariant: '#7a2e1d',
  secondary:             '#006970',
  secondaryContainer:    '#90f2fc',
  onSecondaryContainer:  '#006f77',
  surface:               '#fff8f6',
  surfaceContainerLow:   '#fff1ed',
  surfaceContainer:      '#ffe9e4',
  surfaceContainerHigh:  '#ffe2db',
  surfaceVariant:        '#fadcd5',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
  outline:               '#88726d',
  outlineVariant:        '#dbc1bb',
};

type MoodKey = 'happy' | 'anxious' | 'sad' | 'stressed' | 'neutral';

const MOODS: {
  key: MoodKey;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}[] = [
  { key: 'happy',    label: 'Happy',    icon: 'emoticon-happy-outline'    },
  { key: 'anxious',  label: 'Anxious',  icon: 'emoticon-confused-outline' },
  { key: 'sad',      label: 'Sad',      icon: 'emoticon-sad-outline'      },
  { key: 'stressed', label: 'Stressed', icon: 'emoticon-cry-outline'      },
  { key: 'neutral',  label: 'Neutral',  icon: 'emoticon-neutral-outline'  },
];

export default function OnboardingMoodScreen() {
  const insets = useSafeAreaInsets();
  const draftMood = useOnboardingDraft((s) => s.mood);
  const setDraftMood = useOnboardingDraft((s) => s.setMood);
  const [selected, setSelected] = useState<MoodKey | null>(
    (draftMood as MoodKey | null) ?? null,
  );

  // Breathing blob behind illustration
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const blobScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const blobOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  const handleSelect = (key: MoodKey) => {
    void Haptics.selectionAsync();
    setSelected(key);
  };

  const handleNext = () => {
    if (!selected) return;
    void Haptics.selectionAsync();
    // The 5 UI mood keys are all valid EmotionCategory values (we just don't
    // surface 'hopeful' in onboarding — user can express that later).
    setDraftMood(selected);
    router.push('/onboarding/goals');
  };

  const enabled = selected !== null;

  return (
    <View style={styles.root}>
      {/* Progress bar (fixed top, 25% — step 1 of 4) */}
      <View style={[styles.progressTrack, { top: insets.top }]}>
        <View style={styles.progressFill} />
      </View>

      <View
        style={[
          styles.main,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 140 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="chevron-left" size={28} color={C.primary} />
          </Pressable>
          <Text style={styles.brand}>InnerBloom</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Illustration */}
        <View style={styles.illoWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.illoBlob,
              { transform: [{ scale: blobScale }], opacity: blobOpacity },
            ]}
          />
          <View style={styles.illoImageShadow}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0e3RKFf0Gs2BA9HGsFCy8RIGk4-l2y9AtdudyvYrAG-VmXzTckAr2F4ZeuHhTPboTquJJDLdWMXRqQ4-w6B_jWPk3fjPWhfd8fXUd2snT5oPFmkK2N4B0ht9cfzAZtHWYfDYqN4FfFB-oXUk_P8qWvN8Ig_cs7p6ruQzp8kCEcr_ED2oZ5l8yN_Q-SwpnPRWGU7guawicygoGyM0fin8hX6QBz0B06eIb6RkEDFJdgx4kyevaizSQEs-BIk_Xtg_1dHEzatPi1sZ4',
              }}
              style={styles.illoImage}
              contentFit="cover"
              transition={300}
            />
          </View>
        </View>

        {/* Typography */}
        <View style={styles.typoBlock}>
          <Text style={styles.title}>How are you feeling today?</Text>
          <Text style={styles.subtitle}>
            Check in with your inner self. Your current state helps us personalize your sanctuary.
          </Text>
        </View>

        {/* Mood row */}
        <View style={styles.moodRow}>
          {MOODS.map((mood) => {
            const active = selected === mood.key;
            return (
              <Pressable
                key={mood.key}
                onPress={() => handleSelect(mood.key)}
                style={({ pressed }) => [
                  styles.moodCard,
                  active && styles.moodCardActive,
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
              >
                <View style={[styles.moodCircle, active && styles.moodCircleActive]}>
                  <MaterialCommunityIcons
                    name={mood.icon}
                    size={26}
                    color={active ? C.onPrimaryContainer : C.secondary}
                  />
                </View>
                <Text style={[styles.moodLabel, active && styles.moodLabelActive]}>
                  {mood.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            !enabled && styles.ctaDisabled,
            pressed && enabled && styles.ctaPressed,
          ]}
          onPress={handleNext}
          disabled={!enabled}
        >
          <Text style={[styles.ctaLabel, !enabled && styles.ctaLabelDisabled]}>Next</Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={22}
            color={enabled ? C.onPrimary : 'rgba(255,255,255,0.55)'}
          />
        </Pressable>
        <Text style={styles.stepLabel}>Step 1 of 4</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Progress bar
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: C.surfaceContainerHigh,
    zIndex: 50,
  },
  progressFill: {
    width: '25%',
    height: 8,
    backgroundColor: C.primaryContainer,
  },

  main: {
    flex: 1,
    paddingHorizontal: 24,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },

  // Header
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnPressed: { backgroundColor: C.surfaceContainerLow },
  brand: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 28, color: C.primary,
  },
  headerSpacer: { width: 40 },

  // Illustration
  illoWrap: {
    width: '100%',
    aspectRatio: 1.6,
    maxHeight: 220,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  illoBlob: {
    position: 'absolute',
    width: '70%',
    height: '100%',
    borderRadius: 9999,
    backgroundColor: C.primaryFixed,
  },
  illoImageShadow: {
    width: '70%',
    height: '90%',
    borderRadius: 24,
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
    overflow: 'hidden',
  },
  illoImage: { width: '100%', height: '100%' },

  // Typography
  typoBlock: { marginBottom: 32 },
  title: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 28, lineHeight: 36, letterSpacing: -0.28,
    color: C.onSurface, marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16, lineHeight: 24, color: C.onSurfaceVariant,
  },

  // Mood row
  moodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moodCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodCardActive: {
    backgroundColor: C.surfaceContainer,
    borderColor: C.primary,
  },
  moodCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  moodCircleActive: {
    backgroundColor: C.primaryContainer,
  },
  moodLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16, letterSpacing: 0.1,
    color: C.onSurfaceVariant, textAlign: 'center',
  },
  moodLabelActive: {
    color: C.primary,
  },

  // Footer
  footer: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 48,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  cta: {
    width: '100%',
    maxWidth: 552,
    height: 56,
    borderRadius: 9999,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaPressed: {
    backgroundColor: C.onPrimaryFixedVariant,
    transform: [{ scale: 0.97 }],
  },
  ctaDisabled: {
    backgroundColor: C.outlineVariant,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16, lineHeight: 22, letterSpacing: 0.2,
    color: C.onPrimary,
  },
  ctaLabelDisabled: { color: 'rgba(255,255,255,0.55)' },
  stepLabel: {
    marginTop: 16,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 21,
    color: C.outline,
  },
});

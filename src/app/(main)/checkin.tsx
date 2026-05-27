import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_MOOD_INTENSITY, moodColor } from '../../lib/mood';
import { useSubmitMood, useTodayForMe } from '../../lib/queries/mood';
import { useMoodStore } from '../../store/mood';
import type { EmotionCategory } from '../../types';

const C = {
  surface:               '#fff8f6',
  surfaceContainerLowest:'#ffffff',
  surfaceContainerLow:   '#fff1ed',
  surfaceContainer:      '#ffe9e4',
  surfaceContainerHigh:  '#ffe2db',
  primary:               '#994531',
  primaryContainer:      '#e8836b',
  onPrimary:             '#ffffff',
  onPrimaryContainer:    '#641e0e',
  secondary:             '#006970',
  secondaryContainer:    '#90f2fc',
  outline:               '#88726d',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
} as const;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface MoodOption {
  key: EmotionCategory;
  label: string;
  icon: Mci;
}

const MOODS: MoodOption[] = [
  { key: 'happy',    label: 'Radiant', icon: 'emoticon-excited-outline'  },
  { key: 'hopeful',  label: 'Good',    icon: 'emoticon-happy-outline'    },
  { key: 'neutral',  label: 'Steady',  icon: 'emoticon-neutral-outline'  },
  { key: 'sad',      label: 'Tired',   icon: 'emoticon-sad-outline'      },
  { key: 'stressed', label: 'Low',     icon: 'emoticon-cry-outline'      },
];

export default function BloomCheckInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Local store still acts as the optimistic cache useSubmitMood updates
  // synchronously on tap. The server query is the source of truth when it
  // resolves; if both are set, prefer the more recent (Zustand) value.
  const localMood = useMoodStore((s) => s.todayMood);
  const serverData = useTodayForMe();
  const todayMood = localMood ?? (serverData.data?.mood
    ? {
        category: serverData.data.mood.category,
        intensity: serverData.data.mood.intensity,
        anchorWord: serverData.data.mood.anchor_word,
        colorHex: serverData.data.mood.color_hex,
      }
    : null);
  const submitMood = useSubmitMood();

  const locked = todayMood !== null;

  function handleMoodSelect(mood: MoodOption) {
    if (locked) return;
    void Haptics.selectionAsync();
    // Persist to DB; useSubmitMood's onMutate writes to the Zustand store
    // optimistically so the UI updates immediately even before the round trip.
    submitMood.mutate({
      category: mood.key,
      intensity: DEFAULT_MOOD_INTENSITY,
      anchor_word: mood.label,
      color_hex: moodColor[mood.key],
    });
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Animated.View entering={FadeInUp.springify()} style={s.header}>
        <Text style={s.eyebrow}>BLOOM</Text>
        <Text style={s.title}>Pause with me</Text>
        <Text style={s.subtitle}>
          {locked
            ? 'Your mood is logged for today. See you again tomorrow.'
            : 'A quiet moment to check in with how you really feel.'}
        </Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(80).springify()} style={s.card}>
          <Text style={s.cardHeading}>How are you blooming?</Text>
          <View style={s.moodRow} pointerEvents={locked ? 'none' : 'auto'}>
            {MOODS.map((m) => {
              const active = todayMood?.category === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[s.moodItem, locked && !active && { opacity: 0.35 }]}
                  onPress={() => handleMoodSelect(m)}
                  activeOpacity={locked ? 1 : 0.75}
                  disabled={locked}
                >
                  {active && <View style={s.moodRing} />}
                  <View style={[s.moodCircle, active && s.moodCircleActive]}>
                    <MaterialCommunityIcons
                      name={m.icon}
                      size={active ? 28 : 24}
                      color={active ? C.onPrimaryContainer : C.onSurfaceVariant}
                    />
                  </View>
                  <Text style={[s.moodLabel, active && s.moodLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {locked && (
            <View style={s.lockedBadge}>
              <MaterialCommunityIcons name="check-circle-outline" size={14} color={C.primary} />
              <Text style={s.lockedText}>Checked in · unlocks tomorrow</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <TouchableOpacity style={s.cta} activeOpacity={0.85} onPress={() => router.push('/(main)/ai-companion')}>
            <MaterialCommunityIcons name="message-outline" size={20} color={C.onPrimary} />
            <Text style={s.ctaText}>Talk to Bloom AI</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).springify()} style={s.section}>
          <Text style={s.sectionHeading}>Today's gentle practices</Text>
          {[
            { icon: 'weather-windy'    as Mci, title: 'Box breathing',   sub: '4 minutes to settle the nervous system.', route: '/(main)/breathing' },
            { icon: 'meditation'       as Mci, title: 'Body scan',        sub: 'Ground yourself from head to toe.',       route: null },
            { icon: 'notebook-outline' as Mci, title: 'Three tiny joys',  sub: 'Write a brief gratitude reflection.',     route: '/(main)/journal' },
          ].map((p) => (
            <TouchableOpacity key={p.title} style={s.practiceRow} activeOpacity={0.85} onPress={() => { if (p.route) router.push(p.route as any); }}>
              <View style={s.practiceIcon}>
                <MaterialCommunityIcons name={p.icon} size={22} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.practiceTitle}>{p.title}</Text>
                <Text style={s.practiceSub}>{p.sub}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 6,
  },
  eyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.primary,
    letterSpacing: 2,
  },
  title: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    color: C.onSurface,
    letterSpacing: -0.32,
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 22,
    color: C.onSurfaceVariant,
    marginTop: 4,
  },

  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 140,
    gap: 24,
  },

  card: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    ...softShadow,
  },
  cardHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 19,
    lineHeight: 26,
    color: C.onSurface,
    marginBottom: 24,
  },

  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  moodItem: { alignItems: 'center', gap: 8, position: 'relative' },
  moodRing: {
    position: 'absolute',
    top: -4,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(232,131,107,0.30)',
  },
  moodCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceContainer,
  },
  moodCircleActive: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primaryContainer,
  },
  moodLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  moodLabelActive: { color: C.primary },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    alignSelf: 'center',
  },
  lockedText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.primary,
    letterSpacing: 0.3,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.primary,
    paddingVertical: 18,
    borderRadius: 9999,
    shadowColor: C.primary,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  ctaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: C.onPrimary,
    letterSpacing: 0.3,
  },

  section: { gap: 12 },
  sectionHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: C.onSurface,
    marginBottom: 4,
  },
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    ...softShadow,
  },
  practiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(153,69,49,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  practiceSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
});

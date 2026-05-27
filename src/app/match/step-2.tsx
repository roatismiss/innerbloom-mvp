import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  type Step2StyleId,
  useSoulMatchDraft,
} from '../../store/soul-match-draft';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// ─── Design tokens (1:1 with design/soul-matching-quiz-step-2.html) ──────────
const C = {
  background:              '#fff8f6',
  surface:                 '#fff8f6',
  surfaceContainerLow:     '#fff1ed',
  surfaceContainer:        '#ffe9e4',
  surfaceContainerHigh:    '#ffe2db',
  surfaceContainerHighest: '#fadcd5',
  primary:                 '#994531',
  primaryContainer:        '#e8836b',
  onPrimaryContainer:      '#641e0e',
  onPrimary:               '#ffffff',
  onSurface:               '#281814',
  onBackground:            '#281814',
  onSurfaceVariant:        '#55433e',
  outline:                 '#88726d',
} as const;

const TOP_BAR_HEIGHT = 64;
const CARD_RADIUS = 32; // rounded-lg = 2rem.
const CONTAINER_PADDING = 24;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface QuizOption {
  id: string;
  icon: Mci;
  title: string;
  description: string;
}

const OPTIONS: QuizOption[] = [
  {
    id: 'deep-conversations',
    icon: 'forum',
    title: 'Deep Conversations',
    description: 'Exploring philosophical ideas and emotions.',
  },
  {
    id: 'shared-silence',
    icon: 'spa',
    title: 'Shared Silence',
    description: 'Feeling peace simply being in the same room.',
  },
  {
    id: 'daily-checkins',
    icon: 'book-clock',
    title: 'Daily Check-ins',
    description: 'Keeping in touch with small updates through the day.',
  },
  {
    id: 'spontaneous-moments',
    icon: 'auto-fix',
    title: 'Spontaneous Moments',
    description: 'Unplanned laughs and surprise interactions.',
  },
];

const DECORATIVE_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCEBWFy47AsKIWwdrjhWRMr3xcAVWTMT907C5rG2gUqkGDNz1DqHv20QR_iRFPtF5kJQNRcUu9sOxE-2tW5l6HjWs7zqCzapfeHChWjaajqYgiDczRXz02ZkswPyhW6ZaVnH_9lpP1xqxrcUc1QG8KJrwCwwCXDtRBqOlLqHnAFwzfyPgzfwMmgXfno04T0RUeEByMvKfmhJmkhws7JuryixRKb7fKuVJ7SXS2W7LClthMDvMOtdvu02xgb9_OzzpjBXeYxGgsUt1jg';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function QuizStep2Screen() {
  const insets = useSafeAreaInsets();
  const draftStyle = useSoulMatchDraft((s) => s.styleId);
  const setStyle = useSoulMatchDraft((s) => s.setStyle);
  const [selected, setSelected] = useState<Step2StyleId | null>(draftStyle);

  const handleSelect = (id: string) => {
    Haptics.selectionAsync();
    setSelected(id as Step2StyleId);
  };

  const handleContinue = () => {
    if (!selected) return;
    setStyle(selected);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/match/step-3');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + TOP_BAR_HEIGHT + 32,
            paddingBottom: Math.max(insets.bottom, 16) + 48,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProgressIndicator />

        <View style={styles.questionSection}>
          <Text style={styles.question}>Communication Style</Text>
          <Text style={styles.questionSubtitle}>
            How do you prefer to connect with your significant other?
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {OPTIONS.map((opt) => (
            <QuizOptionCard
              key={opt.id}
              option={opt}
              selected={selected === opt.id}
              onSelect={() => handleSelect(opt.id)}
            />
          ))}
        </View>

        <DecorativeImageCard />

        <View style={styles.actionBar}>
          <Pressable
            onPress={handleContinue}
            disabled={!selected}
            style={({ pressed }) => [
              styles.continueBtn,
              !selected && styles.continueBtnDisabled,
              pressed && selected && styles.continueBtnPressed,
            ]}
          >
            <Text style={styles.continueText}>Continue to Step 3</Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={C.onPrimaryContainer}
            />
          </Pressable>
          <Text style={styles.actionHelper}>
            You can always change your answers later.
          </Text>
        </View>
      </ScrollView>

      <TopBar topInset={insets.top} onBack={() => router.back()} />
    </View>
  );
}

// ─── Top bar (back + title + symmetry spacer) ────────────────────────────────

function TopBar({ topInset, onBack }: { topInset: number; onBack: () => void }) {
  return (
    <View
      style={[
        styles.topBar,
        { paddingTop: topInset, height: topInset + TOP_BAR_HEIGHT },
      ]}
    >
      <View style={styles.topBarInner}>
        <Pressable
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={C.primary} />
        </Pressable>
        <Text style={styles.topTitle}>Soul Match Quiz</Text>
        <View style={styles.topBarSpacer} />
      </View>
    </View>
  );
}

// ─── Progress indicator (Step 2 of 4 / 50% Complete + shimmer) ───────────────

function ProgressIndicator() {
  return (
    <View style={styles.progressSection}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.stepLabel}>STEP 2 OF 4</Text>
        <Text style={styles.percentLabel}>50% Complete</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={styles.progressFill}>
          <ProgressShimmer />
        </View>
      </View>
    </View>
  );
}

function ProgressShimmer() {
  const tx = useSharedValue(-100);

  useEffect(() => {
    tx.value = withRepeat(
      withTiming(100, { duration: 2000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [tx]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${tx.value}%` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.shimmerOverlay, animStyle]}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 12">
        <Defs>
          <LinearGradient id="shimGrad" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0"   stopColor="#ffffff" stopOpacity={0}   />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.4} />
            <Stop offset="1"   stopColor="#ffffff" stopOpacity={0}   />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={12} fill="url(#shimGrad)" />
      </Svg>
    </Animated.View>
  );
}

// ─── Quiz option card ────────────────────────────────────────────────────────

function QuizOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: QuizOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const titleColor = selected ? C.onPrimary : C.onSurface;
  const descColor = selected ? 'rgba(255,255,255,0.8)' : C.onSurfaceVariant;

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionCardSelected,
        pressed && styles.optionCardPressed,
      ]}
    >
      <View style={styles.optionLeft}>
        <View style={styles.optionIcon}>
          <MaterialCommunityIcons name={option.icon} size={24} color={C.primary} />
        </View>
        <View style={styles.optionTextWrap}>
          <Text style={[styles.optionTitle, { color: titleColor }]}>
            {option.title}
          </Text>
          <Text style={[styles.optionDescription, { color: descColor }]}>
            {option.description}
          </Text>
        </View>
      </View>
      {selected && (
        <MaterialCommunityIcons
          name="check-circle"
          size={24}
          color={C.onPrimary}
        />
      )}
    </Pressable>
  );
}

// ─── Decorative image card with bottom-aligned gradient quote ────────────────

function DecorativeImageCard() {
  return (
    <View style={styles.decorativeCard}>
      <Image
        source={{ uri: DECORATIVE_IMAGE_URL }}
        style={styles.decorativeImage}
        contentFit="cover"
        transition={300}
      />
      <View style={styles.decorativeOverlay} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="decorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%"   stopColor="#000000" stopOpacity={0}   />
              <Stop offset="100%" stopColor="#000000" stopOpacity={0.4} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#decorGrad)" />
        </Svg>
        <View style={styles.decorativeCaption}>
          <Text style={styles.decorativeQuote}>
            &ldquo;Connection is the energy that exists between people when they
            feel seen, heard, and valued.&rdquo;
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },

  scrollContent: {
    paddingHorizontal: CONTAINER_PADDING,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,248,246,0.80)',
    zIndex: 50,
  },
  topBarInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: CONTAINER_PADDING,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: C.surfaceContainerLow,
    transform: [{ scale: 0.95 }],
  },
  topTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.primary,
    fontWeight: '700',
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },

  // Progress section
  progressSection: {
    marginBottom: 32,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurfaceVariant,
    letterSpacing: 0.7, // uppercase tracking-wider ≈ 0.05em
    textTransform: 'uppercase',
  },
  percentLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.primary,
    fontWeight: '700',
    letterSpacing: 0.28,
  },
  progressTrack: {
    height: 12, // h-3 = 0.75rem
    width: '100%',
    borderRadius: 9999,
    backgroundColor: C.surfaceContainer,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '50%',
    backgroundColor: C.primaryContainer,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '100%',
  },

  // Question section
  questionSection: {
    marginBottom: 32,
  },
  question: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    color: C.onBackground,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.32,
  },
  questionSubtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 18,
    lineHeight: 29, // 1.6 × 18 ≈ 28.8
    color: C.onSurfaceVariant,
  },

  // Options container (space-y-stack-gap-md = 16)
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    width: '100%',
    padding: 24,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: CARD_RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  optionCardSelected: {
    backgroundColor: C.primaryContainer,
  },
  optionCardPressed: {
    transform: [{ scale: 0.96 }],
  },
  optionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },

  // Decorative card (h-48 = 192px)
  decorativeCard: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: C.surfaceContainer,
    height: 192,
    marginBottom: 32,
    position: 'relative',
  },
  decorativeImage: {
    width: '100%',
    height: '100%',
  },
  decorativeOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
  },
  decorativeCaption: {
    padding: 24,
  },
  decorativeQuote: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 20,
    color: '#ffffff',
    letterSpacing: 0.28,
  },

  // Action bar (flex-col gap-4 = 16)
  actionBar: {
    gap: 16,
  },
  // w-full py-5 (20 vertical) rounded-full bg-primary-container
  // text on-primary-container, font-headline-sm (20/28/600),
  // shadow [0px 8px 24px rgba(153,69,49,0.2)]
  continueBtn: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#994531',
        shadowOpacity: 0.20,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 6 },
    }),
  },
  continueBtnDisabled: {
    opacity: 0.5,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  continueBtnPressed: {
    transform: [{ scale: 0.95 }],
  },
  continueText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.onPrimaryContainer,
    fontWeight: '600',
  },
  // text-center font-body-sm text-outline (Quicksand 14/1.5/400; we use NunitoSans)
  actionHelper: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: C.outline,
    textAlign: 'center',
  },
});

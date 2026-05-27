import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useSoulMatchDraft } from '../../store/soul-match-draft';
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
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

// ─── Design tokens (1:1 with design/soul-matching-quiz-step-3.html) ──────────
const C = {
  surface:                 '#fff8f6',
  surfaceContainerLowest:  '#ffffff',
  surfaceContainerLow:     '#fff1ed',
  surfaceContainer:        '#ffe9e4',
  surfaceContainerHigh:    '#ffe2db',
  surfaceContainerHighest: '#fadcd5',
  primary:                 '#994531',
  primaryContainer:        '#e8836b',
  primaryFixed:            '#ffdad2',
  onPrimary:               '#ffffff',
  onPrimaryFixedVariant:   '#7a2e1d',
  secondaryContainer:      '#90f2fc',
  onSecondaryContainer:    '#006f77',
  secondaryFixed:          '#90f2fc',
  onSecondaryFixedVariant: '#004f55',
  tertiaryContainer:       '#fa719c',
  onTertiaryContainer:     '#700034',
  tertiaryFixed:           '#ffd9e1',
  onTertiaryFixedVariant:  '#881645',
  onSurface:               '#281814',
  onBackground:            '#281814',
  onSurfaceVariant:        '#55433e',
} as const;

const TOP_BAR_HEIGHT = 64;
const CARD_RADIUS = 32;
const CONTAINER_PADDING = 24;
const REQUIRED_SELECTIONS = 3;
const ORB_SIZE = 300;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Interest {
  id: string;
  title: string;
  description?: string;
  iconIdle: Mci;   // FILL 0
  iconActive: Mci; // FILL 1
  iconBg: string;
  iconColor: string;
}

const INTERESTS: Interest[] = [
  {
    id: 'mindfulness',
    title: 'Mindfulness',
    description: 'Daily presence and meditation',
    iconIdle: 'meditation',
    iconActive: 'meditation',
    iconBg: C.secondaryContainer,
    iconColor: C.onSecondaryContainer,
  },
  {
    id: 'creative-arts',
    title: 'Creative Arts',
    iconIdle: 'palette-outline',
    iconActive: 'palette',
    iconBg: C.tertiaryContainer,
    iconColor: C.onTertiaryContainer,
  },
  {
    id: 'career-growth',
    title: 'Career Growth',
    iconIdle: 'trending-up',
    iconActive: 'trending-up',
    iconBg: C.primaryFixed,
    iconColor: C.onPrimaryFixedVariant,
  },
  {
    id: 'nature',
    title: 'Nature',
    iconIdle: 'forest-outline',
    iconActive: 'forest',
    iconBg: C.secondaryFixed,
    iconColor: C.onSecondaryFixedVariant,
  },
  {
    id: 'philosophy',
    title: 'Philosophy',
    iconIdle: 'book-clock-outline',
    iconActive: 'book-clock',
    iconBg: C.tertiaryFixed,
    iconColor: C.onTertiaryFixedVariant,
  },
  {
    id: 'mental-health',
    title: 'Mental Health Advocacy',
    description: 'Spreading awareness and care',
    iconIdle: 'heart-outline',
    iconActive: 'heart',
    iconBg: C.secondaryContainer,
    iconColor: C.onSecondaryContainer,
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function QuizStep3Screen() {
  const insets = useSafeAreaInsets();
  const draftInterests = useSoulMatchDraft((s) => s.interests);
  const setInterests = useSoulMatchDraft((s) => s.setInterests);
  const [selected, setSelected] = useState<Set<string>>(new Set(draftInterests));

  const toggle = (id: string) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const remaining = REQUIRED_SELECTIONS - selected.size;
  const canContinue = remaining <= 0;
  const continueLabel = canContinue
    ? 'Continue to Final Step'
    : remaining === 1
      ? 'Select 1 more interest'
      : `Select ${remaining} more interests`;

  const handleContinue = () => {
    if (!canContinue) return;
    setInterests(Array.from(selected));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/match/step-4');
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    // Persist whatever's selected even if below the threshold — openness_level
    // will derive from the count downstream.
    setInterests(Array.from(selected));
    router.push('/match/step-4');
  };

  // Asymmetric bento: hero, [half/half], [half/half], hero
  const [hero1, half1, half2, half3, half4, hero2] = INTERESTS;

  return (
    <View style={styles.root}>
      <FloatingOrbs />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + TOP_BAR_HEIGHT + 32,
            paddingBottom: Math.max(insets.bottom, 16) + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProgressIndicator />

        <View style={styles.questionSection}>
          <Text style={styles.question}>
            What topics resonate with you most right now?
          </Text>
          <Text style={styles.questionSubtitle}>
            Select at least three interests to help us find your perfect
            community matches.
          </Text>
        </View>

        <View style={styles.grid}>
          <InterestCard
            interest={hero1}
            variant="full"
            selected={selected.has(hero1.id)}
            onToggle={() => toggle(hero1.id)}
          />
          <View style={styles.halfRow}>
            <InterestCard
              interest={half1}
              variant="half"
              selected={selected.has(half1.id)}
              onToggle={() => toggle(half1.id)}
            />
            <InterestCard
              interest={half2}
              variant="half"
              selected={selected.has(half2.id)}
              onToggle={() => toggle(half2.id)}
            />
          </View>
          <View style={styles.halfRow}>
            <InterestCard
              interest={half3}
              variant="half"
              selected={selected.has(half3.id)}
              onToggle={() => toggle(half3.id)}
            />
            <InterestCard
              interest={half4}
              variant="half"
              selected={selected.has(half4.id)}
              onToggle={() => toggle(half4.id)}
            />
          </View>
          <InterestCard
            interest={hero2}
            variant="full"
            selected={selected.has(hero2.id)}
            onToggle={() => toggle(hero2.id)}
          />
        </View>

        <View style={styles.actionArea}>
          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.continueBtn,
              !canContinue && styles.continueBtnDisabled,
              pressed && canContinue && styles.continueBtnPressed,
            ]}
          >
            <Text style={styles.continueText}>{continueLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <TopBar topInset={insets.top} onBack={() => router.back()} />

      <HelpPill bottomInset={insets.bottom} onSkip={handleSkip} />
    </View>
  );
}

// ─── Floating orbs ───────────────────────────────────────────────────────────

function FloatingOrbs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <FloatingOrb
        gradientId="orbGradTr"
        startPosition={{ top: -100, right: -50 }}
        reverse={false}
      />
      <FloatingOrb
        gradientId="orbGradBl"
        startPosition={{ bottom: -50, left: -100 }}
        reverse
      />
    </View>
  );
}

function FloatingOrb({
  gradientId,
  startPosition,
  reverse,
}: {
  gradientId: string;
  startPosition: { top?: number; right?: number; bottom?: number; left?: number };
  reverse: boolean;
}) {
  // Orb 1: (0,0) → (40,60) alternate. Orb 2: starts at (40,60) → (0,0) alternate
  // (mimics CSS animation-delay: -5s by inverting the starting phase).
  const tx = useSharedValue(reverse ? 40 : 0);
  const ty = useSharedValue(reverse ? 60 : 0);

  useEffect(() => {
    tx.value = withRepeat(
      withTiming(reverse ? 0 : 40, {
        duration: 20000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    ty.value = withRepeat(
      withTiming(reverse ? 0 : 60, {
        duration: 20000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [reverse, tx, ty]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.orb, startPosition, animStyle]}
    >
      <Svg width={ORB_SIZE} height={ORB_SIZE}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%"   stopColor="rgb(250,113,156)" stopOpacity={0.10} />
            <Stop offset="70%"  stopColor="rgb(255,255,255)" stopOpacity={0}    />
            <Stop offset="100%" stopColor="rgb(255,255,255)" stopOpacity={0}    />
          </RadialGradient>
        </Defs>
        <Circle cx={ORB_SIZE / 2} cy={ORB_SIZE / 2} r={ORB_SIZE / 2} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

// ─── Top bar ─────────────────────────────────────────────────────────────────

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
          <MaterialCommunityIcons name="arrow-left" size={24} color={C.primary} />
        </Pressable>
        <Text style={styles.topTitle}>Soul Match Quiz</Text>
        <View style={styles.topBarSpacer} />
      </View>
    </View>
  );
}

// ─── Progress (bouncy bloom from 0 → 75% on mount) ───────────────────────────

function ProgressIndicator() {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(75, {
      duration: 1000,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1), // .progress-bloom
    });
  }, [width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.stepLabel}>Step 3 of 4</Text>
        <Text style={styles.percentLabel}>75% complete</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, fillStyle]} />
      </View>
    </View>
  );
}

// ─── Interest cards (full or half variant) ───────────────────────────────────

function InterestCard({
  interest,
  variant,
  selected,
  onToggle,
}: {
  interest: Interest;
  variant: 'full' | 'half';
  selected: boolean;
  onToggle: () => void;
}) {
  const iconName = selected ? interest.iconActive : interest.iconIdle;
  const titleColor = selected ? C.onPrimary : C.onSurface;
  const descColor = selected
    ? 'rgba(255,255,255,0.70)'
    : 'rgba(40,24,20,0.70)';

  if (variant === 'full') {
    return (
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.cardBase,
          styles.cardFull,
          selected && styles.cardSelected,
          pressed && !selected && styles.cardPressed,
        ]}
      >
        <View style={[styles.iconCircleLg, { backgroundColor: interest.iconBg }]}>
          <MaterialCommunityIcons
            name={iconName}
            size={24}
            color={interest.iconColor}
          />
        </View>
        <View style={styles.fullText}>
          <Text style={[styles.fullTitle, { color: titleColor }]}>
            {interest.title}
          </Text>
          {interest.description ? (
            <Text style={[styles.fullDescription, { color: descColor }]}>
              {interest.description}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.cardBase,
        styles.cardHalf,
        selected && styles.cardSelected,
        pressed && !selected && styles.cardPressed,
      ]}
    >
      <View style={[styles.iconCircleSm, { backgroundColor: interest.iconBg }]}>
        <MaterialCommunityIcons
          name={iconName}
          size={20}
          color={interest.iconColor}
        />
      </View>
      <Text style={[styles.halfLabel, { color: titleColor }]}>
        {interest.title}
      </Text>
    </Pressable>
  );
}

// ─── Help pill (Need help? Skip for now) ─────────────────────────────────────

function HelpPill({
  bottomInset,
  onSkip,
}: {
  bottomInset: number;
  onSkip: () => void;
}) {
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.helpPillContainer,
        { bottom: Math.max(bottomInset + 16, 32) },
      ]}
    >
      <View style={styles.helpPill}>
        <Text style={styles.helpPillText}>Need help? </Text>
        <Pressable onPress={onSkip} hitSlop={6}>
          <Text style={styles.helpPillLink}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },
  scrollContent: {
    paddingHorizontal: CONTAINER_PADDING,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },

  // Floating orbs (300×300, radial pink → transparent)
  orb: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
  },

  // Top bar (glass, 64px, headline-md primary title)
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
    fontSize: 24,
    lineHeight: 32,
    color: C.primary,
    fontWeight: '700',
  },
  topBarSpacer: { width: 40, height: 40 },

  // Progress (taller track on surface-container-high, primary-container fill, bouncy)
  progressSection: {
    marginBottom: 32,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  stepLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.primary,
    fontWeight: '700',
    letterSpacing: 0.28,
  },
  percentLabel: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurfaceVariant,
    letterSpacing: 0.28,
  },
  progressTrack: {
    height: 12,
    width: '100%',
    borderRadius: 9999,
    backgroundColor: C.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primaryContainer,
  },

  // Question
  questionSection: {
    marginBottom: 32,
  },
  question: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    color: C.onBackground,
    fontWeight: '700',
    letterSpacing: -0.32,
    marginBottom: 16,
  },
  questionSubtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: C.onSurfaceVariant,
  },

  // Grid
  grid: {
    gap: 16,
    marginBottom: 32,
  },
  halfRow: {
    flexDirection: 'row',
    gap: 16,
  },

  // Cards
  cardBase: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: CARD_RADIUS,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#5c4742',
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 3 },
    }),
  },
  cardFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardHalf: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 16,
    minHeight: 132, // keep half-cards balanced even with single-line labels
  },
  cardSelected: {
    backgroundColor: C.primaryContainer,
    transform: [{ scale: 0.95 }],
  },
  cardPressed: {
    backgroundColor: C.surfaceContainer,
  },
  iconCircleLg: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleSm: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullText: {
    flex: 1,
  },
  fullTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  fullDescription: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 2,
  },
  halfLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.28,
  },

  // Action (bg-primary, py-4 px-6 = 16/24, rounded-full, shadow-lg)
  actionArea: {
    marginTop: 16,
  },
  continueBtn: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 9999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
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
    color: C.onPrimary,
    fontWeight: '600',
  },

  // Help pill (floating glass, "Need help? Skip for now")
  helpPillContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 40,
  },
  helpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#5c4742',
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 4 },
    }),
  },
  helpPillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurfaceVariant,
    letterSpacing: 0.28,
  },
  helpPillLink: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.primary,
    textDecorationLine: 'underline',
    letterSpacing: 0.28,
  },
});

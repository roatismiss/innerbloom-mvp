import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSubmitSoulMatchQuiz } from '../../lib/queries/match';
import {
  draftToPayload,
  type Step4GoalId,
  useSoulMatchDraft,
} from '../../store/soul-match-draft';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// ─── Design tokens (1:1 with design/soul-matching-quiz-step-4.html) ──────────
const C = {
  surface:                 '#fff8f6',
  surfaceContainerLow:     '#fff1ed',
  surfaceContainer:        '#ffe9e4',
  surfaceContainerHigh:    '#ffe2db',
  surfaceContainerHighest: '#fadcd5',
  primary:                 '#994531',
  primaryContainer:        '#e8836b',
  primaryFixed:            '#ffdad2',
  onPrimary:               '#ffffff',
  onPrimaryContainer:      '#641e0e',
  secondary:               '#006970',
  secondaryContainer:      '#90f2fc',
  tertiary:                '#a8315c',
  tertiaryContainer:       '#fa719c',
  onSurface:               '#281814',
  onSurfaceVariant:        '#55433e',
  outline:                 '#88726d',
} as const;

const TOP_BAR_HEIGHT = 64;
const CARD_RADIUS = 32;
const CONTAINER_PADDING = 24;
const MAX_CONTENT_W = 512; // Tailwind max-w-lg = 32rem

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface GoalOption {
  id: string;
  icon: Mci;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
}

const OPTIONS: GoalOption[] = [
  {
    id: 'mutual-support',
    icon: 'heart-outline',
    title: 'Mutual Support',
    description: 'Emotional safety and gentle encouragement.',
    iconBg: C.surfaceContainerHigh,
    iconColor: C.primary,
  },
  {
    id: 'shared-learning',
    icon: 'book-open-page-variant-outline',
    title: 'Shared Learning',
    description: 'Growing together through books and dialogue.',
    iconBg: 'rgba(144,242,252,0.30)', // secondary-container/30
    iconColor: C.secondary,
  },
  {
    id: 'accountability',
    icon: 'lightning-bolt-outline',
    title: 'Accountability Partner',
    description: 'Keeping each other focused on personal goals.',
    iconBg: 'rgba(250,113,156,0.20)', // tertiary-container/20
    iconColor: C.tertiary,
  },
  {
    id: 'friendly',
    icon: 'emoticon-happy-outline',
    title: 'Friendly Presence',
    description: 'Low-pressure friendship and warm company.',
    iconBg: C.surfaceContainerHighest,
    iconColor: C.onSurfaceVariant,
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function QuizStep4Screen() {
  const insets = useSafeAreaInsets();
  const draftGoal = useSoulMatchDraft((s) => s.goalId);
  const setGoal = useSoulMatchDraft((s) => s.setGoal);
  const draft = useSoulMatchDraft();
  const [selected, setSelected] = useState<Step4GoalId | null>(draftGoal);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitQuiz = useSubmitSoulMatchQuiz();

  const handleSelect = (id: string) => {
    Haptics.selectionAsync();
    setSelected((prev) => (prev === id ? null : (id as Step4GoalId)));
  };

  const handleFind = async () => {
    if (!selected || submitQuiz.isPending) return;
    setSubmitError(null);

    setGoal(selected);
    // Build payload from latest draft + this goal (state updates are async,
    // so we synthesize the final shape locally).
    const payload = draftToPayload({ ...draft, goalId: selected } as never);
    if (!payload) {
      setSubmitError('Please complete the earlier steps before finishing.');
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await submitQuiz.mutateAsync(payload);
      router.push('/match/finding');
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Could not save your answers — please try again.',
      );
    }
  };

  const handleClose = () => {
    Haptics.selectionAsync();
    router.replace('/(main)/dashboard');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + TOP_BAR_HEIGHT + 32,
            // footer pt-12 (48) + button h-16 (64) + pb-8 (32) + safe area + buffer
            paddingBottom: 48 + 64 + 32 + Math.max(insets.bottom, 16) + 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProgressIndicator />

        <View style={styles.questionSection}>
          <Text style={styles.question}>
            What is your primary goal for this connection?
          </Text>
          <Text style={styles.questionSubtitle}>
            This helps us find the most compatible souls who share your
            intentions for growth and connection.
          </Text>
        </View>

        <View style={styles.optionsGrid}>
          {OPTIONS.map((opt) => (
            <GoalOptionCard
              key={opt.id}
              option={opt}
              selected={selected === opt.id}
              onSelect={() => handleSelect(opt.id)}
            />
          ))}
        </View>

        <DecorativeBlob />
      </ScrollView>

      <TopBar
        topInset={insets.top}
        onBack={() => router.back()}
        onClose={handleClose}
      />

      <Footer
        bottomInset={insets.bottom}
        enabled={selected !== null && !submitQuiz.isPending}
        loading={submitQuiz.isPending}
        error={submitError}
        onPress={handleFind}
      />
    </View>
  );
}

// ─── Top bar (back + title + close) ──────────────────────────────────────────

function TopBar({
  topInset,
  onBack,
  onClose,
}: {
  topInset: number;
  onBack: () => void;
  onClose: () => void;
}) {
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
        <Pressable
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        >
          <MaterialCommunityIcons name="close" size={24} color={C.onSurfaceVariant} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Progress (6px track, animates 0→100% with overshoot bezier 1.5s) ────────

function ProgressIndicator() {
  const width = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      width.value = withTiming(100, {
        duration: 1500,
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
      });
    }, 300);
    return () => clearTimeout(t);
  }, [width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.stepLabel}>Step 4 of 4</Text>
        <Text style={styles.percentLabel}>100%</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, fillStyle]} />
      </View>
    </View>
  );
}

// ─── Option card (single-select, subtle primary-fixed selection state) ──────

function GoalOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: GoalOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionCardSelected,
        pressed && styles.optionCardPressed,
      ]}
    >
      <View style={[styles.optionIcon, { backgroundColor: option.iconBg }]}>
        <MaterialCommunityIcons
          name={option.icon}
          size={24}
          color={option.iconColor}
        />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{option.title}</Text>
        <Text style={styles.optionDescription}>{option.description}</Text>
      </View>
      {selected && (
        <MaterialCommunityIcons
          name="check-circle"
          size={24}
          color={C.primary}
        />
      )}
    </Pressable>
  );
}

// ─── Decorative pulsing blob (128×128 linear gradient + opacity pulse) ──────

function DecorativeBlob() {
  const innerOpacity = useSharedValue(1);

  useEffect(() => {
    innerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,   { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [innerOpacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: innerOpacity.value }));

  return (
    <View style={styles.decorativeWrap}>
      <Animated.View style={[styles.decorativeInner, animStyle]}>
        <Svg width={128} height={128}>
          <Defs>
            <LinearGradient id="blobGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%"   stopColor="rgb(232,131,107)" stopOpacity={0.2} />
              <Stop offset="100%" stopColor="rgb(144,242,252)" stopOpacity={0.2} />
            </LinearGradient>
          </Defs>
          <Circle cx={64} cy={64} r={64} fill="url(#blobGrad)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Footer (gradient fade + CTA "Find My Kindred Spirits") ──────────────────

function Footer({
  bottomInset,
  enabled,
  loading,
  error,
  onPress,
}: {
  bottomInset: number;
  enabled: boolean;
  loading: boolean;
  error: string | null;
  onPress: () => void;
}) {
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.footer,
        { paddingBottom: Math.max(bottomInset, 16) + 16 },
      ]}
    >
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="footerFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%"   stopColor="rgb(255,248,246)" stopOpacity={0} />
            <Stop offset="50%"  stopColor="rgb(255,248,246)" stopOpacity={1} />
            <Stop offset="100%" stopColor="rgb(255,248,246)" stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#footerFade)" />
      </Svg>

      <View style={styles.footerContent}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
        <Pressable
          onPress={onPress}
          disabled={!enabled}
          style={({ pressed }) => [
            styles.ctaBtn,
            !enabled && styles.ctaBtnDisabled,
            pressed && enabled && styles.ctaBtnPressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={C.onPrimaryContainer} />
          ) : (
            <>
              <Text style={styles.ctaText}>Find My Kindred Spirits</Text>
              <MaterialCommunityIcons
                name="auto-fix"
                size={20}
                color={C.onPrimaryContainer}
              />
            </>
          )}
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
    maxWidth: MAX_CONTENT_W,
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
    width: 40, height: 40,
    borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: C.surfaceContainerLow,
    transform: [{ scale: 0.95 }],
  },
  topTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 28,
    color: C.primary, fontWeight: '700',
  },

  // Progress
  progressSection: {
    marginTop: 0,
    marginBottom: 40,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  stepLabel: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 20,
    color: C.onSurfaceVariant,
    letterSpacing: 0.28,
  },
  percentLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 28,
    color: C.primary,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    width: '100%',
    borderRadius: 9999,
    backgroundColor: C.surfaceContainer,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primaryContainer,
  },

  // Question
  questionSection: {
    marginBottom: 40,
  },
  question: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32, lineHeight: 40,
    color: C.onSurface, fontWeight: '700',
    letterSpacing: -0.32,
    marginBottom: 16,
  },
  questionSubtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16, lineHeight: 26,
    color: C.onSurfaceVariant,
  },

  // Options
  optionsGrid: { gap: 16 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: CARD_RADIUS,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#5c4742',
        shadowOpacity: 0.08, shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 3 },
    }),
  },
  optionCardSelected: {
    backgroundColor: C.primaryFixed,
    borderColor: C.primaryContainer,
  },
  optionCardPressed: {
    transform: [{ scale: 0.96 }],
  },
  optionIcon: {
    width: 48, height: 48,
    borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  optionText: { flex: 1 },
  optionTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 28,
    color: C.onSurface, fontWeight: '600',
  },
  optionDescription: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 21,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },

  // Decorative blob
  decorativeWrap: {
    marginTop: 48,
    alignItems: 'center',
    opacity: 0.4,
  },
  decorativeInner: {
    width: 128, height: 128,
    alignItems: 'center', justifyContent: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: CONTAINER_PADDING,
    paddingTop: 48,
    zIndex: 40,
  },
  footerContent: {
    maxWidth: MAX_CONTENT_W,
    width: '100%',
    alignSelf: 'center',
  },
  ctaBtn: {
    width: '100%',
    height: 64,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.15, shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 6 },
    }),
  },
  ctaBtnDisabled: {
    opacity: 0.5,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  ctaBtnPressed: {
    transform: [{ scale: 0.95 }],
  },
  ctaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 28,
    color: C.onPrimaryContainer,
    fontWeight: '600',
  },
  errorText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: '#ba1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
});

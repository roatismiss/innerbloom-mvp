import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';

import {
  type Step1EnergyId,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Design tokens (1:1 with design/soul-matching-quiz-step-1.html) ──────────
const C = {
  surface:                 '#fff8f6',
  surfaceContainerLow:     '#fff1ed',
  surfaceContainer:        '#ffe9e4',
  surfaceContainerHigh:    '#ffe2db',
  surfaceContainerHighest: '#fadcd5',
  primary:                 '#994531',
  primaryFixed:            '#ffdad2',
  onPrimary:               '#ffffff',
  onPrimaryFixedVariant:   '#7a2e1d',
  secondaryContainer:      '#90f2fc',
  onSecondaryContainer:    '#006f77',
  secondaryFixed:          '#90f2fc',
  onSecondaryFixedVariant: '#004f55',
  tertiaryFixed:           '#ffd9e1',
  onTertiaryFixedVariant:  '#881645',
  onSurface:               '#281814',
  onSurfaceVariant:        '#55433e',
  outline:                 '#88726d',
} as const;

const TOP_BAR_HEIGHT = 64;
const CARD_RADIUS = 32; // Tailwind `rounded-lg` = 2rem in this design's config.
const CONTAINER_PADDING = 24;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface QuizOption {
  id: string;
  icon: Mci;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
}

const OPTIONS: QuizOption[] = [
  {
    id: 'radiant',
    icon: 'white-balance-sunny',
    title: 'Radiant & Social',
    description: 'Feeling vibrant and ready to connect with others.',
    iconBg: C.secondaryContainer,
    iconColor: C.onSecondaryContainer,
  },
  {
    id: 'quiet',
    icon: 'weather-night',
    title: 'Quiet & Reflective',
    description: 'Turning inward for peace and gentle observation.',
    iconBg: C.tertiaryFixed,
    iconColor: C.onTertiaryFixedVariant,
  },
  {
    id: 'healing',
    icon: 'meditation',
    title: 'Healing & Introspective',
    description: 'Focusing on personal growth and emotional mending.',
    iconBg: C.primaryFixed,
    iconColor: C.onPrimaryFixedVariant,
  },
  {
    id: 'inspired',
    icon: 'auto-fix',
    title: 'Seeking Inspiration',
    description: 'Open to new ideas, beauty, and creative sparks.',
    iconBg: C.secondaryFixed,
    iconColor: C.onSecondaryFixedVariant,
  },
];

const DECORATIVE_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA4hZ3zTeoAwPYkGJsGsRSDLDVoGG0ZJ0b8zp8SRJUFz-jde0S2enhUN8EUoE-tv2STDexVySCs0kPfGMADpGRN6IasOSzJaye6pdq70kylFsmyihNLaN0kvCu1g11kNvJXtKt1tuDaPMYE4nrXQiGgrx1-Lp9DjjbcphhXIaS0KOftd6rtadcx9J5uORrXkkRlQROE1kSU6ZXeqqz-D780sldkWOXYE6F6W4bgFP8E1nH_Bkc2e43L3LGOkJfRP86fh0kR7j-oyo0S';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function QuizStep1Screen() {
  const insets = useSafeAreaInsets();
  const draftEnergy = useSoulMatchDraft((s) => s.energyId);
  const setEnergy = useSoulMatchDraft((s) => s.setEnergy);
  const resetDraft = useSoulMatchDraft((s) => s.reset);
  const [selected, setSelected] = useState<Step1EnergyId | null>(draftEnergy);

  const handleSelect = (id: string) => {
    Haptics.selectionAsync();
    setSelected(id as Step1EnergyId);
  };

  const handleContinue = () => {
    if (!selected) return;
    // Fresh quiz session — clear any stale draft from a previous run, then
    // re-stamp this step's answer.
    if (!draftEnergy) resetDraft();
    setEnergy(selected);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/match/step-2');
  };

  const handleClose = () => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/(main)/dashboard');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + TOP_BAR_HEIGHT + 32,
            paddingBottom: 24 + 56 + 16 + 20 + insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProgressSection />

        <View style={styles.questionSection}>
          <Text style={styles.question}>
            How would you describe your current emotional energy?
          </Text>
          <Text style={styles.questionSubtitle}>
            Take a deep breath. There are no wrong answers, only your unique
            truth in this moment.
          </Text>
        </View>

        <View style={styles.optionsGrid}>
          {OPTIONS.map((opt) => (
            <QuizOptionCard
              key={opt.id}
              option={opt}
              selected={selected === opt.id}
              onSelect={() => handleSelect(opt.id)}
            />
          ))}
        </View>

        <DecorativeCard />
      </ScrollView>

      <TopBar
        topInset={insets.top}
        onBack={() => router.back()}
        onClose={handleClose}
      />

      <FooterCTA
        bottomInset={insets.bottom}
        enabled={selected !== null}
        onPress={handleContinue}
      />
    </View>
  );
}

// ─── Top bar ─────────────────────────────────────────────────────────────────

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
          <MaterialCommunityIcons name="close" size={24} color={C.primary} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Progress section ────────────────────────────────────────────────────────

function ProgressSection() {
  return (
    <View style={styles.progressSection}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.stepLabel}>Step 1 of 4</Text>
        <Text style={styles.percentLabel}>25%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>
    </View>
  );
}

// ─── Question option card ────────────────────────────────────────────────────

function QuizOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: QuizOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.optionCard,
        pressed && !selected && styles.optionCardPressed,
        selected && styles.optionCardSelected,
      ]}
    >
      <View style={[styles.optionIcon, { backgroundColor: option.iconBg }]}>
        <MaterialCommunityIcons
          name={option.icon}
          size={24}
          color={option.iconColor}
        />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{option.title}</Text>
        <Text style={styles.optionDescription}>{option.description}</Text>
      </View>
    </Pressable>
  );
}

// ─── Decorative quote card ───────────────────────────────────────────────────

function DecorativeCard() {
  return (
    <View style={styles.decorativeCard}>
      <Image
        source={{ uri: DECORATIVE_IMAGE_URL }}
        style={styles.decorativeImage}
        contentFit="cover"
        transition={300}
      />
      <Text style={styles.decorativeQuote}>
        &ldquo;Your energy is your unique signature today.&rdquo;
      </Text>
    </View>
  );
}

// ─── Footer (Continue + helper) ──────────────────────────────────────────────

function FooterCTA({
  bottomInset,
  enabled,
  onPress,
}: {
  bottomInset: number;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: Math.max(bottomInset, 16) + 8 },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={!enabled}
        style={({ pressed }) => [
          styles.continueBtn,
          !enabled && styles.continueBtnDisabled,
          pressed && enabled && styles.continueBtnPressed,
        ]}
      >
        <Text style={styles.continueText}>Continue</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color={C.onPrimary} />
      </Pressable>
      <Text style={styles.footerHelper}>
        You can update your energy profile anytime
      </Text>
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

  // Progress section (mb-stack-gap-lg = 32)
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
    letterSpacing: 0.28, // 0.02em at 14px
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
    height: 8,
    width: '100%',
    borderRadius: 9999,
    backgroundColor: C.surfaceContainer,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '25%',
    borderRadius: 9999,
    backgroundColor: C.primary,
    // .progress-glow { box-shadow: 0 0 12px rgba(153, 69, 49, 0.3) }
    ...Platform.select({
      ios: {
        shadowColor: '#994531',
        shadowOpacity: 0.30,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 4 },
    }),
  },

  // Question section (mb-stack-gap-lg = 32, h2 with mb-stack-gap-sm = 8)
  questionSection: {
    marginBottom: 32,
  },
  question: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40, // tight ≈ 1.25
    color: C.onSurface,
    fontWeight: '700',
    letterSpacing: -0.32, // -0.01em at 32px
    marginBottom: 8,
  },
  questionSubtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 26, // 1.6 * 16 ≈ 25.6
    color: C.onSurfaceVariant,
  },

  // Options grid (gap-stack-gap-md = 16)
  optionsGrid: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: CARD_RADIUS,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    // shadow-[0px_8px_24px_rgba(92,71,66,0.08)]
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
  optionCardPressed: {
    backgroundColor: C.surfaceContainer,
  },
  optionCardSelected: {
    borderColor: C.primary,
    backgroundColor: C.surfaceContainer,
    transform: [{ scale: 1.02 }],
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.onSurface,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: C.onSurfaceVariant,
  },

  // Decorative card (mt-stack-gap-lg = 32, p-6 = 24, rounded-lg = 32,
  // bg-surface-container-highest/30 = #fadcd5 at 30% opacity)
  decorativeCard: {
    marginTop: 32,
    padding: 24,
    backgroundColor: 'rgba(250,220,213,0.30)',
    borderRadius: CARD_RADIUS,
    alignItems: 'center',
  },
  decorativeImage: {
    width: 128,
    height: 128,
    borderRadius: 9999,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: C.surfaceContainerHigh,
    ...Platform.select({
      ios: {
        shadowColor: '#5c4742',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 6 },
    }),
  },
  decorativeQuote: {
    fontFamily: 'NunitoSans_400Regular',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 21,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },

  // Footer (p-container-padding = 24, gap-4 = 16, bg-surface/90)
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,248,246,0.92)',
    paddingHorizontal: CONTAINER_PADDING,
    paddingTop: CONTAINER_PADDING,
    gap: 16,
    zIndex: 40,
    borderTopWidth: Platform.select({ ios: 0.5, default: 1 }),
    borderTopColor: 'rgba(28,27,26,0.05)',
  },
  // h-14 (56px), rounded-full, bg-primary, text-on-primary, font-bold,
  // text-body-lg (18/28.8), shadow-lg, gap-2 (8)
  continueBtn: {
    width: '100%',
    height: 56,
    borderRadius: 9999,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#994531',
        shadowOpacity: 0.30,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 6 },
    }),
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnPressed: {
    backgroundColor: C.onPrimaryFixedVariant,
    transform: [{ scale: 0.97 }],
  },
  continueText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: C.onPrimary,
    fontWeight: '700',
  },
  footerHelper: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.outline,
    textAlign: 'center',
    letterSpacing: 0.28,
  },
});

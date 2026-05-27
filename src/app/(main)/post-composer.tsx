import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { moodColor } from '../../lib/mood';
import { useCreatePost } from '../../lib/queries/feed';
import type { EmotionCategory } from '../../types/database';

// ─── Tokens ──────────────────────────────────────────────────────────────────
const C = {
  surface:                '#fff8f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainer:       '#ffe9e4',
  surfaceContainerHigh:   '#ffe2db',
  surfaceContainerHighest:'#fadcd5',
  primary:                '#994531',
  primaryContainer:       '#e8836b',
  primaryFixed:           '#ffdad2',
  onPrimaryContainer:     '#641e0e',
  onPrimary:              '#ffffff',
  secondary:              '#006970',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  tertiary:               '#a8315c',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
  error:                  '#ba1a1a',
} as const;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface MoodOption {
  key: EmotionCategory;
  label: string;
  icon: Mci;
}

// Mirror the dashboard 5-mood row so the language stays consistent app-wide.
const MOODS: MoodOption[] = [
  { key: 'happy',    label: 'Radiant', icon: 'emoticon-excited-outline' },
  { key: 'hopeful',  label: 'Good',    icon: 'emoticon-happy-outline'   },
  { key: 'neutral',  label: 'Steady',  icon: 'emoticon-neutral-outline' },
  { key: 'sad',      label: 'Tired',   icon: 'emoticon-sad-outline'     },
  { key: 'stressed', label: 'Low',     icon: 'emoticon-cry-outline'     },
];

const MAX_SENTENCE = 280;
const MAX_ANCHOR   = 24;

// Quick anchor word suggestions — keep them short, evocative, single-word.
const ANCHOR_SUGGESTIONS = [
  'tender', 'restless', 'soft', 'grateful', 'heavy', 'arriving',
  'open', 'tight', 'quiet', 'curious',
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PostComposerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const createPost = useCreatePost();

  const [category, setCategory] = useState<EmotionCategory | null>(null);
  const [sentence, setSentence] = useState('');
  const [anchorWord, setAnchorWord] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sentenceTrim = sentence.trim();
  const anchorTrim = anchorWord.trim();
  const canShare =
    category != null &&
    sentenceTrim.length > 0 &&
    sentenceTrim.length <= MAX_SENTENCE &&
    anchorTrim.length > 0 &&
    anchorTrim.length <= MAX_ANCHOR &&
    !createPost.isPending;

  const swatch = useMemo(
    () => (category ? moodColor[category] : C.surfaceContainerHigh),
    [category],
  );

  function pickMood(m: MoodOption) {
    void Haptics.selectionAsync();
    setCategory(m.key);
    setErrorMsg(null);
  }

  function suggestAnchor(word: string) {
    void Haptics.selectionAsync();
    setAnchorWord(word);
    setErrorMsg(null);
  }

  async function share() {
    if (createPost.isPending) return;
    if (!category) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setErrorMsg("Select how you're feeling first.");
      return;
    }
    if (!sentenceTrim) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setErrorMsg('Write a sentence to share.');
      return;
    }
    if (!anchorTrim) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setErrorMsg('Add an anchor word.');
      return;
    }
    setErrorMsg(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await createPost.mutateAsync({
        sentence: sentenceTrim,
        category,
        anchor_word: anchorTrim,
        color_hex: moodColor[category],
      });
      router.back();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not share your moment — please try again.',
      );
    }
  }

  const remaining = MAX_SENTENCE - sentence.length;

  return (
    <View style={s.root}>
      {/* Soft swatch glow at top, tinted by selected mood */}
      <View style={[s.headerGlow, { backgroundColor: swatch, opacity: category ? 0.35 : 0.15 }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 140 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={s.headerRow}>
            <TouchableOpacity
              style={s.backBtn}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons name="close" size={22} color={C.primary} />
            </TouchableOpacity>
            <View style={s.headerTextWrap}>
              <Text style={s.eyebrow}>SHARE A MOMENT</Text>
              <Text style={s.headline}>One sentence is enough.</Text>
            </View>
            <View style={s.anonChip}>
              <MaterialCommunityIcons name="incognito" size={12} color={C.onSurfaceVariant} />
              <Text style={s.anonText}>Anonymous</Text>
            </View>
          </View>

          {/* Mood picker */}
          <Animated.View entering={FadeInUp.springify()} style={s.moodSection}>
            <Text style={s.sectionLabel}>How does it feel?</Text>
            <View style={s.moodRow}>
              {MOODS.map((m) => {
                const active = category === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={s.moodItem}
                    onPress={() => pickMood(m)}
                    activeOpacity={0.75}
                  >
                    {active ? <View style={s.moodRing} /> : null}
                    <View style={[s.moodCircle, active && s.moodCircleActive]}>
                      <MaterialCommunityIcons
                        name={m.icon}
                        size={active ? 26 : 22}
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
          </Animated.View>

          {/* Sentence */}
          <Animated.View entering={FadeInDown.delay(60).springify()} style={s.sentenceCard}>
            <TextInput
              value={sentence}
              onChangeText={(v) => { setSentence(v); setErrorMsg(null); }}
              placeholder="What's true for you right now? One sentence."
              placeholderTextColor={C.outlineVariant}
              style={s.sentenceInput}
              multiline
              maxLength={MAX_SENTENCE}
              textAlignVertical="top"
              autoFocus
            />
            <View style={s.counterRow}>
              <View style={{ flex: 1 }} />
              <Text style={[s.counter, remaining < 30 && { color: C.tertiary }]}>
                {remaining}
              </Text>
            </View>
          </Animated.View>

          {/* Anchor word */}
          <Animated.View entering={FadeInDown.delay(120).springify()} style={s.anchorSection}>
            <Text style={s.sectionLabel}>Your anchor word</Text>
            <View style={s.anchorWrap}>
              <View style={[s.anchorSwatch, { backgroundColor: swatch }]} />
              <TextInput
                value={anchorWord}
                onChangeText={setAnchorWord}
                placeholder="one word"
                placeholderTextColor={C.outlineVariant}
                style={s.anchorInput}
                maxLength={MAX_ANCHOR}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={s.suggestRow}>
              {ANCHOR_SUGGESTIONS.map((w) => {
                const active = anchorTrim === w;
                return (
                  <TouchableOpacity
                    key={w}
                    style={[s.suggestChip, active && s.suggestChipActive]}
                    onPress={() => suggestAnchor(w)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.suggestText, active && s.suggestTextActive]}>
                      {w}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* Preview / nudge */}
          {category ? (
            <Animated.View entering={FadeInDown.delay(180).springify()} style={s.previewCard}>
              <View style={[s.previewDot, { backgroundColor: moodColor[category] }]} />
              <Text style={s.previewText}>
                Posted as <Text style={s.previewBold}>Bloom #—</Text> in{' '}
                <Text style={s.previewBold}>{category}</Text> moments today.
              </Text>
            </Animated.View>
          ) : null}
        </ScrollView>

        {/* Footer CTA */}
        <View
          style={[
            s.footer,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}
          <TouchableOpacity
            style={[s.shareBtn, !canShare && s.shareBtnDisabled]}
            activeOpacity={0.85}
            onPress={share}
          >
            {createPost.isPending ? (
              <ActivityIndicator color={C.onPrimaryContainer} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="flower"
                  size={18}
                  color={C.onPrimaryContainer}
                />
                <Text style={s.shareBtnText}>SHARE ANONYMOUSLY</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  headerGlow: {
    position: 'absolute',
    top: -120, left: -60, right: -60,
    height: 320,
    borderRadius: 9999,
  },

  scroll: {
    paddingHorizontal: 20,
    gap: 24,
  },

  // Header
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.outlineVariant,
  },
  headerTextWrap: { flex: 1 },
  eyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, color: C.primary,
    letterSpacing: 1.6, textTransform: 'uppercase',
  },
  headline: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22, lineHeight: 28, color: C.onSurface,
    letterSpacing: -0.2, marginTop: 2,
  },
  anonChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999,
    backgroundColor: C.surfaceContainer,
  },
  anonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10, color: C.onSurfaceVariant,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },

  // Mood
  moodSection: { gap: 12 },
  sectionLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.onSurfaceVariant,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  moodRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  moodItem: { alignItems: 'center', gap: 6, position: 'relative' },
  moodRing: {
    position: 'absolute', top: -4,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(232,131,107,0.30)',
  },
  moodCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surfaceContainer,
  },
  moodCircleActive: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primaryContainer,
  },
  moodLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  moodLabelActive: { color: C.primary },

  // Sentence
  sentenceCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24, padding: 18,
    borderWidth: 1, borderColor: C.surfaceContainerHigh,
    ...softShadow,
  },
  sentenceInput: {
    fontFamily: 'Fraunces_400Regular',
    fontStyle: 'italic',
    fontSize: 20, lineHeight: 28,
    color: C.onSurface,
    minHeight: 120,
    paddingVertical: 0,
  },
  counterRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6,
  },
  counter: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, color: C.outline,
  },

  // Anchor
  anchorSection: { gap: 12 },
  anchorWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surfaceContainer,
    borderRadius: 16, paddingHorizontal: 16, height: 56,
  },
  anchorSwatch: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  anchorInput: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16, color: C.onSurface,
    paddingVertical: 0,
  },
  suggestRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  suggestChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1, borderColor: 'transparent',
  },
  suggestChipActive: {
    backgroundColor: C.primaryFixed,
    borderColor: C.primaryContainer,
  },
  suggestText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, color: C.onSurfaceVariant,
  },
  suggestTextActive: { color: C.onPrimaryContainer },

  // Preview
  previewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.outlineVariant,
  },
  previewDot: {
    width: 12, height: 12, borderRadius: 6,
  },
  previewText: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 19, color: C.onSurfaceVariant,
  },
  previewBold: {
    fontFamily: 'NunitoSans_600SemiBold',
    color: C.primary,
  },

  // Footer
  footer: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: 'rgba(255,248,246,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(219,193,187,0.30)',
    gap: 10,
  },
  errorText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.error, textAlign: 'center',
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
    backgroundColor: C.primaryContainer,
    height: 56, borderRadius: 9999,
    shadowColor: C.primary, shadowOpacity: 0.25,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  shareBtnDisabled: {
    backgroundColor: C.surfaceContainerHigh,
    shadowOpacity: 0, elevation: 0,
  },
  shareBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.onPrimaryContainer,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
});

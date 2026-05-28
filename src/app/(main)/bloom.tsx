import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Design tokens (design/bloom-ai-chat.html is source of truth) ────────────
const C = {
  surface:                '#fff8f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainer:       '#ffe9e4',
  surfaceContainerHigh:   '#ffe2db',
  surfaceContainerHighest:'#fadcd5',
  primary:                '#994531',
  onPrimary:              '#ffffff',
  primaryContainer:       '#e8836b',
  primaryFixed:           '#ffdad2',
  onPrimaryFixedVariant:  '#7a2e1d',
  secondary:              '#006970',
  secondaryFixed:         '#90f2fc',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  onSecondaryFixed:       '#002022',
  tertiary:               '#a8315c',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
} as const;

const BLOOM_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB23GMOBJc4wUxKqUTWd2iaHGfe78CyEB8cQKfzW0xe6GzVFghdQg4QP4BuhwrgvwyMhqgpqFg-ALR0wXUTCzXK6QZgFt_gKfhalbQX6WNrxuSglpi96Bcqx1cpwjmUYbp14YbrF7fmRzopL6XgSxdPtshyhw9NlDiU5OnR1NxkMuwujMMXwMbrH7ieyJ5CaX66srpPT1E4EneCyu8-mmrv2rUsVoNwfS13EpN2y-p1B_C1jG6x9KqL3y1-UTdnOFJK_pL4fZGTVQuC';

const HEADER_H = 72;
const INPUT_BAR_H = 76;

const FEELING_PILLS = ['Anxious', 'Restless', 'Tired', 'Heavy'] as const;
type Feeling = (typeof FEELING_PILLS)[number];

// ─── Pulsing breathing orb ────────────────────────────────────────────────────
function BreathingOrb() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.35, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withTiming(0.15, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={s.orbWrap}>
      <Animated.View style={[s.orbPulse, pulseStyle]} />
      <View style={s.orbCore}>
        <MaterialCommunityIcons name="weather-windy" size={36} color={C.onSecondaryContainer} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BloomChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [feeling, setFeeling] = useState<Feeling>('Anxious');
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Open the keyboard automatically every time the screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => {
        clearTimeout(t);
        inputRef.current?.blur();
      };
    }, []),
  );

  function selectFeeling(f: Feeling) {
    void Haptics.selectionAsync();
    setFeeling(f);
  }

  function send() {
    if (!draft.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft('');
  }

  const bottomBarPad = insets.bottom + 8;

  return (
    <View style={s.root}>
      {/* Decorative blobs (behind everything) */}
      <View style={[s.blob, s.blobTopRight]} />
      <View style={[s.blob, s.blobBottomLeft]} />

      {/* ─── Top App Bar ─── */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { paddingTop: insets.top, height: insets.top + HEADER_H }]}
      >
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="menu" size={24} color={C.primary} />
            </TouchableOpacity>
            <View style={s.brandRow}>
              <View style={s.avatarRing}>
                <Image source={{ uri: BLOOM_AVATAR }} style={s.avatarImg} contentFit="cover" />
              </View>
              <View>
                <Text style={s.brand}>Bloom</Text>
                <View style={s.statusRow}>
                  <View style={s.statusDot} />
                  <Text style={s.statusText}>Always here for you</Text>
                </View>
              </View>
            </View>
          </View>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={C.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ─── Chat canvas ─── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            s.chatScroll,
            {
              paddingTop: insets.top + HEADER_H + 24,
              paddingBottom: INPUT_BAR_H + bottomBarPad + 32,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* AI message */}
          <Animated.View entering={FadeInDown.delay(80).springify()} style={s.msgRowLeft}>
            <View style={s.bubbleAI}>
              <Text style={s.bubbleAIText}>
                Good morning, friend. I noticed your heart rate was a bit elevated earlier. How are
                you feeling in this moment?
              </Text>
            </View>
            <Text style={[s.timestamp, { marginLeft: 8 }]}>09:12 AM</Text>
          </Animated.View>

          {/* User message */}
          <Animated.View entering={FadeInDown.delay(140).springify()} style={s.msgRowRight}>
            <View style={s.bubbleUser}>
              <Text style={s.bubbleUserText}>
                A little overwhelmed with the upcoming presentation. My mind keeps racing.
              </Text>
            </View>
            <Text style={[s.timestamp, { marginRight: 8 }]}>09:13 AM</Text>
          </Animated.View>

          {/* Mood selector card */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={s.cardFull}>
            <View style={s.moodCard}>
              <Text style={s.moodHeading}>How would you describe the feeling?</Text>
              <View style={s.pillRow}>
                {FEELING_PILLS.map((f) => {
                  const active = feeling === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      onPress={() => selectFeeling(f)}
                      activeOpacity={0.85}
                      style={[s.pill, active && s.pillActive]}
                    >
                      <Text style={[s.pillText, active && s.pillTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Breathing exercise card */}
          <Animated.View entering={FadeInDown.delay(260).springify()} style={s.cardFull}>
            <View style={s.breathCard}>
              <BreathingOrb />
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={s.breathTitle}>Box Breathing</Text>
                <Text style={s.breathSub}>4 seconds in… 4 seconds hold… 4 seconds out.</Text>
              </View>
              <TouchableOpacity
                style={s.breathCta}
                activeOpacity={0.88}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/(main)/breathing');
                }}
              >
                <Text style={s.breathCtaText}>Start Session · 2 min</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Reflection prompt */}
          <Animated.View entering={FadeInDown.delay(320).springify()} style={s.msgRowLeft}>
            <View style={s.reflectionBubble}>
              <Text style={s.reflectionText}>
                "If you could tell this presentation one thing to make it less scary, what would
                it be?"
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* ─── Bottom input bar ─── */}
        <View style={[s.inputBar, { paddingBottom: bottomBarPad }]}>
          <TouchableOpacity style={s.inputSideBtn} activeOpacity={0.75}>
            <MaterialCommunityIcons name="plus" size={22} color={C.primary} />
          </TouchableOpacity>
          <View style={s.inputWrap}>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              placeholder="Share your thoughts…"
              placeholderTextColor={C.outline}
              style={s.input}
              multiline
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[s.sendBtn, !draft.trim() && { opacity: 0.45 }]}
              activeOpacity={0.85}
              onPress={send}
            >
              <MaterialCommunityIcons name="send" size={16} color={C.onPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.inputSideBtn} activeOpacity={0.75}>
            <MaterialCommunityIcons name="microphone-outline" size={22} color={C.primary} />
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
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Decorative blobs
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.35,
  },
  blobTopRight: {
    top: 96,
    right: -80,
    width: 260,
    height: 260,
    backgroundColor: C.surfaceContainerHighest,
  },
  blobBottomLeft: {
    bottom: 160,
    left: -80,
    width: 320,
    height: 320,
    backgroundColor: C.secondaryFixed,
    opacity: 0.25,
  },

  // Top app bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(255,248,246,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceContainer,
  },
  topBarInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.secondaryContainer,
    borderWidth: 2,
    borderColor: C.primaryContainer,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  brand: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 24,
    color: C.primary,
    letterSpacing: -0.1,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.tertiary,
  },
  statusText: {
    fontFamily: 'NunitoSans_500Medium',
    fontSize: 11,
    lineHeight: 14,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },

  // Chat scroll
  chatScroll: {
    paddingHorizontal: 20,
    gap: 24,
  },

  // Message rows
  msgRowLeft: {
    alignItems: 'flex-start',
    maxWidth: '85%',
  },
  msgRowRight: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  bubbleAI: {
    backgroundColor: C.surfaceContainerLowest,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...softShadow,
  },
  bubbleAIText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurface,
  },
  bubbleUser: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...softShadow,
  },
  bubbleUserText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: C.onPrimary,
  },
  timestamp: {
    fontFamily: 'NunitoSans_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: C.outline,
    marginTop: 6,
    letterSpacing: 0.2,
  },

  // Full-width card row
  cardFull: { width: '100%' },

  // Mood selector card
  moodCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    gap: 16,
    ...softShadow,
  },
  moodHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17,
    lineHeight: 24,
    color: C.primary,
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainerHighest,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: C.secondaryFixed,
    borderColor: C.primaryContainer,
  },
  pillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
    letterSpacing: 0.28,
  },
  pillTextActive: {
    color: C.onSecondaryFixed,
  },

  // Breathing exercise card
  breathCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.primaryFixed,
    alignItems: 'center',
    gap: 18,
    ...softShadow,
  },
  orbWrap: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  orbPulse: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: C.secondaryContainer,
  },
  orbCore: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 19,
    lineHeight: 26,
    color: C.primary,
  },
  breathSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  breathCta: {
    width: '100%',
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 9999,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  breathCtaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.onPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Reflection prompt
  reflectionBubble: {
    backgroundColor: C.surfaceContainerLowest,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: C.tertiary,
    ...softShadow,
  },
  reflectionText: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 24,
    color: C.onSurface,
    letterSpacing: -0.1,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: C.surfaceContainer,
  },
  inputSideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  inputWrap: {
    flex: 1,
    minHeight: 44,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 9999,
    paddingLeft: 18,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 20,
    color: C.onSurface,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    maxHeight: 120,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});

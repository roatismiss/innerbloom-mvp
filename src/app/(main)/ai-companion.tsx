import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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

import type { BloomCard } from '../../lib/bloom-prompt';
import { BLOOM_CRISIS_RESOURCES_PH } from '../../lib/bloom-prompt';
import {
  useBloomActiveSession,
  useBloomSend,
  type BloomChatMessage,
  type BloomSessionWithMessages,
} from '../../lib/queries/bloom';

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
  error:                  '#b3261e',
  errorContainer:         '#f9dedc',
  onErrorContainer:       '#410e0b',
} as const;

const BLOOM_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB23GMOBJc4wUxKqUTWd2iaHGfe78CyEB8cQKfzW0xe6GzVFghdQg4QP4BuhwrgvwyMhqgpqFg-ALR0wXUTCzXK6QZgFt_gKfhalbQX6WNrxuSglpi96Bcqx1cpwjmUYbp14YbrF7fmRzopL6XgSxdPtshyhw9NlDiU5OnR1NxkMuwujMMXwMbrH7ieyJ5CaX66srpPT1E4EneCyu8-mmrv2rUsVoNwfS13EpN2y-p1B_C1jG6x9KqL3y1-UTdnOFJK_pL4fZGTVQuC';

const HEADER_H = 72;
const INPUT_BAR_H = 76;

type LocalErrorMsg = { id: string; role: 'error'; content: string; created_at: string };
type DisplayMsg = BloomChatMessage | LocalErrorMsg;

function formatTime(iso: string) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function greetingForHour(h: number) {
  if (h < 5)  return 'It’s late — and you came here anyway. What’s on your mind?';
  if (h < 12) return 'Good morning. I’m here whenever you’re ready — how’s the start of your day landing?';
  if (h < 18) return 'Good afternoon. Take a breath with me — what would feel good to put down right now?';
  return 'Good evening. The day is closing — what’s still loud inside you?';
}

function genId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);

  useEffect(() => {
    const cfg = { duration: 600, easing: Easing.inOut(Easing.quad) };
    a.value = withRepeat(withTiming(1, cfg), -1, true);
    const t1 = setTimeout(() => { b.value = withRepeat(withTiming(1, cfg), -1, true); }, 180);
    const t2 = setTimeout(() => { c.value = withRepeat(withTiming(1, cfg), -1, true); }, 360);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [a, b, c]);

  const sA = useAnimatedStyle(() => ({ opacity: 0.3 + a.value * 0.7, transform: [{ translateY: -a.value * 2 }] }));
  const sB = useAnimatedStyle(() => ({ opacity: 0.3 + b.value * 0.7, transform: [{ translateY: -b.value * 2 }] }));
  const sC = useAnimatedStyle(() => ({ opacity: 0.3 + c.value * 0.7, transform: [{ translateY: -c.value * 2 }] }));

  return (
    <View style={[s.bubbleAI, { flexDirection: 'row', gap: 6, paddingVertical: 18 }]}>
      <Animated.View style={[s.typingDot, sA]} />
      <Animated.View style={[s.typingDot, sB]} />
      <Animated.View style={[s.typingDot, sC]} />
    </View>
  );
}

// ─── Card renderers ───────────────────────────────────────────────────────────

function BreathingCard({ card, onStart }: { card: Extract<BloomCard, { type: 'breathing' }>; onStart: () => void }) {
  const mins = Math.round(card.duration_sec / 60);
  return (
    <View style={s.breathCard}>
      <BreathingOrb />
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={s.breathTitle}>{card.name}</Text>
        <Text style={s.breathSub}>4 seconds in… 4 seconds hold… 4 seconds out.</Text>
      </View>
      <TouchableOpacity style={s.breathCta} activeOpacity={0.88} onPress={onStart}>
        <Text style={s.breathCtaText}>Start Session · {mins} min</Text>
      </TouchableOpacity>
    </View>
  );
}

function MoodPickerCard({
  card,
  selected,
  onSelect,
}: {
  card: Extract<BloomCard, { type: 'mood_picker' }>;
  selected: string | null;
  onSelect: (option: string) => void;
}) {
  return (
    <View style={s.moodCard}>
      <Text style={s.moodHeading}>How would you describe the feeling?</Text>
      <View style={s.pillRow}>
        {card.options.map((opt) => {
          const active = selected === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onSelect(opt)}
              activeOpacity={0.85}
              style={[s.pill, active && s.pillActive]}
            >
              <Text style={[s.pillText, active && s.pillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ReflectionCard({ card }: { card: Extract<BloomCard, { type: 'reflection' }> }) {
  return (
    <View style={s.reflectionBubble}>
      <Text style={s.reflectionText}>“{card.prompt}”</Text>
    </View>
  );
}

function CrisisCard() {
  return (
    <View style={s.crisisCard}>
      <View style={s.crisisHeader}>
        <MaterialCommunityIcons name="heart-pulse" size={22} color={C.error} />
        <Text style={s.crisisTitle}>You are not alone tonight</Text>
      </View>
      <Text style={s.crisisSub}>People trained for this are on the other end of these lines, right now.</Text>
      <View style={{ gap: 10, marginTop: 8 }}>
        {BLOOM_CRISIS_RESOURCES_PH.map((r) => (
          <View key={r.name} style={s.crisisRow}>
            <Text style={s.crisisName}>{r.name}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {r.numbers.map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => Linking.openURL(`tel:${n.replace(/[^0-9+]/g, '')}`)}
                  style={s.crisisPill}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="phone" size={13} color={C.onErrorContainer} />
                  <Text style={s.crisisPillText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AICompanionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const qc = useQueryClient();

  const [draft, setDraft] = useState('');
  const [moodSelection, setMoodSelection] = useState<Record<string, string>>({});
  const [localErrors, setLocalErrors] = useState<LocalErrorMsg[]>([]);

  const { data: active, isLoading } = useBloomActiveSession();
  const send = useBloomSend();

  const greetingText = useMemo(() => greetingForHour(new Date().getHours()), []);

  const serverMessages = active?.messages ?? [];
  const messages: DisplayMsg[] = useMemo(() => {
    return [...serverMessages, ...localErrors].sort((a, b) =>
      a.created_at < b.created_at ? -1 : 1,
    );
  }, [serverMessages, localErrors]);

  const showGreeting = !isLoading && serverMessages.length === 0;

  // Optimistically inject the user message into the active-session cache so
  // it appears instantly. The server response then reconciles it.
  function optimisticAppend(text: string): string {
    const id = genId();
    const now = new Date().toISOString();
    const userMsg: BloomChatMessage = {
      id,
      session_id: active?.session.id ?? 'pending',
      role: 'user',
      content: text,
      cards: [],
      created_at: now,
    };
    qc.setQueryData<BloomSessionWithMessages | null>(
      ['bloom', 'active-session'],
      (prev) => {
        if (!prev) {
          return {
            session: {
              id: 'pending',
              started_at: now,
              last_at: now,
              message_count: 0,
              title: null,
              primary_feeling: null,
            },
            messages: [userMsg],
          };
        }
        return { ...prev, messages: [...prev.messages, userMsg] };
      },
    );
    return id;
  }

  function reconcileResponse(
    optimisticId: string,
    payload: { session_id: string; user_message_id: string; assistant_message_id: string | null; reply: string; cards: BloomCard[] },
  ) {
    const now = new Date().toISOString();
    qc.setQueryData<BloomSessionWithMessages | null>(
      ['bloom', 'active-session'],
      (prev) => {
        if (!prev) return prev;
        const newMessages = prev.messages
          .map((m) =>
            m.id === optimisticId
              ? { ...m, id: payload.user_message_id, session_id: payload.session_id }
              : m,
          )
          .concat([
            {
              id: payload.assistant_message_id ?? genId(),
              session_id: payload.session_id,
              role: 'assistant',
              content: payload.reply,
              cards: payload.cards,
              created_at: now,
            },
          ]);
        return {
          session: { ...prev.session, id: payload.session_id, last_at: now },
          messages: newMessages,
        };
      },
    );
  }

  function rollbackOptimistic(optimisticId: string) {
    qc.setQueryData<BloomSessionWithMessages | null>(
      ['bloom', 'active-session'],
      (prev) => {
        if (!prev) return prev;
        return { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticId) };
      },
    );
  }

  const sendToBloom = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || send.isPending) return;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const optimisticId = optimisticAppend(trimmed);

      send.mutate(
        { message: trimmed },
        {
          onSuccess: (payload) => {
            reconcileResponse(optimisticId, payload);
            void Haptics.selectionAsync();
          },
          onError: (err) => {
            rollbackOptimistic(optimisticId);
            // eslint-disable-next-line no-console
            console.error('[bloom-send]', err);
            const detail = (err as { message?: string; context?: { status?: number } })?.message
              ?? 'unknown error';
            const status = (err as { context?: { status?: number } })?.context?.status;
            setLocalErrors((prev) => [
              ...prev,
              {
                id: genId(),
                role: 'error',
                content: `Bloom error${status ? ` (${status})` : ''}: ${detail}`,
                created_at: new Date().toISOString(),
              },
            ]);
          },
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [send, active?.session.id],
  );

  function handleSendPress() {
    if (!draft.trim()) return;
    const text = draft;
    setDraft('');
    sendToBloom(text);
  }

  function onMoodPick(messageId: string, option: string) {
    setMoodSelection((prev) => ({ ...prev, [messageId]: option }));
    void Haptics.selectionAsync();
    sendToBloom(`I’d call this feeling ${option}.`);
  }

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length, send.isPending]);

  // Open the keyboard automatically every time the screen comes into focus,
  // so Bloom AI behaves like ChatGPT / iMessage — the composer is ready and
  // the tab bar slides out, leaving the header pinned at the top.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => {
        clearTimeout(t);
        inputRef.current?.blur();
      };
    }, []),
  );

  // Tab bar handles its own safe area — don't double-count insets.bottom here,
  // otherwise we get a big visible gap between the input bar and the tab bar.
  const bottomBarPad = 8;
  const canSend = draft.trim().length > 0 && !send.isPending;

  return (
    <View style={s.root}>
      <View style={[s.blob, s.blobTopRight]} />
      <View style={[s.blob, s.blobBottomLeft]} />

      {/* ─── Top App Bar ─── */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { paddingTop: insets.top, height: insets.top + HEADER_H }]}
      >
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => router.back()}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={C.primary} />
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
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(main)/reflections')}
          >
            <MaterialCommunityIcons name="history" size={22} color={C.primary} />
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
              paddingTop: 24,
              paddingBottom: INPUT_BAR_H + bottomBarPad + 32,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
              <ActivityIndicator color={C.primary} />
            </View>
          )}

          {showGreeting && (
            <Animated.View entering={FadeInDown.springify()} style={s.msgRowLeft}>
              <View style={s.bubbleAI}>
                <Text style={s.bubbleAIText}>{greetingText}</Text>
              </View>
            </Animated.View>
          )}

          {messages.map((m, idx) => {
            const delay = Math.min(idx, 5) * 40;

            if (m.role === 'user') {
              return (
                <Animated.View
                  key={m.id}
                  entering={FadeInDown.delay(delay).springify()}
                  style={s.msgRowRight}
                >
                  <View style={s.bubbleUser}>
                    <Text style={s.bubbleUserText}>{m.content}</Text>
                  </View>
                  <Text style={[s.timestamp, { marginRight: 8 }]}>{formatTime(m.created_at)}</Text>
                </Animated.View>
              );
            }

            if (m.role === 'error') {
              return (
                <Animated.View
                  key={m.id}
                  entering={FadeInDown.delay(delay).springify()}
                  style={s.msgRowLeft}
                >
                  <View style={s.bubbleError}>
                    <Text style={s.bubbleErrorText}>{m.content}</Text>
                  </View>
                </Animated.View>
              );
            }

            return (
              <View key={m.id} style={{ gap: 16 }}>
                <Animated.View
                  entering={FadeInDown.delay(delay).springify()}
                  style={s.msgRowLeft}
                >
                  <View style={s.bubbleAI}>
                    <Text style={s.bubbleAIText}>{m.content}</Text>
                  </View>
                  <Text style={[s.timestamp, { marginLeft: 8 }]}>{formatTime(m.created_at)}</Text>
                </Animated.View>

                {m.cards.map((card, ci) => {
                  const key = `${m.id}-card-${ci}`;
                  if (card.type === 'breathing') {
                    return (
                      <Animated.View
                        key={key}
                        entering={FadeInDown.delay(delay + 80).springify()}
                        style={s.cardFull}
                      >
                        <BreathingCard
                          card={card}
                          onStart={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push('/(main)/breathing');
                          }}
                        />
                      </Animated.View>
                    );
                  }
                  if (card.type === 'mood_picker') {
                    return (
                      <Animated.View
                        key={key}
                        entering={FadeInDown.delay(delay + 80).springify()}
                        style={s.cardFull}
                      >
                        <MoodPickerCard
                          card={card}
                          selected={moodSelection[m.id] ?? null}
                          onSelect={(opt) => onMoodPick(m.id, opt)}
                        />
                      </Animated.View>
                    );
                  }
                  if (card.type === 'reflection') {
                    return (
                      <Animated.View
                        key={key}
                        entering={FadeInDown.delay(delay + 80).springify()}
                        style={s.msgRowLeft}
                      >
                        <ReflectionCard card={card} />
                      </Animated.View>
                    );
                  }
                  if (card.type === 'crisis_resources') {
                    return (
                      <Animated.View
                        key={key}
                        entering={FadeInDown.delay(delay + 80).springify()}
                        style={s.cardFull}
                      >
                        <CrisisCard />
                      </Animated.View>
                    );
                  }
                  return null;
                })}
              </View>
            );
          })}

          {send.isPending && (
            <Animated.View entering={FadeInDown.springify()} style={s.msgRowLeft}>
              <TypingDots />
            </Animated.View>
          )}
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
              editable={!send.isPending}
              onSubmitEditing={handleSendPress}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[s.sendBtn, !canSend && { opacity: 0.45 }]}
              activeOpacity={0.85}
              onPress={handleSendPress}
              disabled={!canSend}
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

  topBar: {
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

  chatScroll: {
    paddingHorizontal: 20,
    gap: 24,
  },

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
  bubbleError: {
    backgroundColor: C.errorContainer,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  bubbleErrorText: {
    fontFamily: 'NunitoSans_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: C.onErrorContainer,
  },
  timestamp: {
    fontFamily: 'NunitoSans_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: C.outline,
    marginTop: 6,
    letterSpacing: 0.2,
  },

  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.primary,
  },

  cardFull: { width: '100%' },

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

  crisisCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.errorContainer,
    borderLeftWidth: 4,
    borderLeftColor: C.error,
    gap: 6,
    ...softShadow,
  },
  crisisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crisisTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: C.onSurface,
  },
  crisisSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.onSurfaceVariant,
  },
  crisisRow: { gap: 6 },
  crisisName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  crisisPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.errorContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  crisisPillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    color: C.onErrorContainer,
  },

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
    // RN-Web hint: kills the default browser focus outline (the persistent
    // blue rectangle that wraps the text input on PWA Safari/Chrome).
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
        outlineColor: 'transparent',
        WebkitAppearance: 'none',
        appearance: 'none',
        boxShadow: 'none',
        borderWidth: 0,
      } as object,
      default: {},
    }),
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

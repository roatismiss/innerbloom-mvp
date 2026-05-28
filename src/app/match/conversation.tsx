import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReelPreviewCard } from '../../components/reels/ReelPreviewCard';
import {
  useConversationWithOther,
  useMessages,
  useSendMessage,
  useTodayActiveConversation,
} from '../../lib/queries/chat';
import { useHugInConversation } from '../../lib/queries/feed';
import {
  useCancelKindredRequest,
  useKindredStatus,
  useReleaseKindred,
  useRespondKindredRequest,
  useSendKindredRequest,
} from '../../lib/queries/kindred';
import { useAuthStore } from '../../store/auth';
import type { KindredStatus, MessageRow } from '../../types/database';

// ─── Design tokens (1:1 design/soul-matching-conversation.html) ───────────────
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
  onPrimaryContainer:     '#641e0e',
  primaryFixed:           '#ffdad2',
  secondary:              '#006970',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  tertiary:               '#a8315c',
  tertiaryFixed:          '#ffd9e1',
  tertiaryFixedDim:       '#ffb1c4',
  onTertiaryFixedVariant: '#881645',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
} as const;

const HEADER_H = 72;
const INPUT_H = 72;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const fallback = useTodayActiveConversation();
  const resolvedId = params.id ?? fallback.data?.conversation_id ?? null;

  const conversation = useConversationWithOther(resolvedId);
  const messages = useMessages(resolvedId);
  const sendMessage = useSendMessage(resolvedId ?? '');
  const kindredStatus = useKindredStatus(resolvedId);

  const me = useAuthStore((s) => s.user?.id ?? null);
  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [hugSent, setHugSent] = useState(false);
  const hugConv = useHugInConversation();
  const releaseKindred = useReleaseKindred();

  function goBack() {
    // From a deep link or refresh, the navigation stack may be empty.
    // Fall back to the dashboard rather than landing the user on a blank
    // history screen.
    if (router.canGoBack()) router.back();
    else router.replace('/(main)/dashboard');
  }

  function sendHug() {
    if (!conversation.data || !me) return;
    if (conversation.data.other_user_id === me) return;
    const matchId = conversation.data.match_id;
    if (!matchId) return; // Conversation has no linked match (shouldn't happen for Soul Match convos)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHugSent(true);
    hugConv.mutate(
      { matchId, toUserId: conversation.data.other_user_id },
      { onSettled: () => setTimeout(() => setHugSent(false), 1400) },
    );
  }

  // Auto-scroll on incoming messages
  const lastCount = useRef(0);
  useEffect(() => {
    const count = messages.data?.length ?? 0;
    if (count > lastCount.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
    lastCount.current = count;
  }, [messages.data]);

  function send() {
    const body = draft.trim();
    if (!body || !resolvedId) return;
    setDraft('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage.mutate({ body });
  }

  const bottomPad = insets.bottom + 8;

  // ─── Loading / empty state ────────────────────────────────────────────────
  if (!resolvedId && fallback.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  if (!resolvedId) {
    return (
      <View style={[s.root, s.center, { paddingHorizontal: 32 }]}>
        <MaterialCommunityIcons name="flower-tulip" size={48} color={C.outline} />
        <Text style={s.emptyTitle}>No active conversation</Text>
        <Text style={s.emptyBody}>
          Step into today&apos;s Soul Match to begin a conversation, or open a kept
          connection from your Soul Garden.
        </Text>
        <TouchableOpacity
          style={s.emptyCta}
          activeOpacity={0.85}
          onPress={() => router.replace('/(main)/soul-match')}
        >
          <Text style={s.emptyCtaText}>OPEN SOUL MATCH</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* mesh-bg equivalent: two corner radial gradients */}
      <View style={[s.meshCorner, s.meshTopLeft]} />
      <View style={[s.meshCorner, s.meshBottomRight]} />

      {/* ── Header ── */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.header, { paddingTop: insets.top, height: insets.top + HEADER_H }]}
      >
        <View style={s.headerInner}>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.75}
            onPress={goBack}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={C.primary} />
          </TouchableOpacity>

          {/* Avatar (real if set, fallback flower) + name (display_name wins) */}
          <View style={s.profileRow}>
            {conversation.data?.other_avatar_url ? (
              <View style={s.avatarBubbleImg}>
                <Image
                  source={{ uri: conversation.data.other_avatar_url }}
                  style={s.avatarImg}
                  contentFit="cover"
                />
                <View style={s.onlineDot} />
              </View>
            ) : (
              <View style={s.avatarBubble}>
                <MaterialCommunityIcons name="flower-tulip" size={20} color={C.primary} />
                <View style={s.onlineDot} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.personName} numberOfLines={1}>
                {conversation.data?.other_display_name?.trim()
                  || conversation.data?.other_alias
                  || 'Bloom'}
              </Text>
              <View style={s.statusRow}>
                <Text style={s.onlineLabel}>
                  {conversation.data?.other_display_name
                    ? conversation.data.other_alias
                    : 'Anonymous'}
                </Text>
                {conversation.data?.is_kept ? (
                  <View style={s.keptPill}>
                    <MaterialCommunityIcons name="flower" size={10} color={C.onSecondaryContainer} />
                    <Text style={s.keptText}>Kindred</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.75}
            onPress={() => {
              void Haptics.selectionAsync();
              setMenuOpen(true);
            }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={22} color={C.outline} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Chat canvas ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.bottom}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            s.chatScroll,
            {
              paddingTop: 24,
              paddingBottom: INPUT_H + bottomPad + 32,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {messages.isLoading ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : (messages.data?.length ?? 0) === 0 ? (
            <Animated.View entering={FadeIn} style={s.firstBubble}>
              <MaterialCommunityIcons name="auto-fix" size={18} color={C.tertiary} />
              <Text style={s.firstBubbleText}>
                A quiet beginning. Share the first thought you&apos;d offer a friend
                who feels what you feel today.
              </Text>
            </Animated.View>
          ) : null}

          {messages.data?.map((m) => (
            <MessageBubble key={m.id} message={m} mine={me === m.sender_id} />
          ))}

          {/* Kindred CTA / state strip — between last message and input */}
          <KindredStrip
            status={kindredStatus.data}
            conversationId={resolvedId}
            otherAlias={conversation.data?.other_alias}
          />
        </ScrollView>

        {/* ── Input bar ── */}
        <View style={[s.inputBar, { paddingBottom: bottomPad }]}>
          <TouchableOpacity
            style={[s.inputSideBtn, hugSent && s.inputSideBtnActive]}
            activeOpacity={0.7}
            onPress={sendHug}
            disabled={hugConv.isPending}
          >
            <MaterialCommunityIcons
              name={hugSent ? 'hand-heart' : 'hand-heart-outline'}
              size={22}
              color={hugSent ? C.tertiary : C.primary}
            />
          </TouchableOpacity>

          <View style={s.inputWrap}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Share a reflection..."
              placeholderTextColor={C.outlineVariant}
              style={s.input}
              returnKeyType="send"
              onSubmitEditing={send}
              editable={!sendMessage.isPending}
            />
          </View>

          <TouchableOpacity
            style={[s.sendBtn, !draft.trim() && s.sendBtnDisabled]}
            activeOpacity={0.85}
            onPress={send}
            disabled={!draft.trim() || sendMessage.isPending}
          >
            <MaterialCommunityIcons
              name="send"
              size={20}
              color={draft.trim() ? C.onSecondaryContainer : C.outline}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ConversationMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        otherAlias={conversation.data?.other_alias ?? 'this person'}
        isKept={conversation.data?.is_kept ?? false}
        conversationId={resolvedId}
        onRelease={() => {
          if (!resolvedId) return;
          releaseKindred.mutate(resolvedId, {
            onSuccess: () => {
              setMenuOpen(false);
              goBack();
            },
          });
        }}
        onReport={() => {
          // Full report flow lands in Bundle 3 (Crisis + Moderation). For now,
          // acknowledge the user's signal so the menu doesn't feel dead.
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setMenuOpen(false);
          // TODO(Bundle 3): open ReportFlow modal with reason + details.
        }}
      />
    </View>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({ message, mine }: { message: MessageRow; mine: boolean }) {
  const time = useMemo(() => formatTime(message.created_at), [message.created_at]);
  const optimistic = message.id.startsWith('optimistic-');
  const router = useRouter();
  const isReel = !!message.reel_id;

  const openReel = () => {
    if (!message.reel_id) return;
    void Haptics.selectionAsync();
    router.push({ pathname: '/(main)/reels' as never, params: { id: message.reel_id } });
  };

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={mine ? s.msgRight : s.msgLeft}>
      {isReel ? (
        <ReelPreviewCard reelId={message.reel_id!} onPress={openReel} />
      ) : (
        <View style={mine ? s.bubbleOut : s.bubbleIn}>
          <Text style={mine ? s.bubbleOutText : s.bubbleInText}>{message.body}</Text>
        </View>
      )}
      <View style={mine ? s.outMeta : undefined}>
        <Text style={mine ? s.timestampOut : s.timestamp}>{time}</Text>
        {mine ? (
          optimistic ? (
            <MaterialCommunityIcons name="clock-outline" size={12} color={C.outlineVariant} />
          ) : message.read_at ? (
            <MaterialCommunityIcons name="check-all" size={14} color={C.secondary} />
          ) : (
            <MaterialCommunityIcons name="check" size={14} color={C.outlineVariant} />
          )
        ) : null}
      </View>
    </Animated.View>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m} ${suffix}`;
}

// ─── Kindred strip (Ask to bloom again / sent / incoming) ────────────────────

function KindredStrip({
  status,
  conversationId,
  otherAlias,
}: {
  status: KindredStatus | undefined;
  conversationId: string;
  otherAlias: string | undefined;
}) {
  const [askOpen, setAskOpen] = useState(false);
  const send = useSendKindredRequest();
  const cancel = useCancelKindredRequest();
  const respond = useRespondKindredRequest();

  if (!status || status.state === 'kept') return null;

  if (status.state === 'sent') {
    return (
      <Animated.View entering={FadeIn} style={s.kindredSent}>
        <MaterialCommunityIcons name="flower-outline" size={16} color={C.outline} />
        <Text style={s.kindredSentText}>Kindred request sent · waiting</Text>
        <Pressable onPress={() => cancel.mutate(status.request_id)} hitSlop={8}>
          <Text style={s.kindredSentCancel}>Take it back</Text>
        </Pressable>
      </Animated.View>
    );
  }

  if (status.state === 'incoming') {
    return (
      <Animated.View entering={FadeIn} style={s.kindredIncoming}>
        <View style={s.kindredIncomingHead}>
          <MaterialCommunityIcons name="flower" size={18} color={C.tertiary} />
          <Text style={s.kindredIncomingTitle}>
            {otherAlias ?? 'They'} wants to keep blooming with you
          </Text>
        </View>
        {status.note ? (
          <Text style={s.kindredIncomingNote}>&ldquo;{status.note}&rdquo;</Text>
        ) : null}
        <View style={s.kindredIncomingActions}>
          <TouchableOpacity
            style={[s.kindredBtn, s.kindredBtnGhost]}
            activeOpacity={0.75}
            onPress={() => respond.mutate({ requestId: status.request_id, accept: false })}
            disabled={respond.isPending}
          >
            <Text style={s.kindredBtnGhostText}>Not now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.kindredBtn, s.kindredBtnFilled]}
            activeOpacity={0.85}
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              respond.mutate({ requestId: status.request_id, accept: true });
            }}
            disabled={respond.isPending}
          >
            <Text style={s.kindredBtnFilledText}>Keep blooming</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // state === 'none'
  return (
    <>
      <Animated.View entering={FadeIn} style={s.kindredNone}>
        <Text style={s.kindredNoneHint}>
          Today&apos;s window is brief. If something here matters, you can ask to keep it.
        </Text>
        <TouchableOpacity
          style={s.askBtn}
          activeOpacity={0.85}
          onPress={() => setAskOpen(true)}
        >
          <MaterialCommunityIcons name="flower-outline" size={16} color={C.onPrimaryContainer} />
          <Text style={s.askBtnText}>ASK TO BLOOM AGAIN</Text>
        </TouchableOpacity>
      </Animated.View>

      <KindredAskModal
        visible={askOpen}
        onClose={() => setAskOpen(false)}
        onSend={(note) => {
          send.mutate(
            { conversationId, note: note.trim() || null },
            { onSuccess: () => setAskOpen(false) },
          );
        }}
        sending={send.isPending}
      />
    </>
  );
}

// ─── Modal: write a note with the kindred request ────────────────────────────

function KindredAskModal({
  visible,
  onClose,
  onSend,
  sending,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (note: string) => void;
  sending: boolean;
}) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) setNote('');
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose}>
        <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={s.modalHandleRow}>
            <View style={s.modalHandle} />
          </View>
          <Text style={s.modalTitle}>Ask to bloom again</Text>
          <Text style={s.modalBody}>
            If they accept, this conversation stays with you both in your Soul
            Garden. Either of you can close it at any time.
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="One line, optional — why you'd like to keep talking."
            placeholderTextColor={C.outlineVariant}
            style={s.modalInput}
            multiline
            maxLength={280}
          />
          <View style={s.modalActions}>
            <TouchableOpacity style={s.modalGhost} activeOpacity={0.75} onPress={onClose}>
              <Text style={s.modalGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.modalSend}
              activeOpacity={0.85}
              onPress={() => onSend(note)}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color={C.onPrimaryContainer} size="small" />
              ) : (
                <Text style={s.modalSendText}>SEND REQUEST</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Conversation menu (3-dots → action sheet) ──────────────────────────────

function ConversationMenuSheet({
  visible,
  onClose,
  otherAlias,
  isKept,
  conversationId,
  onRelease,
  onReport,
}: {
  visible: boolean;
  onClose: () => void;
  otherAlias: string;
  isKept: boolean;
  conversationId: string | null;
  onRelease: () => void;
  onReport: () => void;
}) {
  if (!conversationId) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose}>
        <Pressable style={s.sheetCard} onPress={(e) => e.stopPropagation()}>
          <View style={s.modalHandleRow}>
            <View style={s.modalHandle} />
          </View>

          <Text style={s.sheetEyebrow}>OPTIONS</Text>
          <Text style={s.sheetTitle}>{otherAlias}</Text>

          <View style={s.sheetGroup}>
            {isKept ? (
              <TouchableOpacity
                style={s.sheetItem}
                activeOpacity={0.7}
                onPress={onRelease}
              >
                <MaterialCommunityIcons name="flower-poppy" size={22} color={C.onSurfaceVariant} />
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetItemLabel}>Release this kindred</Text>
                  <Text style={s.sheetItemSub}>Closes the connection. They aren&apos;t notified.</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={s.sheetItem}
              activeOpacity={0.7}
              onPress={onReport}
            >
              <MaterialCommunityIcons name="flag-outline" size={22} color={'#ba1a1a'} />
              <View style={{ flex: 1 }}>
                <Text style={[s.sheetItemLabel, { color: '#ba1a1a' }]}>
                  Report this conversation
                </Text>
                <Text style={s.sheetItemSub}>
                  Flags it for review. Full report flow coming soon.
                </Text>
              </View>
            </TouchableOpacity>

            <View style={s.sheetItem}>
              <MaterialCommunityIcons name="block-helper" size={22} color={C.outlineVariant} />
              <View style={{ flex: 1 }}>
                <Text style={[s.sheetItemLabel, { color: C.outlineVariant }]}>
                  Block this person
                </Text>
                <Text style={s.sheetItemSub}>Coming soon — won&apos;t match again.</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={s.sheetCancel} activeOpacity={0.75} onPress={onClose}>
            <Text style={s.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },

  emptyTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 28,
    color: C.onSurface,
    marginTop: 4,
  },
  emptyBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 22,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  emptyCta: {
    backgroundColor: C.primaryContainer,
    paddingHorizontal: 24, height: 48,
    borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  emptyCtaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.onPrimaryContainer,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  meshCorner: { position: 'absolute', borderRadius: 9999, opacity: 0.4 },
  meshTopLeft: {
    top: -80, left: -80, width: 320, height: 320,
    backgroundColor: 'rgba(250,220,213,0.40)',
  },
  meshBottomRight: {
    bottom: -80, right: -80, width: 320, height: 320,
    backgroundColor: 'rgba(144,242,252,0.10)',
  },

  header: {
    backgroundColor: 'rgba(255,248,246,0.85)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(92,71,66,0.08)',
  },
  headerInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 10,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  profileRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBubble: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBubbleImg: {
    width: 40, height: 40, borderRadius: 20,
    position: 'relative',
  },
  avatarImg: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surfaceContainerHigh,
  },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.secondary,
    borderWidth: 2, borderColor: C.surface,
  },
  personName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16, lineHeight: 22, color: C.onSurface,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1 },
  onlineLabel: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12, lineHeight: 16, color: C.outline,
  },
  keptPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: C.secondaryContainer,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9999,
  },
  keptText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10, lineHeight: 14,
    color: C.onSecondaryContainer,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },

  chatScroll: { paddingHorizontal: 20, gap: 20 },

  firstBubble: {
    backgroundColor: 'rgba(255,217,225,0.30)',
    borderWidth: 1, borderColor: 'rgba(255,177,196,0.50)',
    borderRadius: 20, padding: 18,
    alignItems: 'center', gap: 8,
    alignSelf: 'center', maxWidth: 320,
  },
  firstBubbleText: {
    fontFamily: 'Fraunces_400Regular',
    fontStyle: 'italic',
    fontSize: 15, lineHeight: 22,
    color: C.onSurfaceVariant, textAlign: 'center',
  },

  msgLeft: { alignItems: 'flex-start', maxWidth: '85%' },
  bubbleIn: {
    backgroundColor: C.surfaceContainerHigh,
    paddingVertical: 14, paddingHorizontal: 16,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderBottomLeftRadius: 4, borderBottomRightRadius: 20,
    ...softShadow,
  },
  bubbleInText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 22, color: C.onSurface,
  },

  msgRight: { alignItems: 'flex-end', alignSelf: 'flex-end', maxWidth: '85%' },
  bubbleOut: {
    backgroundColor: C.primaryContainer,
    paddingVertical: 14, paddingHorizontal: 16,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 4,
    ...softShadow,
  },
  bubbleOutText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 22, color: C.onPrimaryContainer,
  },
  outMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4, marginRight: 4,
  },
  timestamp: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 10, lineHeight: 14, color: C.outlineVariant,
    marginTop: 4, marginLeft: 4,
  },
  timestampOut: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 10, lineHeight: 14, color: C.outlineVariant,
  },

  // Kindred strip — none
  kindredNone: {
    marginTop: 8, alignItems: 'center', gap: 10, paddingHorizontal: 8,
  },
  kindredNoneHint: {
    fontFamily: 'Fraunces_400Regular',
    fontStyle: 'italic',
    fontSize: 13, lineHeight: 19,
    color: C.outline, textAlign: 'center',
  },
  askBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primaryContainer,
    paddingHorizontal: 18, height: 44, borderRadius: 9999,
    shadowColor: C.primary, shadowOpacity: 0.2,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  askBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, color: C.onPrimaryContainer,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  // Kindred strip — sent
  kindredSent: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'center',
    backgroundColor: C.surfaceContainerLow,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 9999,
    marginTop: 8,
  },
  kindredSentText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, color: C.outline,
  },
  kindredSentCancel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, color: C.primary,
    textDecorationLine: 'underline',
  },

  // Kindred strip — incoming
  kindredIncoming: {
    marginTop: 8,
    backgroundColor: 'rgba(255,217,225,0.50)',
    borderWidth: 1, borderColor: 'rgba(255,177,196,0.60)',
    borderRadius: 20, padding: 18, gap: 10,
  },
  kindredIncomingHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kindredIncomingTitle: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 20, color: C.onTertiaryFixedVariant,
  },
  kindredIncomingNote: {
    fontFamily: 'Fraunces_400Regular',
    fontStyle: 'italic',
    fontSize: 14, lineHeight: 21, color: C.onSurfaceVariant,
  },
  kindredIncomingActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  kindredBtn: {
    flex: 1, height: 44, borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
  },
  kindredBtnGhost: {
    borderWidth: 1, borderColor: C.outlineVariant, backgroundColor: 'transparent',
  },
  kindredBtnGhostText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.onSurfaceVariant,
  },
  kindredBtnFilled: { backgroundColor: C.primaryContainer },
  kindredBtnFilledText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.onPrimaryContainer,
    letterSpacing: 0.4,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: 'rgba(255,248,246,0.92)',
    borderTopWidth: 1, borderTopColor: 'rgba(219,193,187,0.12)',
  },
  inputSideBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.surfaceContainerHighest,
    alignItems: 'center', justifyContent: 'center',
  },
  inputSideBtnActive: {
    backgroundColor: C.tertiaryFixed,
    transform: [{ scale: 1.06 }],
  },
  inputWrap: {
    flex: 1, height: 48,
    backgroundColor: C.surfaceContainer,
    borderRadius: 9999, paddingHorizontal: 20,
    justifyContent: 'center',
    shadowColor: '#5C4742', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  input: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 20, color: C.onSurface,
    paddingVertical: 0,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.secondaryContainer,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#5C4742', shadowOpacity: 0.06,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sendBtnDisabled: { backgroundColor: C.surfaceContainerHighest },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(40,24,20,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: 36, gap: 14,
  },
  modalHandleRow: { alignItems: 'center', marginTop: -8, marginBottom: 4 },
  modalHandle: {
    width: 48, height: 5, borderRadius: 9999,
    backgroundColor: C.outlineVariant,
  },
  modalTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24, lineHeight: 30, color: C.onSurface,
  },
  modalBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 21, color: C.onSurfaceVariant,
  },
  modalInput: {
    backgroundColor: C.surfaceContainer,
    borderRadius: 16, padding: 16, minHeight: 96,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 22, color: C.onSurface,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalGhost: {
    flex: 1, height: 52, borderRadius: 9999,
    borderWidth: 1, borderColor: C.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  modalGhostText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.onSurfaceVariant,
    letterSpacing: 0.4,
  },
  modalSend: {
    flex: 2, height: 52, borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOpacity: 0.2,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  modalSendText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.onPrimaryContainer,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  // Action sheet (3-dots menu)
  sheetCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 20, paddingBottom: 32,
    gap: 8,
  },
  sheetEyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, color: C.primary,
    letterSpacing: 1.6, textTransform: 'uppercase',
    marginTop: 8,
  },
  sheetTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20, lineHeight: 26,
    color: C.onSurface,
    marginBottom: 8,
  },
  sheetGroup: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
  },
  sheetItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingVertical: 16, paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(219,193,187,0.40)',
  },
  sheetItemLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15, color: C.onSurface,
  },
  sheetItemSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12, lineHeight: 17,
    color: C.outline,
    marginTop: 2,
  },
  sheetCancel: {
    marginTop: 14, paddingVertical: 16,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, color: C.onSurfaceVariant,
    letterSpacing: 0.3,
  },
});

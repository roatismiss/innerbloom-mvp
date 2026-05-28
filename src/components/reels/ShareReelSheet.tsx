import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBloomSend } from '../../lib/queries/bloom';
import { callRpc } from '../../lib/queries/client';
import { useKindredGarden } from '../../lib/queries/kindred';
import type { SendMessageArgs, SendMessageResult } from '../../types/database';

const C = {
  primary:              '#994531',
  onPrimary:            '#ffffff',
  primaryContainer:     '#e8836b',
  onPrimaryContainer:   '#641e0e',
  surface:              '#fff8f6',
  surfaceContainer:     '#ffe9e4',
  surfaceContainerLow:  '#fff1ed',
  surfaceContainerHigh: '#ffe2db',
  onSurface:            '#281814',
  onSurfaceVariant:     '#55433e',
  outline:              '#88726d',
  outlineVariant:       '#dbc1bb',
};

export type SharedReelPayload = {
  id: string;
  reelId: string;
  caption: string;
  quote: string;
  author: string;
  dailyBloom?: string;
};

const BLOOM_AI_ID = '__bloom_ai__';

export function ShareReelSheet({
  reel,
  visible,
  onClose,
}: {
  reel: SharedReelPayload | null;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: garden, isLoading } = useKindredGarden();
  const bloomSend = useBloomSend();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const toggle = (id: string) => {
    void Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setSelected(new Set());
    setNote('');
    onClose();
  };

  const handleSend = async () => {
    if (!reel || selected.size === 0 || sending) return;

    const realConvIds = [...selected].filter((id) => id !== BLOOM_AI_ID);
    const includesAI = selected.has(BLOOM_AI_ID);

    setSending(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const body = formatShareBody(reel, note);

    try {
      await Promise.all(
        realConvIds.map((conversationId) =>
          callRpc<SendMessageArgs, SendMessageResult>('send_message', {
            p_conversation_id: conversationId,
            p_body: body,
            p_reel_id: reel.reelId,
          }),
        ),
      );

      if (includesAI) {
        await bloomSend.mutateAsync({ message: formatBloomAiPrompt(reel, note) });
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();

      if (includesAI) {
        router.push('/(main)/ai-companion');
      }
    } catch (err) {
      setSending(false);
      const msg = err instanceof Error ? err.message : 'Could not send. Try again.';
      Alert.alert('Could not share', msg);
    }
  };

  const canSend = selected.size > 0 && !sending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {visible && (
        <View style={styles.root}>
          <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
            <Pressable style={styles.backdrop} onPress={handleClose} />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.duration(280).springify().damping(18)}
            exiting={SlideOutDown.duration(220)}
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.dragHandleWrap}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Share with Kindred Spirits</Text>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="close" size={22} color={C.onSurfaceVariant} />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarRow}
            >
              <RecipientAvatar
                kind="ai"
                label="Bloom AI"
                selected={selected.has(BLOOM_AI_ID)}
                onPress={() => toggle(BLOOM_AI_ID)}
              />

              {isLoading && (
                <View style={styles.loadingTile}>
                  <ActivityIndicator color={C.primary} />
                </View>
              )}

              {(garden ?? []).map((row) => (
                <RecipientAvatar
                  key={row.conversation_id}
                  kind="kindred"
                  label={row.other_alias}
                  selected={selected.has(row.conversation_id)}
                  onPress={() => toggle(row.conversation_id)}
                />
              ))}

              {!isLoading && (garden ?? []).length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    No Kindred Spirits yet — match with someone to share.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.noteWrap}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a heart-felt note..."
                placeholderTextColor={C.outline}
                multiline
                style={styles.note}
                maxLength={500}
              />
            </View>

            <View style={styles.ctaWrap}>
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                style={({ pressed }) => [
                  styles.cta,
                  !canSend && styles.ctaDisabled,
                  pressed && canSend && styles.ctaPressed,
                ]}
              >
                {sending ? (
                  <ActivityIndicator color={C.onPrimary} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={20} color={C.onPrimary} />
                    <Text style={styles.ctaLabel}>
                      {ctaLabel(selected, BLOOM_AI_ID)}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

function RecipientAvatar({
  kind,
  label,
  selected,
  onPress,
}: {
  kind: 'ai' | 'kindred';
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.avatarTile} hitSlop={4}>
      <View style={styles.avatarWrap}>
        <View
          style={[
            styles.avatar,
            kind === 'ai'
              ? { backgroundColor: C.primaryContainer }
              : { backgroundColor: C.surfaceContainerHigh },
            selected && styles.avatarSelected,
          ]}
        >
          <MaterialCommunityIcons
            name={kind === 'ai' ? 'auto-fix' : 'flower-tulip'}
            size={28}
            color={kind === 'ai' ? C.onPrimaryContainer : C.primary}
          />
        </View>
        {selected && (
          <View style={styles.checkBadge}>
            <MaterialCommunityIcons name="check" size={14} color={C.onPrimary} />
          </View>
        )}
      </View>
      <Text style={styles.avatarLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatShareBody(reel: SharedReelPayload, note: string): string {
  const caption = reel.caption.trim() || reel.quote.trim();
  const lines: string[] = [caption.length > 120 ? `${caption.slice(0, 117)}...` : caption];
  if (reel.quote && reel.caption) lines.push(`— ${reel.author}`);
  const trimmedNote = note.trim();
  if (trimmedNote) lines.push('', trimmedNote);
  return lines.join('\n');
}

// Composed as a natural-reading user message that still gives the AI everything
// it needs to lead: the quote, the author, the theme list (parsed from hashtags),
// and an explicit ask to open the conversation. Reads cleanly in chat history.
function formatBloomAiPrompt(reel: SharedReelPayload, note: string): string {
  const quote = reel.quote.trim();
  const caption = reel.caption.trim();
  const themes = extractThemes(caption);
  const text = quote || caption;

  const lines: string[] = [`I just watched this reel — "${text}" — ${reel.author}.`];
  if (themes.length > 0) {
    lines.push(`(Themes: ${themes.join(', ')})`);
  }

  const trimmedNote = note.trim();
  if (trimmedNote) {
    lines.push('', trimmedNote);
    lines.push('', 'Can you reflect on what this is touching and open up a conversation with me about it?');
  } else {
    lines.push('', 'Can you reflect on what this is touching and open up a conversation with me about it?');
  }

  return lines.join('\n');
}

function ctaLabel(selected: Set<string>, aiId: string): string {
  if (selected.size === 0) return 'Send';
  if (selected.size === 1) {
    return selected.has(aiId) ? 'Open with Bloom AI' : 'Send to Kindred Spirit';
  }
  return `Send to ${selected.size}`;
}

// Pull #Hashtags out of the caption as a readable theme list. Cheap, no NLP.
function extractThemes(caption: string): string[] {
  const matches = caption.match(/#\w+/g);
  if (!matches) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of matches) {
    const clean = tag.replace(/^#/, '');
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(40, 24, 20, 0.32)',
  },
  sheet: {
    backgroundColor: C.surfaceContainerLow,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#5C4742',
        shadowOpacity: 0.12,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: -8 },
      },
      android: { elevation: 24 },
    }),
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: C.onSurface,
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    backgroundColor: C.surfaceContainerHigh,
  },
  avatarRow: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 24,
    alignItems: 'center',
  },
  avatarTile: {
    alignItems: 'center',
    gap: 8,
    width: 72,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: C.primary,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.surfaceContainerLow,
  },
  avatarLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: C.onSurface,
    textAlign: 'center',
    maxWidth: 80,
  },
  loadingTile: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    maxWidth: 240,
  },
  emptyText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
  },
  noteWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  note: {
    backgroundColor: C.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    minHeight: 96,
    maxHeight: 160,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: C.onSurface,
    textAlignVertical: 'top',
  },
  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  cta: {
    height: 56,
    borderRadius: 9999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 6 },
    }),
  },
  ctaDisabled: {
    backgroundColor: C.outlineVariant,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaLabel: {
    color: C.onPrimary,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

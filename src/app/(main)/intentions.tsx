import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
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

import {
  useTodayIntention,
  useUpsertIntention,
} from '../../lib/queries/intentions';
import { useIntentionsStore, type IntentionTask } from '../../store/intentions';

// ─── Design tokens (1:1 with the daily-intentions HTML reference) ────────────
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
  secondary:              '#006970',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  tertiary:               '#a8315c',
  tertiaryContainer:      '#fa719c',
  tertiaryFixed:          '#ffd9e1',
  tertiaryFixedDim:       '#ffb1c4',
  onTertiaryFixed:        '#3f001a',
  onTertiaryFixedVariant: '#881645',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
} as const;

const HEADER_H = 64;

const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

const EVENING_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC6rYVsuX9OzUcUCB0jjAObR_VsbJbLRvjmnzEcBqS2TSDx6nG6wcveAg1R7nNYAiluQlaJEtiuS-OAgoQ6WeOz-nWeuNzziPWH4aWyyl9rsY0_LEMdHO1ym8TXH4kVhljhxzl2KNJFVT8_9c1ihtEyy6zf70-0Rn5rjXlJezQIEswG9BaOPIP1wueckzSih_J0x_W-XyehSxp9u7kuvmBH05GkcruGPzN98sIKVlfFCOmNKZJlEImc53zzT9q5Z-DPW1MtaUTBSVyY';

// ─── Bloom badge (breathing spa icon next to "Morning Focus") ─────────────────
function BloomBadge() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.85);

  useEffect(() => {
    const cfg = { duration: 4000, easing: Easing.inOut(Easing.quad) };
    scale.value = withRepeat(withTiming(1.06, cfg), -1, true);
    opacity.value = withRepeat(withTiming(1, cfg), -1, true);
  }, [opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[s.bloomBadge, animStyle]}>
      <MaterialCommunityIcons name="flower-outline" size={20} color={C.primary} />
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function IntentionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const today = useIntentionsStore((s) => s.today);
  const ensureFresh = useIntentionsStore((s) => s.ensureFresh);
  const setPrimary = useIntentionsStore((s) => s.setPrimary);
  const toggleTask = useIntentionsStore((s) => s.toggleTask);
  const addTask = useIntentionsStore((s) => s.addTask);
  const removeTask = useIntentionsStore((s) => s.removeTask);
  const setHonored = useIntentionsStore((s) => s.setHonored);
  const hydrateFromServer = useIntentionsStore((s) => s.hydrateFromServer);

  // Pull today's row from Supabase. When it lands, we patch the store so the
  // UI reflects whatever was persisted (cross-device, post-reinstall, etc.).
  const serverToday = useTodayIntention();
  const upsert = useUpsertIntention();

  // Hydrate once per server payload. We only overwrite when we get a real row;
  // a null response (no entry yet today) is treated as "use local defaults".
  // Skip while an upsert is in-flight — the local state is already ahead of
  // the server response that's about to land, and re-hydrating would clobber
  // an unsaved keystroke.
  useEffect(() => {
    if (!serverToday.data || upsert.isPending) return;
    hydrateFromServer({
      primary_text: serverToday.data.primary_text,
      tasks: serverToday.data.tasks,
      honored: serverToday.data.honored,
    });
  }, [serverToday.data, upsert.isPending, hydrateFromServer]);

  // Single source-of-truth write-through. Every mutating handler builds the
  // next-state in JS, calls the store, then fires this so the row stays in
  // sync. Errors are silent for now — the local optimistic write already
  // landed and will re-sync the next time the screen mounts.
  function persist(next: {
    primary: string;
    tasks: IntentionTask[];
    honored: boolean | null;
  }) {
    upsert.mutate({
      primary_text: next.primary,
      tasks: next.tasks,
      honored: next.honored,
    });
  }

  // Local draft of the textarea so users can edit freely; we commit to the
  // store either on "Set Focus" or on blur.
  const [draft, setDraft] = useState(today.primary);
  const [newTaskLabel, setNewTaskLabel] = useState('');

  // If the user crosses midnight while the app is open, refresh.
  useEffect(() => {
    ensureFresh();
  }, [ensureFresh]);

  // Keep the draft in sync when the day flips (today.primary becomes '').
  useEffect(() => {
    setDraft(today.primary);
  }, [today.primary]);

  const completedCount = today.tasks.filter((t) => t.done).length;
  const hasSavedPrimary = today.primary.trim().length > 0;

  function commitPrimary() {
    const trimmed = draft.trim();
    if (trimmed === today.primary) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPrimary(trimmed);
    persist({ primary: trimmed, tasks: today.tasks, honored: today.honored });
  }

  function onToggleTask(id: string) {
    void Haptics.selectionAsync();
    const nextTasks = today.tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t,
    );
    toggleTask(id);
    persist({ primary: today.primary, tasks: nextTasks, honored: today.honored });
  }

  function onAddTask() {
    const label = newTaskLabel.trim();
    if (!label) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextTasks: IntentionTask[] = [
      ...today.tasks,
      { id: `user-${Date.now()}`, label, done: false },
    ];
    addTask(label);
    setNewTaskLabel('');
    persist({ primary: today.primary, tasks: nextTasks, honored: today.honored });
  }

  function onRemoveTask(id: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextTasks = today.tasks.filter((t) => t.id !== id);
    removeTask(id);
    persist({ primary: today.primary, tasks: nextTasks, honored: today.honored });
  }

  function onHonored(value: boolean) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const nextHonored = today.honored === value ? null : value;
    setHonored(nextHonored);
    persist({ primary: today.primary, tasks: today.tasks, honored: nextHonored });
  }

  return (
    <View style={s.root}>
      {/* ─── Top App Bar ─── */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { paddingTop: insets.top, height: insets.top + HEADER_H }]}
      >
        <View style={s.topBarInner}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={C.primary} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Daily Intentions</Text>
          <View style={s.iconBtn} />
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + HEADER_H + 24, paddingBottom: insets.bottom + 140 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Morning Focus ── */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitlePrimary}>Morning Focus</Text>
            <BloomBadge />
          </View>

          <View style={s.focusCard}>
            <Text style={s.fieldLabel}>My Primary Intention for Today…</Text>
            <TextInput
              style={s.intentionInput}
              value={draft}
              onChangeText={setDraft}
              onBlur={commitPrimary}
              placeholder="e.g., I will move with patience."
              placeholderTextColor="rgba(85,67,62,0.45)"
              multiline
              maxLength={140}
              textAlignVertical="top"
            />
            <View style={s.focusFooter}>
              {hasSavedPrimary && (
                <View style={s.savedPill}>
                  <MaterialCommunityIcons name="check" size={14} color={C.onSecondaryContainer} />
                  <Text style={s.savedPillText}>Focus set</Text>
                </View>
              )}
              <TouchableOpacity
                style={[s.focusCta, !draft.trim() && { opacity: 0.45 }]}
                activeOpacity={0.88}
                disabled={!draft.trim()}
                onPress={() => { commitPrimary(); router.back(); }}
              >
                <Text style={s.focusCtaText}>Set Focus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── The To-Be List ── */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={s.section}>
          <View style={s.toBeHeader}>
            <MaterialCommunityIcons name="format-list-checks" size={22} color={C.secondary} />
            <Text style={s.sectionTitleSecondary}>The To-Be List</Text>
          </View>
          <Text style={s.toBeSub}>Small actions to nurture your intention.</Text>

          <View style={s.taskList}>
            {today.tasks.map((task) => {
              const done = task.done;
              return (
                <Pressable
                  key={task.id}
                  style={[s.taskRow, done && s.taskRowDone]}
                  onPress={() => onToggleTask(task.id)}
                >
                  <View style={[s.taskCheck, done && s.taskCheckDone]}>
                    {done && (
                      <MaterialCommunityIcons name="check" size={18} color={C.onPrimaryContainer} />
                    )}
                  </View>
                  <Text style={[s.taskLabel, done && s.taskLabelDone]} numberOfLines={2}>
                    {task.label}
                  </Text>
                  <TouchableOpacity
                    style={s.taskRemove}
                    hitSlop={8}
                    activeOpacity={0.7}
                    onPress={() => onRemoveTask(task.id)}
                  >
                    <MaterialCommunityIcons name="close" size={16} color={C.outline} />
                  </TouchableOpacity>
                </Pressable>
              );
            })}
          </View>

          {/* Add task */}
          <View style={s.addRow}>
            <TextInput
              style={s.addInput}
              value={newTaskLabel}
              onChangeText={setNewTaskLabel}
              onSubmitEditing={onAddTask}
              placeholder="Add another small action…"
              placeholderTextColor={C.outlineVariant}
              returnKeyType="done"
              blurOnSubmit
              maxLength={80}
            />
            <TouchableOpacity
              style={[s.addBtn, !newTaskLabel.trim() && { opacity: 0.45 }]}
              activeOpacity={0.85}
              disabled={!newTaskLabel.trim()}
              onPress={onAddTask}
            >
              <MaterialCommunityIcons name="plus" size={20} color={C.onPrimary} />
            </TouchableOpacity>
          </View>

          {today.tasks.length > 0 && (
            <Text style={s.progressNote}>
              {completedCount} of {today.tasks.length} honored
            </Text>
          )}
        </Animated.View>

        {/* ── Evening Reflection ── */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={s.section}>
          <View style={s.eveningCard}>
            <View style={s.eveningGlow} />

            <View style={s.eveningHeaderRow}>
              <MaterialCommunityIcons name="weather-sunset" size={22} color={C.onTertiaryFixedVariant} />
              <Text style={s.eveningTitle}>Evening Reflection</Text>
            </View>
            <Text style={s.eveningCopy}>Take a breath and look back on your day. How did it go?</Text>

            <View style={s.honoredCard}>
              <Text style={s.honoredQuestion} numberOfLines={2}>
                I honored my intention today.
              </Text>
              <View style={s.honoredButtons}>
                <TouchableOpacity
                  style={[
                    s.honoredBtn,
                    today.honored === false && s.honoredBtnNoActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => onHonored(false)}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={16}
                    color={today.honored === false ? C.onPrimary : C.onTertiaryFixedVariant}
                  />
                  <Text
                    style={[
                      s.honoredBtnText,
                      today.honored === false && { color: C.onPrimary },
                    ]}
                  >
                    Not today
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.honoredBtn,
                    today.honored === true && s.honoredBtnYesActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => onHonored(true)}
                >
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={today.honored === true ? C.onPrimaryContainer : C.onTertiaryFixedVariant}
                  />
                  <Text
                    style={[
                      s.honoredBtnText,
                      today.honored === true && { color: C.onPrimaryContainer },
                    ]}
                  >
                    Yes, I did
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Image
              source={{ uri: EVENING_IMAGE }}
              style={s.eveningImage}
              contentFit="cover"
              transition={400}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(255,248,246,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceContainer,
  },
  topBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 19,
    lineHeight: 24,
    color: C.primary,
    letterSpacing: -0.1,
  },

  // Scroll
  scroll: { paddingHorizontal: 24, gap: 32 },

  // Section base
  section: { gap: 14 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitlePrimary: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: C.primary,
    letterSpacing: -0.2,
  },
  sectionTitleSecondary: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: C.secondary,
    letterSpacing: -0.2,
  },
  bloomBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(232,131,107,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Morning Focus card
  focusCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 24,
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.30)',
    ...softShadow,
  },
  fieldLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  intentionInput: {
    backgroundColor: C.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    minHeight: 96,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 17,
    lineHeight: 24,
    color: C.onSurface,
    ...Platform.select({
      web: { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as object,
      default: {},
    }),
  },
  focusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: C.secondaryContainer,
  },
  savedPillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSecondaryContainer,
    letterSpacing: 0.3,
  },
  focusCta: {
    backgroundColor: C.primaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
    shadowColor: C.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  focusCtaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onPrimaryContainer,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // To-Be List
  toBeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toBeSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.onSurfaceVariant,
    marginTop: -6,
  },
  taskList: { gap: 10, marginTop: 4 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: 'rgba(250,220,213,0.35)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  taskRowDone: {
    backgroundColor: 'rgba(232,131,107,0.14)',
    borderColor: 'rgba(232,131,107,0.30)',
  },
  taskCheck: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(232,131,107,0.45)',
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckDone: {
    backgroundColor: C.primaryContainer,
    borderColor: C.primaryContainer,
  },
  taskLabel: {
    flex: 1,
    fontFamily: 'NunitoSans_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurface,
  },
  taskLabelDone: {
    color: C.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  taskRemove: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  // Add task row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  addInput: {
    flex: 1,
    height: 48,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 9999,
    paddingHorizontal: 18,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 18,
    color: C.onSurface,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.40)',
    ...Platform.select({
      web: { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as object,
      default: {},
    }),
  },
  addBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  progressNote: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.4,
    textAlign: 'right',
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Evening Reflection
  eveningCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: C.tertiaryFixed,
    borderRadius: 32,
    padding: 24,
    gap: 14,
    ...softShadow,
  },
  eveningGlow: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(250,113,156,0.22)',
  },
  eveningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eveningTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: C.onTertiaryFixed,
    letterSpacing: -0.2,
  },
  eveningCopy: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(136,22,69,0.85)',
  },
  honoredCard: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    gap: 14,
  },
  honoredQuestion: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: C.onTertiaryFixed,
    letterSpacing: -0.1,
  },
  honoredButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  honoredBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: 'rgba(136,22,69,0.10)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  honoredBtnNoActive: {
    backgroundColor: C.onTertiaryFixedVariant,
    borderColor: C.onTertiaryFixedVariant,
  },
  honoredBtnYesActive: {
    backgroundColor: C.primaryContainer,
    borderColor: C.primaryContainer,
  },
  honoredBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onTertiaryFixedVariant,
    letterSpacing: 0.3,
  },
  eveningImage: {
    width: '100%',
    height: 140,
    borderRadius: 20,
    marginTop: 6,
  },
});

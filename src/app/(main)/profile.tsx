import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { unregisterPushTokenForCurrentDevice } from '../../lib/queries/notifications';
import { useUnreadNotificationsCount } from '../../lib/queries/notifications-inbox';
import {
  useMyProfile,
  useProfileStats,
  useRecentActivity,
} from '../../lib/queries/profile';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { useUIStore } from '../../store/ui';

// ─── Design tokens (design/profile-screen.html is source of truth) ──────────
const C = {
  surface:                '#fff8f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainer:       '#ffe9e4',
  surfaceContainerHigh:   '#ffe2db',
  surfaceContainerHighest:'#fadcd5',
  primary:                '#994531',
  primaryContainer:       '#e8836b',
  primaryFixedDim:        '#ffb4a3',
  onPrimary:              '#ffffff',
  onPrimaryContainer:     '#641e0e',
  secondary:              '#006970',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  tertiary:               '#a8315c',
  tertiaryContainer:      '#fa719c',
  onTertiaryContainer:    '#700034',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
  error:                  '#ba1a1a',
  trendUp:                '#16a34a',
} as const;

type MciName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const HEADER_H = 64;
const AVATAR_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDXoHXvNMhgIAmQbIzFpCinOQq4zWWsdUMKOuRFQ6s2GF_IB8Eiv7KrHBD3RlpEBUAkl7IE-5xjqPqp2_znocjwNJCEBEMfTmVw-OKYaqhE-vgcxolZu5qnupwZWBjjTEWeOCjXgZLADBFzBZcSgYfKtKwPYbaXyW-ohp7Xa0uuBoKozdlZqH4hbDTJL-tdhS9MZ4oRKUaNR5bQ-dMJk8TY-FLVVhG-Uru4JpUjLaMOzCVmU478AunwThmZaF58CYpv3ZmbJmwWw9MW';

// ─── Static data ────────────────────────────────────────────────────────────

interface Milestone {
  key: string;
  icon: MciName;
  label: string;
  bg: string;
  iconColor: string;
  borderColor: string;
  locked?: boolean;
}

// Builds the milestones list dynamically from real stats so locked/unlocked
// state always tells the truth.
function buildMilestones(
  currentStreak: number,
  checkinsTotal: number,
  journalsTotal: number,
  keptKindredCount: number,
): Milestone[] {
  return [
    {
      key: 'firstbloom',
      icon: 'sprout',
      label: 'First Bloom',
      bg: checkinsTotal >= 1 ? C.primaryContainer : C.surfaceContainerHighest,
      iconColor: checkinsTotal >= 1 ? C.onPrimaryContainer : C.onSurfaceVariant,
      borderColor: checkinsTotal >= 1 ? 'rgba(153,69,49,0.20)' : C.outlineVariant,
      locked: checkinsTotal < 1,
    },
    {
      key: 'streak7',
      icon: 'trophy-award',
      label: '7 Day Streak',
      bg: currentStreak >= 7 ? C.primaryContainer : C.surfaceContainerHighest,
      iconColor: currentStreak >= 7 ? C.onPrimaryContainer : C.onSurfaceVariant,
      borderColor: currentStreak >= 7 ? 'rgba(153,69,49,0.20)' : C.outlineVariant,
      locked: currentStreak < 7,
    },
    {
      key: 'journal10',
      icon: 'book-open-page-variant',
      label: 'Journal Practice',
      bg: journalsTotal >= 10 ? C.secondaryContainer : C.surfaceContainerHighest,
      iconColor: journalsTotal >= 10 ? C.onSecondaryContainer : C.onSurfaceVariant,
      borderColor: journalsTotal >= 10 ? 'rgba(0,105,112,0.20)' : C.outlineVariant,
      locked: journalsTotal < 10,
    },
    {
      key: 'kindred',
      icon: 'flower-tulip',
      label: 'Kindred Spirit',
      bg: keptKindredCount >= 1 ? C.tertiaryContainer : C.surfaceContainerHighest,
      iconColor: keptKindredCount >= 1 ? C.onTertiaryContainer : C.onSurfaceVariant,
      borderColor: keptKindredCount >= 1 ? 'rgba(168,49,92,0.20)' : C.outlineVariant,
      locked: keptKindredCount < 1,
    },
  ];
}

interface SettingItem {
  key: string;
  icon: MciName;
  label: string;
}

const SETTINGS_GENERAL: SettingItem[] = [
  { key: 'personal',     icon: 'account-outline',              label: 'Personal Information' },
  { key: 'notifs',       icon: 'bell-ring-outline',            label: 'Notification Preferences' },
  { key: 'subscription', icon: 'card-account-details-outline', label: 'Subscription Status' },
];

const SETTINGS_PRIVACY: SettingItem[] = [
  { key: 'security', icon: 'lock-outline',         label: 'Privacy & Security' },
  { key: 'help',     icon: 'help-circle-outline',  label: 'Help & Support' },
];

// ─── Avatar with gradient ring ──────────────────────────────────────────────

function GradientAvatar({ uri }: { uri: string | null }) {
  const SIZE = 128;
  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0" stopColor={C.primary} />
            <Stop offset="1" stopColor={C.secondary} />
          </LinearGradient>
        </Defs>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#ringGrad)" />
      </Svg>
      <View style={s.avatarInner}>
        {uri ? (
          <Image source={{ uri }} style={s.avatarImg} contentFit="cover" />
        ) : (
          <View style={[s.avatarImg, { backgroundColor: C.primaryFixedDim, alignItems: 'center', justifyContent: 'center' }]}>
            <MaterialCommunityIcons name="flower-tulip" size={56} color={C.primary} />
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const openDrawer = useUIStore((s) => s.openDrawer);

  const myProfile = useMyProfile();
  const stats = useProfileStats();
  const activity = useRecentActivity(5);

  async function handleSignOut() {
    try { await unregisterPushTokenForCurrentDevice(); } catch { /* ignore */ }
    if (supabase) await supabase.auth.signOut();
    signOut();
    router.replace('/(auth)/login');
  }

  // Prefer the freshly-fetched server alias; fall back to whatever auth gave
  // us, then to a quiet placeholder so the screen never looks broken.
  // Prefer the user-chosen display_name when set; alias is the canonical
  // anonymous identity and always present.
  const profileDisplayName = (myProfile.data as { display_name?: string | null } | null | undefined)?.display_name;
  const displayName =
    profileDisplayName?.trim()
    || myProfile.data?.anonymous_alias
    || user?.anonymousAlias
    || 'Bloom';

  const unreadCount = useUnreadNotificationsCount().data;

  // "Level" is a soft proxy for engagement until we have a real XP system.
  // Every 10 combined check-ins + journals nudges it up. Starts at L1.
  const totalActions =
    (stats.data?.checkinsTotal ?? 0) + (stats.data?.journalsTotal ?? 0);
  const level = 1 + Math.floor(totalActions / 10);

  // Subtitle under the name — uses joined date when available, alias bio as a
  // last resort. Keeps the line from feeling generic.
  const joinedLabel = useMemo(() => {
    if (!myProfile.data?.joined_at) return '"Blooming at my own pace."';
    const joined = new Date(myProfile.data.joined_at);
    return `Blooming since ${joined.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    })}`;
  }, [myProfile.data?.joined_at]);

  const milestones = useMemo(() => buildMilestones(
    stats.data?.currentStreak ?? 0,
    stats.data?.checkinsTotal ?? 0,
    stats.data?.journalsTotal ?? 0,
    stats.data?.keptKindredCount ?? 0,
  ), [
    stats.data?.currentStreak,
    stats.data?.checkinsTotal,
    stats.data?.journalsTotal,
    stats.data?.keptKindredCount,
  ]);

  function onRefresh() {
    void myProfile.refetch();
    void stats.refetch();
    void activity.refetch();
  }

  return (
    <View style={s.root}>
      {/* ─── Fixed Top App Bar ─── */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { paddingTop: insets.top, height: insets.top + HEADER_H }]}
      >
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={openDrawer}>
              <MaterialCommunityIcons name="menu" size={24} color={C.primary} />
            </TouchableOpacity>
            <Text style={s.brand}>InnerBloom</Text>
          </View>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(main)/notifications')}
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color={C.primary} />
            {(unreadCount ?? 0) > 0 ? <View style={s.profileBellDot} /> : null}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + HEADER_H + 24, paddingBottom: 160 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={
              myProfile.isRefetching || stats.isRefetching || activity.isRefetching
            }
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
      >
        {/* ─── Profile Header ─── */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={s.profileHeader}>
          <TouchableOpacity
            style={s.avatarWrap}
            activeOpacity={0.85}
            onPress={() => router.push('/(main)/edit-profile')}
          >
            <GradientAvatar
              uri={(myProfile.data as { avatar_url?: string | null } | null | undefined)?.avatar_url ?? null}
            />
            <View style={s.editBtn}>
              <MaterialCommunityIcons name="pencil" size={18} color={C.onPrimary} />
            </View>
          </TouchableOpacity>

          <View style={s.nameWrap}>
            <View style={s.nameRow}>
              <Text style={s.name}>{displayName}</Text>
              <View style={s.levelBadge}>
                <Text style={s.levelText}>Level {level}</Text>
              </View>
            </View>
            <Text style={s.bio}>{joinedLabel}</Text>
            {myProfile.data?.city || myProfile.data?.institution_name ? (
              <Text style={s.bioMeta}>
                {[
                  myProfile.data?.institution_name,
                  myProfile.data?.city,
                ].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
        </Animated.View>

        {/* ─── Growth Journey ─── */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Growth Journey</Text>
            <TouchableOpacity style={s.linkRow} activeOpacity={0.7}>
              <Text style={s.linkText}>Insights</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color={C.primary} />
            </TouchableOpacity>
          </View>

          <View style={s.statGrid}>
            <View style={s.statCard}>
              <View>
                <View style={s.statLabelRow}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={C.primary} />
                  <Text style={[s.statLabel, { color: C.primary }]}>Check-ins</Text>
                </View>
                <Text style={s.statValue}>
                  {stats.isLoading ? '…' : stats.data?.checkinsTotal ?? 0}
                </Text>
              </View>
              <View style={s.statTrendRow}>
                <MaterialCommunityIcons
                  name={
                    (stats.data?.checkinsThisMonth ?? 0) > 0
                      ? 'trending-up'
                      : 'minus'
                  }
                  size={14}
                  color={(stats.data?.checkinsThisMonth ?? 0) > 0 ? C.trendUp : C.outline}
                />
                <Text
                  style={[
                    s.statTrendText,
                    {
                      color:
                        (stats.data?.checkinsThisMonth ?? 0) > 0
                          ? C.trendUp
                          : C.outline,
                    },
                  ]}
                >
                  {stats.data?.checkinsThisMonth ?? 0} this month
                </Text>
              </View>
            </View>

            <View style={s.statCard}>
              <View>
                <View style={s.statLabelRow}>
                  <MaterialCommunityIcons name="book-open-page-variant-outline" size={20} color={C.tertiary} />
                  <Text style={[s.statLabel, { color: C.tertiary }]}>Journals</Text>
                </View>
                <Text style={s.statValue}>
                  {stats.isLoading ? '…' : stats.data?.journalsTotal ?? 0}
                </Text>
              </View>
              <Text style={s.statFootnote}>
                {(stats.data?.currentStreak ?? 0) > 0
                  ? `${stats.data?.currentStreak} day streak`
                  : `${stats.data?.journalsThisMonth ?? 0} this month`}
              </Text>
            </View>
          </View>

          <View style={s.communityRow}>
            <View style={s.communityLeft}>
              <View style={s.communityIcon}>
                <MaterialCommunityIcons name="heart" size={22} color={C.secondary} />
              </View>
              <View>
                <Text style={s.communityTitle}>Hugs received</Text>
                <Text style={s.communitySub}>
                  {(stats.data?.hugsReceived ?? 0) === 0
                    ? 'Share a moment to receive your first hug'
                    : `${formatCompact(stats.data?.hugsReceived ?? 0)} from kindred souls`}
                </Text>
              </View>
            </View>

            <View style={s.kindredCountChip}>
              <MaterialCommunityIcons name="flower-tulip" size={16} color={C.primary} />
              <Text style={s.kindredCountText}>
                {stats.data?.keptKindredCount ?? 0}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── Milestones ─── */}
        <Animated.View entering={FadeInDown.delay(140).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Milestones</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.linkText}>View All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.milestonesScroll}
          >
            {milestones.map((m) => (
              <View key={m.key} style={[s.milestoneItem, m.locked && { opacity: 0.4 }]}>
                <View
                  style={[
                    s.milestoneCircle,
                    { backgroundColor: m.bg, borderColor: m.borderColor },
                  ]}
                >
                  <MaterialCommunityIcons name={m.icon} size={30} color={m.iconColor} />
                </View>
                <Text style={s.milestoneLabel}>{m.label}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ─── InnerBloom+ Premium ─── */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={s.premiumCard}>
          <MaterialCommunityIcons
            name="spa-outline"
            size={100}
            color="rgba(255,180,163,0.15)"
            style={s.premiumDeco}
          />
          <View style={s.premiumGlowA} />
          <View style={s.premiumGlowB} />

          <View style={s.premiumContent}>
            <View style={s.premiumTitleRow}>
              <MaterialCommunityIcons name="star" size={22} color={C.primaryFixedDim} />
              <Text style={s.premiumTitle}>InnerBloom+</Text>
            </View>
            <Text style={s.premiumBody}>
              Deepen your growth with exclusive professional tools.
            </Text>

            <View style={s.premiumList}>
              <View style={s.premiumListItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={C.primaryFixedDim} />
                <Text style={s.premiumListText}>AI-Powered Voice Journaling</Text>
              </View>
              <View style={s.premiumListItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={C.primaryFixedDim} />
                <Text style={s.premiumListText}>Weekly Advanced Insights</Text>
              </View>
            </View>

            <TouchableOpacity style={s.premiumCta} activeOpacity={0.9}>
              <Text style={s.premiumCtaText}>Explore Premium Plans</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={C.onPrimaryContainer} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ─── Recent Activity ─── */}
        <Animated.View entering={FadeInDown.delay(220).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Recent Activity</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.linkText}>Full History</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 12 }}>
            {activity.isLoading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : (activity.data?.length ?? 0) === 0 ? (
              <TouchableOpacity
                style={s.activityEmpty}
                activeOpacity={0.85}
                onPress={() => router.push('/(main)/journal')}
              >
                <MaterialCommunityIcons name="note-edit-outline" size={20} color={C.primary} />
                <Text style={s.activityEmptyText}>
                  Write your first reflection
                </Text>
              </TouchableOpacity>
            ) : (
              activity.data!.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={s.activityRow}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(main)/journal')}
                >
                  <View style={s.dateBadge}>
                    <Text style={s.dateMonth}>{a.monthLabel}</Text>
                    <Text style={s.dateDay}>{a.dayLabel}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityTitle}>{a.title}</Text>
                    <Text style={s.activitySnippet} numberOfLines={1}>
                      {a.snippet}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={C.outline} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </Animated.View>

        {/* ─── Account Settings ─── */}
        <Animated.View entering={FadeInDown.delay(260).springify()} style={s.section}>
          <Text style={s.sectionHeading}>Account Settings</Text>

          <View style={{ gap: 24, marginTop: 16 }}>
            <View style={{ gap: 8 }}>
              <Text style={s.settingsCategory}>GENERAL</Text>
              <View style={s.settingsCard}>
                {SETTINGS_GENERAL.map((item, idx) => (
                  <View key={item.key}>
                    {idx > 0 && <View style={s.settingsDivider} />}
                    <TouchableOpacity style={s.settingsItem} activeOpacity={0.7}>
                      <View style={s.settingsItemLeft}>
                        <MaterialCommunityIcons name={item.icon} size={22} color={C.onSurface} style={{ opacity: 0.7 }} />
                        <Text style={s.settingsItemText}>{item.label}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={22} color={C.outline} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={s.settingsCategory}>PRIVACY & SUPPORT</Text>
              <View style={s.settingsCard}>
                {SETTINGS_PRIVACY.map((item, idx) => (
                  <View key={item.key}>
                    {idx > 0 && <View style={s.settingsDivider} />}
                    <TouchableOpacity style={s.settingsItem} activeOpacity={0.7}>
                      <View style={s.settingsItemLeft}>
                        <MaterialCommunityIcons name={item.icon} size={22} color={C.onSurface} style={{ opacity: 0.7 }} />
                        <Text style={s.settingsItemText}>{item.label}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={22} color={C.outline} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ─── Recent Notifications ─── */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Recent Notifications</Text>
          </View>

          <View style={s.notifPlaceholder}>
            <MaterialCommunityIcons name="bell-sleep-outline" size={28} color={C.outline} />
            <Text style={s.notifPlaceholderTitle}>No notifications yet</Text>
            <Text style={s.notifPlaceholderBody}>
              Push notifications for hugs, match-found, and new messages are
              coming soon.
            </Text>
          </View>
        </Animated.View>

        {/* ─── Sign Out + Footer ─── */}
        <Animated.View entering={FadeInDown.delay(340).springify()} style={s.footer}>
          <TouchableOpacity
            style={s.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="logout" size={18} color={C.error} />
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center', opacity: 0.4 }}>
            <Text style={s.versionTop}>InnerBloom v2.4.0 (Gold)</Text>
            <Text style={s.versionBottom}>Designed for peace of mind.</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },
  scroll: {
    paddingHorizontal: 24,
    gap: 32,
  },

  // ── Top app bar ────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(255,248,246,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(219,193,187,0.20)',
  },
  topBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brand: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    color: C.primary,
    letterSpacing: -0.2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  profileBellDot: {
    position: 'absolute',
    top: 9, right: 9,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: C.primary,
    borderWidth: 2, borderColor: C.surface,
  },

  // ── Profile header ─────────────────────────────────────────────────────
  profileHeader: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 8,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarInner: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: C.surface,
  },
  avatarImg: {
    flex: 1,
  },
  editBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: C.surface,
    shadowColor: '#5C4742',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nameWrap: {
    alignItems: 'center',
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
    color: C.onSurface,
  },
  levelBadge: {
    backgroundColor: C.tertiaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  levelText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.28,
    color: C.onTertiaryContainer,
  },
  bio: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 15,
    color: C.onSurfaceVariant,
  },

  // ── Sections ───────────────────────────────────────────────────────────
  section: {
    gap: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.onSurface,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.primary,
    letterSpacing: 0.2,
  },

  // ── Stat cards ─────────────────────────────────────────────────────────
  statGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minHeight: 140,
    padding: 20,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.30)',
    justifyContent: 'space-between',
    shadowColor: '#5C4742',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  statValue: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    color: C.onSurface,
    letterSpacing: -0.32,
  },
  statTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTrendText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  statFootnote: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },

  // ── Community Impact ───────────────────────────────────────────────────
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(153,69,49,0.10)',
  },
  communityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  communityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(144,242,252,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  communitySub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  stackDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.surface,
    marginLeft: -8,
  },
  stackDotCount: {
    backgroundColor: C.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackDotText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    color: C.onSurfaceVariant,
  },

  // ── Milestones ─────────────────────────────────────────────────────────
  milestonesScroll: {
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  milestoneItem: {
    width: 96,
    alignItems: 'center',
    gap: 8,
  },
  milestoneCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#5C4742',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  milestoneLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 15,
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // ── Premium card ───────────────────────────────────────────────────────
  premiumCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 28,
    borderRadius: 24,
    backgroundColor: C.onSurface,
    borderWidth: 3,
    borderColor: 'rgba(232,131,107,0.20)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  premiumDeco: {
    position: 'absolute',
    right: 16,
    top: 24,
    opacity: 0.25,
  },
  premiumGlowA: {
    position: 'absolute',
    right: -60,
    top: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(153,69,49,0.25)',
  },
  premiumGlowB: {
    position: 'absolute',
    left: -60,
    bottom: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0,105,112,0.15)',
  },
  premiumContent: {
    position: 'relative',
    zIndex: 10,
    gap: 12,
  },
  premiumTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.surface,
  },
  premiumBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,248,246,0.90)',
    maxWidth: 280,
  },
  premiumList: {
    gap: 8,
    marginTop: 4,
  },
  premiumListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumListText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    color: 'rgba(255,248,246,0.80)',
  },
  premiumCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primaryContainer,
    paddingVertical: 14,
    borderRadius: 9999,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  premiumCtaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.4,
    color: C.onPrimaryContainer,
  },

  // ── Recent Activity ────────────────────────────────────────────────────
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.20)',
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    color: C.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  dateDay: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18,
    color: C.onSurfaceVariant,
    lineHeight: 22,
  },
  activityTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  activitySnippet: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },

  // ── Account settings ───────────────────────────────────────────────────
  settingsCategory: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    color: C.primary,
    paddingHorizontal: 8,
    letterSpacing: 1.2,
  },
  settingsCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.20)',
    overflow: 'hidden',
    shadowColor: '#5C4742',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingsItemText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(219,193,187,0.40)',
    marginLeft: 16,
  },

  // ── Notifications ──────────────────────────────────────────────────────
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainerHigh,
  },
  tabActive: {
    backgroundColor: C.primary,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: C.onPrimary,
  },
  notifList: {
    gap: 12,
  },
  notifCard: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.20)',
    shadowColor: '#5C4742',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  notifIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 2,
  },
  notifTitle: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  notifTime: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    color: C.outline,
  },
  notifDesc: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
  },

  // ── Footer ─────────────────────────────────────────────────────────────
  footer: {
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 16,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.25)',
  },
  signOutText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.error,
    letterSpacing: 0.2,
  },
  versionTop: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    color: C.onSurfaceVariant,
    letterSpacing: 0.4,
  },
  versionBottom: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 10,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },

  // ── Bio meta (institution · city) ──────────────────────────────────────
  bioMeta: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    color: C.outline,
    marginTop: 2,
  },

  // ── Kindred count chip on Hugs row ─────────────────────────────────────
  kindredCountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,218,210,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  kindredCountText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.primary,
    letterSpacing: 0.2,
  },

  // ── Activity empty state ───────────────────────────────────────────────
  activityEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.30)',
    borderStyle: 'dashed',
  },
  activityEmptyText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.primary,
    letterSpacing: 0.2,
  },

  // ── Notifications placeholder ──────────────────────────────────────────
  notifPlaceholder: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.25)',
  },
  notifPlaceholderTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    color: C.onSurface,
  },
  notifPlaceholderBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

// Renders counts compactly: 1.2k, 24, 5.4M. Stops feeling exact at 1k+, which
// matches how users actually read these things.
function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = n / 1000;
    return (v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '')) + 'k';
  }
  const v = n / 1_000_000;
  return (v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '')) + 'M';
}

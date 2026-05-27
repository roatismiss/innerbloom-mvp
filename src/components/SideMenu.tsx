import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import { usePendingKindredRequests } from '../lib/queries/kindred';
import { unregisterPushTokenForCurrentDevice } from '../lib/queries/notifications';
import { useAuthStore } from '../store/auth';
import { useUIStore } from '../store/ui';

// ─── Design tokens (1:1 with the side-nav HTML reference) ────────────────────
const C = {
  surface:                '#fff8f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainer:       '#ffe9e4',
  surfaceContainerHigh:   '#ffe2db',
  primary:                '#994531',
  primaryFixed:           '#ffdad2',
  primaryFixedVariant:    '#7a2e1d',
  onPrimaryFixed:         '#3d0600',
  primaryContainer:       '#e8836b',
  tertiary:               '#a8315c',
  tertiaryContainer:      '#fa719c',
  onTertiaryContainer:    '#700034',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
  error:                  '#ba1a1a',
  errorContainer:         '#ffdad6',
} as const;

const PROFILE_FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuApSgPTkTEtRCoihcOFOolOJH8DpWq-xWNDquVXQDNU_Ue1pgQrECRouxEatRFVytCZNFSpHYHWs1O6VCd3CE-BMRb8sf568yFdukyR1ckduL8WCBSo9puySCIUTvhgBWouEOsl-NKiQzkhHy2kyRLHs1S6cCUvE3KFfciDl-0hJ9UXcYGclhIF22JyFdJ8QK6Rrmw1jzCAflS5rWLJX48OhSjXc0TCSutYK_T_Y9ChlB8btkRzzwf7by00imVljDM4_a9grOEwB3qV';

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface NavItem {
  key: string;
  label: string;
  icon: Mci;
  route?: string;
  badge?: string;
  badgeColor?: string;
  iconColor?: string;
  comingSoon?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { key: 'garden',     label: 'Soul Garden',        icon: 'flower-tulip-outline', route: '/(main)/garden' },
  { key: 'analytics',  label: 'Mood Analytics',     icon: 'chart-line',           route: '/(main)/dashboard' },
  { key: 'resources',  label: 'Resource Library',   icon: 'book-open-variant',    route: '/(main)/resources' },
  { key: 'therapists', label: 'Therapist Network',  icon: 'medical-bag',          comingSoon: true },
  { key: 'intentions', label: 'Daily Intentions',   icon: 'spa-outline',          route: '/(main)/intentions' },
];

const SECONDARY_NAV: NavItem[] = [
  { key: 'settings', label: 'Settings & Privacy', icon: 'cog-outline' },
  { key: 'premium',  label: 'Premium Status',     icon: 'crown-outline', badge: 'Active', badgeColor: C.tertiary, iconColor: C.tertiary },
  { key: 'help',     label: 'Help & Support',     icon: 'help-circle-outline' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export function SideMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const drawerOpen = useUIStore((s) => s.drawerOpen);
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const pendingKindred = usePendingKindredRequests();
  const pendingCount = pendingKindred.data?.length ?? 0;

  // Inject live badge into the Soul Garden nav row.
  const primaryNav = PRIMARY_NAV.map((item) =>
    item.key === 'garden' && pendingCount > 0
      ? {
          ...item,
          badge: String(pendingCount),
          badgeColor: C.primary,
        }
      : item,
  );

  // We render the drawer continuously so we can play an exit animation, then
  // unmount via `mounted`.
  const progress = useSharedValue(0); // 0 = closed, 1 = open

  useEffect(() => {
    progress.value = withTiming(drawerOpen ? 1 : 0, {
      duration: 280,
      easing: Easing.bezier(0.32, 0.72, 0.32, 1),
    });
  }, [drawerOpen, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * -360 }],
    opacity: progress.value,
  }));

  // Don't paint at all if fully closed (saves layout cost on every screen).
  // We use a tiny epsilon because withTiming may settle just above 0.
  const renderEpsilon = useAnimatedStyle(() => ({
    display: progress.value > 0.001 ? 'flex' : 'none',
  }));

  function go(item: NavItem) {
    void Haptics.selectionAsync();
    closeDrawer();
    if (item.comingSoon || !item.route) return;
    // tiny delay so the drawer animates out before the route transitions
    setTimeout(() => router.push(item.route as never), 150);
  }

  async function handleSignOut() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    closeDrawer();
    // Best-effort: drop the push token before tearing down the session so
    // the user doesn't keep getting pushes meant for the account they left.
    try { await unregisterPushTokenForCurrentDevice(); } catch { /* ignore */ }
    if (supabase) {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
    }
    signOut();
    setTimeout(() => router.replace('/(auth)/login'), 150);
  }

  function backdropTap() {
    closeDrawer();
  }

  const displayName = user?.anonymousAlias ?? 'Maya Chen';

  return (
    <Animated.View style={[s.host, renderEpsilon]} pointerEvents="box-none">
      {/* Backdrop — tap to dismiss */}
      <Animated.View style={[s.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={backdropTap} />
      </Animated.View>

      {/* Sliding panel */}
      <Animated.View style={[s.panel, panelStyle]}>
        <View style={[s.panelInner, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          {/* Close button */}
          <View style={s.closeRow}>
            <TouchableOpacity
              style={s.closeBtn}
              activeOpacity={0.7}
              onPress={() => {
                void Haptics.selectionAsync();
                closeDrawer();
              }}
            >
              <MaterialCommunityIcons name="close" size={22} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Profile card */}
          <View style={s.profileRow}>
            <View style={s.avatarWrap}>
              <Image
                source={{ uri: PROFILE_FALLBACK_AVATAR }}
                style={s.avatar}
                contentFit="cover"
              />
              <View style={s.lvlBadge}>
                <Text style={s.lvlText}>LVL 7</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profileName} numberOfLines={1}>{displayName}</Text>
              <Text style={s.profileTier}>Gold Member</Text>
            </View>
          </View>

          {/* Scrollable nav */}
          <ScrollView
            contentContainerStyle={s.navScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 4 }}>
              {primaryNav.map((item) => (
                <NavRow key={item.key} item={item} onPress={() => go(item)} variant="primary" />
              ))}
            </View>

            <View style={s.divider} />

            <View style={{ gap: 4 }}>
              {SECONDARY_NAV.map((item) => (
                <NavRow key={item.key} item={item} onPress={() => go(item)} variant="secondary" />
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity
              style={s.signOutBtn}
              activeOpacity={0.85}
              onPress={handleSignOut}
            >
              <MaterialCommunityIcons name="logout" size={18} color={C.error} />
              <Text style={s.signOutText}>Log Out</Text>
            </TouchableOpacity>
            <Text style={s.version}>InnerBloom Version 2.4.0 (Build 882)</Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── NavRow ──────────────────────────────────────────────────────────────────
function NavRow({
  item,
  onPress,
  variant,
}: {
  item: NavItem;
  onPress: () => void;
  variant: 'primary' | 'secondary';
}) {
  return (
    <TouchableOpacity style={s.navRow} activeOpacity={0.75} onPress={onPress}>
      <View style={s.navRowLeft}>
        <MaterialCommunityIcons
          name={item.icon}
          size={22}
          color={item.iconColor ?? C.onSurfaceVariant}
        />
        <Text
          style={[
            variant === 'primary' ? s.navLabelLg : s.navLabelMd,
            item.comingSoon && { color: C.outlineVariant },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </View>
      {item.badge && (
        <Text style={[s.navBadge, item.badgeColor && { color: item.badgeColor }]}>
          {item.badge}
        </Text>
      )}
      {item.comingSoon && (
        <Text style={s.soon}>Soon</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(40,24,20,0.32)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '90%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,248,246,0.98)',
    borderTopRightRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#5C4742',
    shadowOpacity: 0.25,
    shadowRadius: 32,
    shadowOffset: { width: 12, height: 0 },
    elevation: 20,
  },
  panelInner: {
    flex: 1,
  },

  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },

  // Profile row
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 28,
  },
  avatarWrap: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: C.primaryFixed,
  },
  lvlBadge: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    backgroundColor: C.tertiaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  lvlText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 9,
    lineHeight: 12,
    color: C.onTertiaryContainer,
    letterSpacing: 0.6,
  },
  profileName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 24,
    color: C.onSurface,
    letterSpacing: -0.1,
  },
  profileTier: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.primaryFixedVariant,
    opacity: 0.7,
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // Nav rows
  navScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 9999,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  navLabelLg: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: C.onSurfaceVariant,
    letterSpacing: -0.05,
  },
  navLabelMd: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: C.onSurfaceVariant,
  },
  navBadge: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
    color: C.tertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  soon: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 14,
    color: C.outlineVariant,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(219,193,187,0.55)',
    marginHorizontal: 16,
    marginVertical: 16,
  },

  // Footer
  footer: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(219,193,187,0.30)',
    backgroundColor: 'rgba(255,255,255,0.50)',
    gap: 8,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.25)',
  },
  signOutText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.error,
    letterSpacing: 0.3,
  },
  version: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 14,
    color: C.onSurfaceVariant,
    opacity: 0.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingTop: 4,
  },
});

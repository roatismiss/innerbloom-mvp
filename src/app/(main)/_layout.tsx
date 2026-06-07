import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { aiInputRef } from '../../lib/ai-input-ref';
import { SideMenu } from '../../components/SideMenu';
import { useAuthStore } from '../../store/auth';

const C = {
  surface:               '#fff8f6',
  surfaceRaised:         '#ffffff',
  // Active tab pill is warm-tonal (primaryFixed) so it lives in the same family
  // as the Bloom center FAB and the rest of the brand, instead of the cyan
  // secondaryContainer which read as out-of-palette against the peach bg.
  activePillBg:          '#ffdad2',
  activePillFg:          '#994531',
  onSurfaceVariant:      '#55433e',
  outline:               '#88726d',
  primary:               '#994531',
} as const;

type MciName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface TabDef {
  name: string;
  label: string;
  icon: MciName;
  iconFocused: MciName;
}

const TABS: TabDef[] = [
  { name: 'dashboard',    label: 'Dashboard',  icon: 'home-outline',          iconFocused: 'home'              },
  { name: 'community',    label: 'Community',  icon: 'account-group-outline', iconFocused: 'account-group'     },
  // Center tab. Label now matches its destination screen ("Soul Match") instead
  // of the old "Bloom" (which collided with the AI companion, also named Bloom).
  // Icon swapped off the yin-yang (read as new-agey, out of the wellness
  // register) to a two-hearts glyph that plainly signals human connection.
  { name: 'soul-match',   label: 'Match',      icon: 'heart-multiple-outline',iconFocused: 'heart-multiple'    },
  { name: 'reels',        label: 'Reels',      icon: 'play-circle-outline',   iconFocused: 'play-circle'       },
  { name: 'ai-companion', label: 'AI',         icon: 'head-heart-outline',    iconFocused: 'head-heart'        },
];

// Screens that exist as routes but must not appear in the tab bar
const HIDDEN = ['today', 'checkin', 'bloom-ai', 'breathing', 'body-scan', 'journal', 'profile', 'feed', 'bloom', 'bloom-circle', 'circle', 'circle-burnout', 'circle-mindfulness', 'circle-depression', 'circle-grief', 'circle-recovery', 'reflections', 'intentions', 'resources', 'garden', 'post-composer', 'article', 'notifications', 'edit-profile', 'insights', 'settings'];

function TabIcon({
  label, icon, iconFocused, focused, isCenter,
}: {
  label: string; icon: MciName; iconFocused: MciName; focused: boolean; isCenter: boolean;
}) {
  if (isCenter) {
    return (
      <View style={[s.centerBtn, focused && s.centerBtnActive]}>
        <MaterialCommunityIcons
          name={focused ? iconFocused : icon}
          size={24}
          color="#ffffff"
        />
      </View>
    );
  }
  if (focused) {
    return (
      <View style={s.activePill}>
        <MaterialCommunityIcons name={iconFocused} size={22} color={C.activePillFg} />
        <Text style={s.activeLabel}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={s.idleTab}>
      <MaterialCommunityIcons name={icon} size={22} color={C.onSurfaceVariant} />
      <Text style={s.idleLabel}>{label}</Text>
    </View>
  );
}

export default function MainLayout() {
  const insets = useSafeAreaInsets();

  // ── Auth guard ──────────────────────────────────────────────────────────
  // On web/PWA, expo-router maps URLs directly to routes, so a hard refresh,
  // a deep link, or the home-screen shortcut can mount a (main) screen WITHOUT
  // ever passing through the index splash that normally gates auth. Without
  // this guard, a logged-out user lands on an empty authenticated screen with
  // no way back to login. We re-assert the routing rules here so the group is
  // self-protecting regardless of entry point.
  const authLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  // Bottom padding: use the home-indicator inset when available (iOS PWA / native),
  // fall back to 16. This prevents React Navigation from applying the inset as a
  // separate offset that raises the bar and leaves a gap below it.
  const tabPad = Math.max(insets.bottom, 16);
  const tabH = 14 + 50 + tabPad; // paddingTop + icon zone + bottom safe area

  // `tabBarHideOnKeyboard: true` is unreliable on iOS, so we mirror the behavior
  // manually: hide the bar on `keyboardWillShow`, restore on `keyboardWillHide`.
  // This lets chat screens (AI, Bloom) glue the input directly to the keyboard,
  // matching the ChatGPT/iMessage pattern.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEv, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEv, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const dynTab = { height: tabH, paddingBottom: tabPad } as const;

  // While the session is still hydrating, render nothing rather than flashing
  // either the tabs or a redirect. Once settled, enforce the routing rules.
  if (authLoading) return <View style={{ flex: 1, backgroundColor: C.surface }} />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!isOnboarded) return <Redirect href="/onboarding/mood" />;

  return (
    <View style={{ flex: 1, backgroundColor: C.surfaceRaised }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [s.tabBar, dynTab],
          tabBarShowLabel: false,
          // Native fallback (works on Android out of the box); the manual
          // `keyboardOpen` state below covers iOS where this prop is unreliable.
          tabBarHideOnKeyboard: true,
        }}
      >
        {TABS.map((tab) => {
          const isCenter = tab.name === 'soul-match';
          const isReels = tab.name === 'reels';
          const isAI = tab.name === 'ai-companion';
          return (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              listeners={
                // On iOS Safari (PWA) `inputRef.focus()` is only honored inside
                // a real user gesture. `tabPress` fires synchronously during
                // the tap, so this is the one place we can pop the keyboard
                // open on entry to the AI chat without a second tap.
                isAI
                  ? {
                      tabPress: () => {
                        aiInputRef.current?.focus();
                      },
                    }
                  : undefined
              }
              options={{
                // Labels are visually hidden (tabBarShowLabel:false) so VoiceOver
                // needs them spelled out here. The center tab announces its full
                // destination name rather than the short visual label.
                tabBarAccessibilityLabel:
                  tab.name === 'soul-match' ? 'Soul Match' : tab.label,
                tabBarStyle: keyboardOpen
                  ? { display: 'none' as const }
                  : isReels
                    ? [s.tabBar, dynTab, s.tabBarFloating]
                    : [s.tabBar, dynTab],
                // Eagerly mount the AI screen so `aiInputRef.current` is
                // populated before the user ever taps the AI tab — required
                // for the iOS Safari PWA tabPress→focus trick to land on the
                // very first tap.
                lazy: !isAI,
                tabBarIcon: ({ focused }: { focused: boolean }) => (
                  <TabIcon
                    label={tab.label}
                    icon={tab.icon}
                    iconFocused={tab.iconFocused}
                    focused={focused}
                    isCenter={isCenter}
                  />
                ),
              }}
            />
          );
        })}
        {HIDDEN.map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null }} />
        ))}
      </Tabs>

      {/* Side navigation drawer — overlays every (main) screen */}
      <SideMenu />
    </View>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: C.surfaceRaised,
    borderTopWidth: Platform.select({ ios: 0.5, default: 1 }),
    borderTopColor: 'rgba(28,27,26,0.08)',
    paddingTop: 14,
    paddingHorizontal: 8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#5C4742',
    shadowOpacity: 0.14,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -10 },
    elevation: 20,
  },
  // Reels only: floats over the video so the full-height reel peeks through
  // the rounded corners. No backgroundColor override — inherits surfaceRaised
  // from s.tabBar so the bar body stays fully opaque.
  tabBarFloating: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  activePill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.activePillBg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 2,
  },
  activeLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 13,
    color: C.activePillFg,
    letterSpacing: 0.2,
  },
  idleTab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 2,
  },
  idleLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 13,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  centerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  centerBtnActive: {
    backgroundColor: '#7a2e1d',
  },
});

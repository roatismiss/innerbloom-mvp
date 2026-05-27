import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { SideMenu } from '../../components/SideMenu';

const C = {
  surface:               '#fff8f6',
  surfaceRaised:         '#ffffff',
  secondaryContainer:    '#90f2fc',
  onSecondaryContainer:  '#006f77',
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
  { name: 'dashboard',    label: 'Dashboard',  icon: 'home-outline',          iconFocused: 'home'          },
  { name: 'community',    label: 'Community',  icon: 'account-group-outline', iconFocused: 'account-group' },
  { name: 'soul-match',   label: 'Soul Match', icon: 'yin-yang',              iconFocused: 'yin-yang'      },
  { name: 'reels',        label: 'Reels',      icon: 'play-circle-outline',   iconFocused: 'play-circle'   },
  { name: 'ai-companion', label: 'AI',         icon: 'head-heart-outline',    iconFocused: 'head-heart'    },
];

// Screens that exist as routes but must not appear in the tab bar
const HIDDEN = ['today', 'checkin', 'bloom-ai', 'breathing', 'journal', 'profile', 'feed', 'bloom', 'reflections', 'intentions', 'resources', 'garden', 'post-composer', 'article'];

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
        <MaterialCommunityIcons name={iconFocused} size={20} color={C.onSecondaryContainer} />
        <Text style={s.activeLabel}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={s.idleTab}>
      <MaterialCommunityIcons name={icon} size={20} color={C.onSurfaceVariant} />
      <Text style={s.idleLabel}>{label}</Text>
    </View>
  );
}

export default function MainLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: s.tabBar,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        {TABS.map((tab) => {
          const isCenter = tab.name === 'soul-match';
          return (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
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
    height: Platform.select({ ios: 96, android: 82, default: 82 }) ?? 82,
    paddingBottom: Platform.select({ ios: 24, android: 16, default: 16 }) ?? 16,
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
  activePill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.secondaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 2,
  },
  activeLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 13,
    color: C.onSecondaryContainer,
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

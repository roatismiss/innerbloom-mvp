import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  RESOURCE_ARTICLES,
  RESOURCE_CATEGORIES,
  type ResourceArticle,
  type ResourceCategory,
  type ResourceCategoryKey,
} from '../../lib/resources-data';

// ─── Design tokens (1:1 with the resource-library HTML reference) ────────────
const C = {
  surface:                '#fff8f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainer:       '#ffe9e4',
  surfaceContainerHigh:   '#ffe2db',
  surfaceContainerHighest:'#fadcd5',
  surfaceDim:             '#f2d3cc',
  surfaceVariant:         '#fadcd5',
  primary:                '#994531',
  primaryContainer:       '#e8836b',
  primaryFixed:           '#ffdad2',
  primaryFixedDim:        '#ffb4a3',
  onPrimary:              '#ffffff',
  onPrimaryContainer:     '#641e0e',
  secondary:              '#006970',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  onSecondaryFixedVariant:'#004f55',
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

// ─── Featured "hero" content (picked from the article catalog) ───────────────
const FEATURED = RESOURCE_ARTICLES.find((a) => a.id === 'an-4')!;
const FEATURED_CATEGORY = RESOURCE_CATEGORIES.find(
  (c) => c.key === FEATURED.category,
)!;

// ─── Article art block — gradient + category icon (avoids per-card image fab) ─
function ArtBlock({
  category,
  height,
  iconSize = 28,
}: {
  category: ResourceCategory;
  height: number;
  iconSize?: number;
}) {
  return (
    <View style={[s.artWrap, { height }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`grad-${category.key}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={category.bgColor} stopOpacity={1} />
            <Stop offset="1" stopColor="rgba(255,255,255,0.10)" stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#grad-${category.key})`} />
      </Svg>
      <View style={s.artIconPill}>
        <MaterialCommunityIcons
          name={category.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
          size={iconSize}
          color={category.iconColor}
        />
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function ResourcesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  // Filter articles by search query (matches title or excerpt, case-insensitive).
  const groupedByCategory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const groups: Record<ResourceCategoryKey, ResourceArticle[]> = {
      'work-stress': [], anxiety: [], depression: [], addiction: [], motivation: [], 'self-love': [],
    };
    for (const a of RESOURCE_ARTICLES) {
      if (q && !`${a.title} ${a.excerpt}`.toLowerCase().includes(q)) continue;
      groups[a.category].push(a);
    }
    return groups;
  }, [search]);

  function openArticle(a: ResourceArticle) {
    void Haptics.selectionAsync();
    router.push({ pathname: '/(main)/article' as never, params: { id: a.id } });
  }

  return (
    <View style={s.root}>
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
              <MaterialCommunityIcons name="spa-outline" size={22} color={C.primary} />
              <Text style={s.topTitle}>Resource Library</Text>
            </View>
          </View>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="magnify" size={22} color={C.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          {
            paddingTop: insets.top + HEADER_H + 24,
            paddingBottom: insets.bottom + 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Search input ── */}
        <Animated.View entering={FadeInDown.delay(40).springify()} style={s.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={C.outline} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Find topics, meditations, or articles…"
            placeholderTextColor={C.outlineVariant}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {!!search.length && (
            <TouchableOpacity
              style={s.searchClear}
              activeOpacity={0.7}
              onPress={() => setSearch('')}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={C.outline} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── Featured Daily ── */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Pressable style={s.featuredCard} onPress={() => openArticle(FEATURED)}>
            <ArtBlock category={FEATURED_CATEGORY} height={256} iconSize={56} />
            <View style={s.featuredOverlay} pointerEvents="none">
              <View style={s.featuredPill}>
                <Text style={s.featuredPillText}>Featured Daily</Text>
              </View>
              <Text style={s.featuredTitle}>Daily Calm: Overcoming Anxiety</Text>
              <Text style={s.featuredSub}>
                A 15-minute guided practice to ground your spirit.
              </Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── Per-category horizontal scrolls (10 articles each) ── */}
        {RESOURCE_CATEGORIES.map((cat, idx) => {
          const articles = groupedByCategory[cat.key];
          if (articles.length === 0) return null;
          return (
            <Animated.View
              key={cat.key}
              entering={FadeInDown.delay(120 + idx * 40).springify()}
              style={s.section}
            >
              <View style={s.sectionHeader}>
                <Text style={s.sectionHeading}>{cat.label}</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={s.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.row}
              >
                {articles.map((a) => (
                  <Pressable
                    key={a.id}
                    style={s.card}
                    onPress={() => openArticle(a)}
                  >
                    <ArtBlock category={cat} height={128} />
                    <View style={s.cardBody}>
                      <Text style={s.cardTitle} numberOfLines={2}>{a.title}</Text>
                      <Text style={s.cardExcerpt} numberOfLines={2}>{a.excerpt}</Text>
                      <View style={s.cardMetaRow}>
                        <MaterialCommunityIcons name="clock-outline" size={12} color={C.outline} />
                        <Text style={s.cardMeta}>{a.minutes} min read</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          );
        })}

        {/* ── Empty state when search filters everything out ── */}
        {Object.values(groupedByCategory).every((arr) => arr.length === 0) && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="magnify-close" size={40} color={C.outlineVariant} />
            <Text style={s.emptyTitle}>Nothing matches yet</Text>
            <Text style={s.emptySub}>Try a softer word — maybe just one feeling.</Text>
          </View>
        )}
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
    paddingHorizontal: 12,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  scroll: { paddingHorizontal: 24, gap: 28 },

  // Search
  searchWrap: {
    height: 56,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 20,
    color: C.onSurface,
    ...Platform.select({
      web: { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as object,
      default: {},
    }),
  },
  searchClear: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  // Featured card
  featuredCard: {
    width: '100%',
    height: 256,
    borderRadius: 24,
    overflow: 'hidden',
    ...softShadow,
  },
  featuredOverlay: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    padding: 24,
    backgroundColor: 'rgba(40,24,20,0.55)',
  },
  featuredPill: {
    alignSelf: 'flex-start',
    backgroundColor: C.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 10,
  },
  featuredPillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
    color: C.onPrimaryContainer,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  featuredTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  featuredSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // Section heading
  section: { gap: 14 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.onSurface,
    letterSpacing: -0.1,
  },
  seeAll: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.primary,
    letterSpacing: 0.2,
  },

  // Horizontal row + card
  row: { gap: 14, paddingRight: 24, paddingBottom: 6 },
  card: {
    width: 240,
    backgroundColor: C.surfaceContainer,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.30)',
    ...softShadow,
  },
  artWrap: {
    width: '100%',
    backgroundColor: C.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artIconPill: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#5C4742',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: C.onSurface,
    letterSpacing: -0.05,
  },
  cardExcerpt: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardMeta: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.outline,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: C.onSurface,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
});

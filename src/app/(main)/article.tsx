import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  RESOURCE_ARTICLES,
  RESOURCE_CATEGORIES,
  type ResourceArticle,
  type ResourceCategory,
} from '../../lib/resources-data';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  surface:                '#fff8f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainer:       '#ffe9e4',
  surfaceContainerHigh:   '#ffe2db',
  surfaceContainerHighest:'#fadcd5',
  primary:                '#994531',
  primaryContainer:       '#e8836b',
  primaryFixed:           '#ffdad2',
  onPrimaryContainer:     '#641e0e',
  secondary:              '#006970',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  tertiary:               '#a8315c',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
} as const;

const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

const HERO_H = 380;
const CARD_OVERLAP = 80;

// ─── Hero gradient (replaces image — same ArtBlock pattern as resources.tsx) ──
function HeroBlock({ category }: { category: ResourceCategory }) {
  return (
    <View style={s.heroWrap}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="hero-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={category.bgColor} stopOpacity={1} />
            <Stop offset="1" stopColor="rgba(255,255,255,0.05)" stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#hero-grad)" />
      </Svg>
      {/* Large decorative icon */}
      <View style={s.heroIconWrap}>
        <MaterialCommunityIcons
          name={category.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
          size={80}
          color={category.iconColor}
        />
      </View>
      {/* Fade-to-surface gradient at bottom */}
      <Svg width="100%" height={120} style={s.heroFade}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.surface} stopOpacity={0} />
            <Stop offset="1" stopColor={C.surface} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={120} fill="url(#fade)" />
      </Svg>
    </View>
  );
}

// ─── Suggested card (Continue Reading row) ───────────────────────────────────
function SuggestedCard({
  article,
  category,
  onPress,
}: {
  article: ResourceArticle;
  category: ResourceCategory;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.sugCard} onPress={onPress}>
      <View style={[s.sugArt, { backgroundColor: category.bgColor }]}>
        <MaterialCommunityIcons
          name={category.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
          size={24}
          color={category.iconColor}
        />
      </View>
      <View style={s.sugBody}>
        <Text style={[s.sugCategory, { color: category.iconColor }]}>{category.label}</Text>
        <Text style={s.sugTitle} numberOfLines={2}>{article.title}</Text>
        <Text style={s.sugMeta}>{article.minutes} min read</Text>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);

  const article = RESOURCE_ARTICLES.find((a) => a.id === id);
  const category = article
    ? RESOURCE_CATEGORIES.find((c) => c.key === article.category)
    : undefined;

  if (!article || !category) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={s.bodyText}>Article not found.</Text>
      </View>
    );
  }

  // Split body into paragraphs on double newline
  const paragraphs = article.body.split('\n\n').filter(Boolean);

  // Suggested: up to 2 other articles in the same category
  const suggested = RESOURCE_ARTICLES
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 2);

  function handleSave() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaved((v) => !v);
  }

  async function handleShare() {
    void Haptics.selectionAsync();
    try {
      await Share.share({
        title: article!.title,
        message: `${article!.title}\n\n${article!.excerpt}\n\nRead more on InnerBloom.`,
      });
    } catch {
      // share cancelled — no-op
    }
  }

  return (
    <View style={s.root}>
      {/* ─── Fixed top bar ─── */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { paddingTop: insets.top, height: insets.top + 56 }]}
      >
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Article</Text>
        <View style={s.topRight}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={handleSave}>
            <MaterialCommunityIcons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={saved ? C.primary : C.onSurfaceVariant}
            />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={handleShare}>
            <MaterialCommunityIcons name="share-outline" size={22} color={C.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        {/* ─── Hero ─── */}
        <View style={{ marginTop: insets.top + 56 }}>
          <HeroBlock category={category} />
        </View>

        {/* ─── Content card ─── */}
        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          style={[s.card, { marginTop: -CARD_OVERLAP }]}
        >
          {/* Author / meta row */}
          <View style={s.metaRow}>
            <View style={[s.metaAvatar, { backgroundColor: category.bgColor }]}>
              <MaterialCommunityIcons
                name={category.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                size={22}
                color={category.iconColor}
              />
            </View>
            <View style={s.metaText}>
              <Text style={s.metaAuthor}>InnerBloom Wellness Team</Text>
              <Text style={s.metaSub}>{category.label} · {article.minutes} min read</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={s.title}>{article.title}</Text>

          {/* Pull quote — the excerpt */}
          <View style={s.pullQuote}>
            <Text style={s.pullQuoteText}>{article.excerpt}</Text>
          </View>

          {/* Body paragraphs */}
          <View style={s.bodySection}>
            {paragraphs.map((p, i) => (
              <Animated.Text
                key={i}
                entering={FadeIn.delay(120 + i * 30).springify()}
                style={s.bodyText}
              >
                {p}
              </Animated.Text>
            ))}
          </View>

          {/* Action buttons */}
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnCta]}
              activeOpacity={0.85}
              onPress={handleSave}
            >
              <MaterialCommunityIcons
                name={saved ? 'bookmark-check' : 'bookmark-plus-outline'}
                size={18}
                color={C.onPrimaryContainer}
              />
              <Text style={s.actionBtnCtaText}>
                {saved ? 'Saved' : 'Save to Library'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnOutline]}
              activeOpacity={0.85}
              onPress={handleShare}
            >
              <MaterialCommunityIcons name="share-outline" size={18} color={C.onSurfaceVariant} />
              <Text style={s.actionBtnOutlineText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ─── Continue Reading ─── */}
        {suggested.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={s.sugSection}
          >
            <Text style={s.sugHeading}>Continue Reading</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.sugRow}
            >
              {suggested.map((a) => {
                const cat = RESOURCE_CATEGORIES.find((c) => c.key === a.category)!;
                return (
                  <SuggestedCard
                    key={a.id}
                    article={a}
                    category={cat}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      router.replace({ pathname: '/(main)/article' as never, params: { id: a.id } });
                    }}
                  />
                );
              })}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(255,248,246,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    ...Platform.select({
      ios: { backdropFilter: 'blur(20px)' } as object,
      default: {},
    }),
  },
  topTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: C.onSurface,
    letterSpacing: -0.1,
  },
  topRight: { flexDirection: 'row', gap: 0 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  // Hero
  heroWrap: {
    width: '100%',
    height: HERO_H,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconWrap: {
    width: 140, height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  heroFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },

  // Content card
  card: {
    marginHorizontal: 16,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 32,
    padding: 28,
    zIndex: 10,
    ...softShadow,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  metaAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  metaText: { gap: 2 },
  metaAuthor: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: C.onSurface,
  },
  metaSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
  },

  // Title
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    lineHeight: 36,
    color: C.onSurface,
    letterSpacing: -0.3,
    marginBottom: 20,
  },

  // Pull quote
  pullQuote: {
    borderLeftWidth: 3,
    borderLeftColor: C.primaryContainer,
    backgroundColor: C.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
  },
  pullQuoteText: {
    fontFamily: 'Fraunces_400Regular',
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 24,
    color: C.onSurfaceVariant,
  },

  // Body
  bodySection: { gap: 18 },
  bodyText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 17,
    lineHeight: 27,
    color: C.onSurfaceVariant,
    letterSpacing: 0.1,
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.outlineVariant,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnCta: {
    backgroundColor: C.primaryContainer,
    shadowColor: C.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  actionBtnCtaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onPrimaryContainer,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surfaceContainerLowest,
  },
  actionBtnOutlineText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Continue Reading
  sugSection: {
    marginTop: 32,
    paddingHorizontal: 24,
    gap: 14,
  },
  sugHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.onSurface,
    letterSpacing: -0.1,
  },
  sugRow: { gap: 12, paddingBottom: 4 },
  sugCard: {
    width: 220,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.30)',
    ...softShadow,
  },
  sugArt: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sugBody: { padding: 12, gap: 4 },
  sugCategory: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sugTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
    color: C.onSurface,
  },
  sugMeta: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.outline,
    marginTop: 2,
  },
});

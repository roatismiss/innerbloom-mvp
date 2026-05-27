import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  primary:              '#994531',
  primaryContainer:     '#e8836b',
  onPrimaryContainer:   '#641e0e',
  onPrimary:            '#ffffff',
  onSurface:            '#281814',
  onSurfaceVariant:     '#55433e',
  outlineVariant:       '#dbc1bb',
  surface:              '#fff8f6',
  surfaceContainerLow:  '#fff1ed',
  tertiaryFixedDim:     '#ffb1c4',
  secondaryFixed:       '#90f2fc',
};

type WelcomeSlide = {
  kind: 'welcome';
  id: string;
  bg: string;
  image: string;
};

type HeroSlide = {
  kind: 'hero';
  id: string;
  bg: string;
  title: string;
  body: string;
  image: string;
  isLast: boolean;
};

type Slide = WelcomeSlide | HeroSlide;

const SLIDES: readonly Slide[] = [
  {
    kind: 'welcome',
    id: '0',
    bg: C.surface,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBd9t2pEuhcX0WtAycR-JkwgdPbswfWklH6HX6JV1jqztuC_hsgmWmxwSohVujJXs91Jb_G6y0o04YMFAu_i6s8tMnXm5a3hqMAMrO7vXRJ96R1GN-YI3EGNxiZzyVWpA6g_wcMw4WcQbV1IzdnugAt0X7MSKfxIOqYr1fV6QEcQLjxZW4slFjWnIyiTLGd0WUPRaTl-UVysmh1G0psAMtDQnzGTCBeE1MlZDFv2IC7PHKCrwtb_79nRBOWj0EZ1WEg0Ef4YtWaQ001',
  },
  {
    kind: 'hero',
    id: '1',
    bg: C.surface,
    title: 'Welcome to InnerBloom',
    body: 'A safe space where you can heal, grow, and feel truly understood.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0e3RKFf0Gs2BA9HGsFCy8RIGk4-l2y9AtdudyvYrAG-VmXzTckAr2F4ZeuHhTPboTquJJDLdWMXRqQ4-w6B_jWPk3fjPWhfd8fXUd2snT5oPFmkK2N4B0ht9cfzAZtHWYfDYqN4FfFB-oXUk_P8qWvN8Ig_cs7p6ruQzp8kCEcr_ED2oZ5l8yN_Q-SwpnPRWGU7guawicygoGyM0fin8hX6QBz0B06eIb6RkEDFJdgx4kyevaizSQEs-BIk_Xtg_1dHEzatPi1sZ4',
    isLast: false,
  },
  {
    kind: 'hero',
    id: '2',
    bg: C.surfaceContainerLow,
    title: 'Meet your empathetic companion',
    body: 'An AI that listens without judgment, providing 24/7 emotional support tailored to your unique needs.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCBIoKT-8OmyiapH7JgLK3j2GdZEzwKONDd7NWWtfNJjuJ6pigM19fKWiIf9flU8wtvg9Nr3bcKVgQEqmbP20O1gB9JqS5NExGxVod5_oKZzuyYI-QCK7nBbF9d-ow38OgpPZ_sJeg59NI-UR4kISBscS2Xn5qJSpgvVhFTtMzT-eO9nwAhvuXK844xcSU8cnDFmZM_Il6sVLqrzV8EWYOXzSbvQZu-hPUuUpg-8pU2674hFg49hk63NIeS2kC5HEjANNPNSlF3OsT',
    isLast: false,
  },
  {
    kind: 'hero',
    id: '3',
    bg: C.surface,
    title: "You're never alone here",
    body: 'Connect with a supportive community of people who share your journey towards mindfulness and healing.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhtLs9rCsnkNesQ7_v6D8E2RpBTP7jZX2_b36eJQ5HQTorm61YyF6fEWlfDSqAx8qEuoYVVWjt-OfxQxob26CdmSwVQmDi4Mt5L65lxLwU-gjEM8g6y3wcV1FYJp0US5-lfA5ooWU2kQKYhYQdxPCxQa82MpAEri1941exM7LbcStKx6qGQ1buEHpBPQdevT40It5WbMd8yOLO0pn9mc2M2u5R0pePX5nkwiQVLI1N3zbp1pMHzjpXtDC_0G7FEXvqqRLMnLThZ8KR',
    isLast: false,
  },
  {
    kind: 'hero',
    id: '4',
    bg: C.surfaceContainerLow,
    title: 'Your healing journey starts now',
    body: 'Track your mood, journal your thoughts, and see how you bloom over time with personalized insights.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdzqry6wiFlA2nv4VvkSK0qdWhCagWw0vDfvnVKokIaCwRYLivtNKXAhcCn0mEeCCC-gLqXNTWS4YvAMdZu1ZCELZlR2cuJnF5qdAc60K8S1RRM7IyFqqHcWF7_5n1soNrumD1pTFXTBZALSQNVbXXRMRJ0UhpHpG2WpgCrBLbmRPH4Ds9iwKDcokBwSiKNMPGGOuB0x4jQbipjq3iloLfinY58aKSBsYFgj22aNJrliiYwTimCbQgeglLDtJ7isBsG1siowzWtDds',
    isLast: true,
  },
];

const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };

export default function OnboardingScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const heroH = H * 0.60;
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const getItemLayout = useCallback(
    (_: ArrayLike<Slide> | null | undefined, index: number) => ({
      length: W,
      offset: W * index,
      index,
    }),
    [W],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const goToLogin = () => {
    void Haptics.selectionAsync();
    router.replace('/(auth)/login');
  };

  const startJourney = () => {
    void Haptics.selectionAsync();
    listRef.current?.scrollToIndex({ index: 1, animated: true });
  };

  const current = SLIDES[activeIndex];
  const isWelcome = current.kind === 'welcome';
  const isLastSlide = activeIndex === SLIDES.length - 1;

  const renderItem = ({ item }: { item: Slide }) => {
    if (item.kind === 'welcome') {
      return (
        <WelcomeSlideView
          width={W}
          height={H}
          insets={insets}
          image={item.image}
          onStart={startJourney}
          onLogin={goToLogin}
        />
      );
    }
    return (
      <View style={[styles.slide, { backgroundColor: item.bg, width: W }]}>
        <Image
          source={{ uri: item.image }}
          style={{ width: W, height: heroH }}
          contentFit="cover"
          transition={300}
        />
        <View style={[styles.content, { paddingBottom: insets.bottom + 148 }]}>
          <HeadlineText>{item.title}</HeadlineText>
          <BodyText>{item.body}</BodyText>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        snapToInterval={W}
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={{ flex: 1 }}
      />

      {/* Skip button — hidden on welcome (welcome has its own Log In link) */}
      {!isWelcome && (
        <View style={[styles.skipWrap, { top: insets.top + 12 }]}>
          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
            onPress={goToLogin}
            hitSlop={8}
          >
            <SkipText>Skip</SkipText>
          </Pressable>
        </View>
      )}

      {/* Bottom controls: dots + CTA — hidden on welcome (welcome has its own CTA) */}
      {!isWelcome && (
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 24 }]}>
          {isLastSlide && (
            <Pressable
              style={({ pressed }) => [styles.cta, { width: W - 48 }, pressed && styles.ctaPressed]}
              onPress={goToLogin}
            >
              <CtaText>Get Started</CtaText>
            </Pressable>
          )}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function WelcomeSlideView({
  width,
  height,
  insets,
  image,
  onStart,
  onLogin,
}: {
  width: number;
  height: number;
  insets: { top: number; bottom: number };
  image: string;
  onStart: () => void;
  onLogin: () => void;
}) {
  const illustrationSize = Math.min(width - 64, height * 0.38);

  return (
    <View style={[welcomeStyles.root, { width, backgroundColor: C.surface }]}>
      {/* Background blobs — opacity-only soft look, no blur filter (RN constraint) */}
      <View
        pointerEvents="none"
        style={[
          welcomeStyles.blobTopRight,
          { top: -96, right: -96, backgroundColor: C.tertiaryFixedDim, opacity: 0.35 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          welcomeStyles.blobBottomLeft,
          { bottom: -96, left: -96, backgroundColor: C.secondaryFixed, opacity: 0.25 },
        ]}
      />

      <View
        style={[
          welcomeStyles.main,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Brand */}
        <BrandText>InnerBloom</BrandText>

        {/* Illustration */}
        <View style={welcomeStyles.illustrationWrap}>
          <Image
            source={{ uri: image }}
            style={{
              width: illustrationSize,
              height: illustrationSize,
              borderRadius: 16,
            }}
            contentFit="cover"
            transition={300}
          />
        </View>

        {/* Content */}
        <View style={welcomeStyles.contentStack}>
          <View style={{ gap: 12, alignItems: 'center' }}>
            <WelcomeHeadline />
            <WelcomeSubtitle>
              Step into a sanctuary designed for your emotional well-being.
            </WelcomeSubtitle>
          </View>

          <View style={{ width: '100%', alignItems: 'center', gap: 20, marginTop: 12 }}>
            <Pressable
              style={({ pressed }) => [
                welcomeStyles.cta,
                { width: width - 48 },
                pressed && welcomeStyles.ctaPressed,
              ]}
              onPress={onStart}
            >
              <WelcomeCtaLabel>Start Your Journey</WelcomeCtaLabel>
            </Pressable>

            <Pressable onPress={onLogin} hitSlop={8}>
              <LoginLink />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function WelcomeHeadline() {
  return (
    <RNText style={welcomeStyles.headline}>
      <RNText style={welcomeStyles.headlineBase}>Healing begins when you feel </RNText>
      <RNText style={welcomeStyles.headlineAccent}>truly heard.</RNText>
    </RNText>
  );
}

function LoginLink() {
  return (
    <RNText style={welcomeStyles.loginLink}>
      <RNText style={welcomeStyles.loginLinkBase}>Already have an account? </RNText>
      <RNText style={welcomeStyles.loginLinkBold}>Log In</RNText>
    </RNText>
  );
}

function BrandText({ children }: { children: string }) {
  return <RNText style={welcomeStyles.brand}>{children}</RNText>;
}

function WelcomeSubtitle({ children }: { children: string }) {
  return <RNText style={welcomeStyles.subtitle}>{children}</RNText>;
}

function WelcomeCtaLabel({ children }: { children: string }) {
  return <RNText style={welcomeStyles.ctaLabel}>{children}</RNText>;
}

function HeadlineText({ children }: { children: string }) {
  return <HeadlineRN style={styles.headline}>{children}</HeadlineRN>;
}

function BodyText({ children }: { children: string }) {
  return <BodyRN style={styles.body}>{children}</BodyRN>;
}

function CtaText({ children }: { children: string }) {
  return <BodyRN style={styles.ctaLabel}>{children}</BodyRN>;
}

function SkipText({ children }: { children: string }) {
  return <BodyRN style={styles.skipLabel}>{children}</BodyRN>;
}

function HeadlineRN({ style, children }: { style?: object; children: string }) {
  return (
    <RNText style={[{ fontFamily: 'NunitoSans_600SemiBold', fontSize: 17, lineHeight: 24, letterSpacing: 0.1, fontWeight: '600', color: C.onSurface }, style]}>
      {children}
    </RNText>
  );
}

function BodyRN({ style, children }: { style?: object; children: string }) {
  return (
    <RNText style={[{ fontFamily: 'NunitoSans_400Regular', fontSize: 22, lineHeight: 32, color: C.onSurface }, style]}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },
  slide: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 32,
    alignItems: 'center',
  },
  headline: {
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    textAlign: 'center',
    maxWidth: 300,
  },
  cta: {
    height: 56,
    borderRadius: 9999,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaLabel: {
    color: C.onPrimary,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 32,
    backgroundColor: C.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: C.outlineVariant,
  },
  skipWrap: {
    position: 'absolute',
    right: 20,
    zIndex: 50,
  },
  skipBtn: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  skipBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  skipLabel: {
    color: C.onSurfaceVariant,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

const welcomeStyles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  blobTopRight: {
    position: 'absolute',
    width: 384,
    height: 384,
    borderRadius: 9999,
  },
  blobBottomLeft: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 9999,
  },
  main: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 512,
    alignSelf: 'center',
    width: '100%',
  },
  brand: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    color: C.primary,
    letterSpacing: -0.4,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.15,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 20 },
      },
      android: { elevation: 8 },
    }),
  },
  contentStack: {
    width: '100%',
    alignItems: 'center',
    gap: 24,
  },
  headline: {
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  headlineBase: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '600',
    color: C.onSurface,
    letterSpacing: -0.4,
  },
  headlineAccent: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 32,
    lineHeight: 38,
    fontStyle: 'italic',
    color: C.primary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  cta: {
    height: 60,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: C.primaryContainer,
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 8 },
    }),
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  ctaLabel: {
    color: C.onPrimaryContainer,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  loginLink: {
    textAlign: 'center',
  },
  loginLinkBase: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    color: C.primary,
  },
  loginLinkBold: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    fontWeight: '700',
    color: C.primary,
    textDecorationLine: 'underline',
  },
});

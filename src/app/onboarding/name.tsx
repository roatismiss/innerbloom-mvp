import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSetMyIdentity } from '../../lib/queries/identity';

const C = {
  primary:             '#994531',
  primaryContainer:    '#e8836b',
  onPrimaryContainer:  '#641e0e',
  primaryFixed:        '#ffdad2',
  secondaryFixed:      '#90f2fc',
  surfaceContainerHigh:'#ffe2db',
  surface:             '#fff8f6',
  surfaceContainer:    '#ffe9e4',
  surfaceContainerLow: '#fff1ed',
  onSurface:           '#281814',
  onSurfaceVariant:    '#55433e',
  outline:             '#88726d',
  outlineVariant:      '#dbc1bb',
  tertiary:            '#a8315c',
} as const;

export default function OnboardingNameScreen() {
  const insets = useSafeAreaInsets();
  const setIdentity = useSetMyIdentity();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Animate greeting text in/out
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingY       = useRef(new Animated.Value(8)).current;

  // Breathe animation for the bloom circle
  const breathe = useRef(new Animated.Value(0)).current;
  Animated.loop(
    Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]),
  ).start();

  const bloomScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const bloomOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  function handleNameChange(text: string) {
    setName(text);
    if (text.length > 0) {
      Animated.parallel([
        Animated.timing(greetingOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(greetingY, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(greetingOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(greetingY, { toValue: 8, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }

  async function handleContinue() {
    if (submitting) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      setSubmitting(true);
      try {
        await setIdentity.mutateAsync({ displayName: trimmed, avatarUrl: null });
      } catch {
        // Non-fatal — user can set name later in edit-profile
      } finally {
        setSubmitting(false);
      }
    }
    router.replace('/onboarding/blooming');
  }

  return (
    <View style={s.root}>
      {/* Progress bar — step 4 of 4 = 100% */}
      <View style={[s.progressTrack, { top: insets.top }]}>
        <View style={s.progressFill} />
      </View>

      {/* Background blobs */}
      <View style={[s.blob, s.blobTL]} />
      <View style={[s.blob, s.blobMR]} />
      <View style={[s.blob, s.blobBL]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[s.inner, { paddingTop: insets.top + 24 }]}>
          {/* Top nav */}
          <View style={s.topNav}>
            <Pressable
              style={s.backBtn}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color={C.primary} />
            </Pressable>
            <Text style={s.brand}>InnerBloom</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Bloom illustration */}
          <View style={s.illustrationWrap}>
            <Animated.View style={[s.bloomGlow, { transform: [{ scale: bloomScale }], opacity: bloomOpacity }]} />
            <Animated.View style={[s.bloomCircle, { transform: [{ scale: bloomScale }] }]}>
              <MaterialCommunityIcons name="head-heart-outline" size={64} color={C.primary} />
            </Animated.View>
          </View>

          {/* Heading */}
          <View style={s.headingBlock}>
            <Text style={s.headline}>What should we call you?</Text>
            <Text style={s.subhead}>A name that feels like home. You can change this anytime.</Text>
          </View>

          {/* Input */}
          <View style={s.inputGroup}>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={handleNameChange}
                placeholder="e.g. Sunny"
                placeholderTextColor={C.outlineVariant}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={32}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              <Animated.View style={{ opacity: greetingOpacity }}>
                <MaterialCommunityIcons name="heart-outline" size={20} color={C.primaryContainer} />
              </Animated.View>
            </View>

            <Animated.View style={[s.greetingRow, { opacity: greetingOpacity, transform: [{ translateY: greetingY }] }]}>
              <MaterialCommunityIcons name="star-four-points-small" size={16} color={C.primary} />
              <Text style={s.greetingText}>It&apos;s wonderful to meet you.</Text>
            </Animated.View>
          </View>

          <View style={{ flex: 1 }} />

          {/* CTA */}
          <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <TouchableOpacity
              style={s.cta}
              onPress={handleContinue}
              activeOpacity={0.85}
              disabled={submitting}
            >
              <Text style={s.ctaLabel}>
                {name.trim().length > 0 ? 'Begin Blooming' : 'Skip for now'}
              </Text>
              <MaterialCommunityIcons
                name={name.trim().length > 0 ? 'flower-tulip-outline' : 'arrow-right'}
                size={18}
                color={C.onPrimaryContainer}
              />
            </TouchableOpacity>
            <Text style={s.stepLabel}>Step 4 of 4</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  progressTrack: {
    position: 'absolute', left: 0, right: 0, height: 3,
    backgroundColor: C.surfaceContainerHigh, zIndex: 10,
  },
  progressFill: {
    width: '100%', height: '100%',
    backgroundColor: C.primaryContainer, borderRadius: 2,
  },

  blob: { position: 'absolute', borderRadius: 9999 },
  blobTL: { top: -80, left: -80, width: 280, height: 280, backgroundColor: C.secondaryFixed, opacity: 0.45 },
  blobMR: { top: 200, right: -80, width: 200, height: 200, backgroundColor: C.surfaceContainerHigh, opacity: 0.55 },
  blobBL: { bottom: -100, left: -60, width: 340, height: 340, backgroundColor: C.primaryFixed, opacity: 0.45 },

  inner: { flex: 1, paddingHorizontal: 24, gap: 32 },

  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.outlineVariant,
  },
  brand: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18, color: C.primary,
    letterSpacing: -0.2,
  },

  illustrationWrap: { alignItems: 'center', justifyContent: 'center', height: 180 },
  bloomGlow: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: C.primaryFixed, opacity: 0.5,
  },
  bloomCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOpacity: 0.15,
    shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    borderWidth: 1, borderColor: C.primaryFixed,
  },

  headingBlock: { gap: 10 },
  headline: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 28, lineHeight: 36, color: C.onSurface,
    letterSpacing: -0.3,
  },
  subhead: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 16, lineHeight: 24, color: C.onSurfaceVariant,
  },

  inputGroup: { gap: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16, paddingHorizontal: 20, height: 56,
    borderWidth: 1, borderColor: C.outlineVariant,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 17, color: C.onSurface,
    paddingVertical: 0,
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
  greetingText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.primary,
    letterSpacing: 0.2,
  },

  footer: { gap: 12, alignItems: 'center' },
  cta: {
    width: '100%', height: 56, borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: C.primary, shadowOpacity: 0.22,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  ctaLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, color: C.onPrimaryContainer,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  stepLabel: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, color: C.outline,
  },
});

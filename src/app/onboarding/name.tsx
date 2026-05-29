import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BLOOM_PRESETS } from '../../components/BloomAvatar';
import { useSetMyIdentity, useUploadAvatar } from '../../lib/queries/identity';

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
  const uploadAvatar = useUploadAvatar();

  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  // Animate greeting text in/out
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingY       = useRef(new Animated.Value(8)).current;

  // Pulse animation for the avatar placeholder
  const pulse = useRef(new Animated.Value(0)).current;
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]),
  ).start();
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

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

  async function handlePickPhoto() {
    void Haptics.selectionAsync();
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted' && Platform.OS !== 'web') return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        allowsMultipleSelection: false,
      });
      if (result.canceled || result.assets.length === 0) return;
      setSelectedAvatar(result.assets[0].uri);
    } catch {
      // silently fail — user can try again
    }
  }

  function handleSelectPreset(key: string) {
    setSelectedAvatar(key);
    void Haptics.selectionAsync();
  }

  async function handleContinue() {
    if (submitting) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const trimmed = name.trim();
    setSubmitting(true);
    try {
      let finalAvatarUrl: string | null = null;

      if (selectedAvatar && !selectedAvatar.startsWith('bloom:')) {
        // Local file URI — upload to Supabase Storage
        const { publicUrl } = await uploadAvatar.mutateAsync({ uri: selectedAvatar });
        finalAvatarUrl = publicUrl;
      } else if (selectedAvatar) {
        finalAvatarUrl = selectedAvatar;
      }

      if (trimmed || finalAvatarUrl) {
        await setIdentity.mutateAsync({ displayName: trimmed || null, avatarUrl: finalAvatarUrl });
      }
    } catch {
      // Non-fatal — user can set from edit-profile
    } finally {
      setSubmitting(false);
    }
    router.replace('/onboarding/blooming');
  }

  // ─── Avatar display ──────────────────────────────────────────────────────────

  function renderLargeAvatar() {
    if (!selectedAvatar) {
      return (
        <Animated.View style={[s.avatarCircle, { transform: [{ scale: pulseScale }] }]}>
          <MaterialCommunityIcons name="camera-plus-outline" size={40} color={C.outline} />
          <Text style={s.avatarHint}>Add a photo</Text>
        </Animated.View>
      );
    }
    if (selectedAvatar.startsWith('bloom:')) {
      const p = BLOOM_PRESETS.find((x) => x.key === selectedAvatar) ?? BLOOM_PRESETS[0];
      return (
        <View style={[s.avatarCircle, { backgroundColor: p.bg }]}>
          <MaterialCommunityIcons name={p.icon} size={52} color={p.fg} />
        </View>
      );
    }
    return (
      <Image source={{ uri: selectedAvatar }} style={s.avatarCircle} contentFit="cover" />
    );
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
            <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={C.primary} />
            </Pressable>
            <Text style={s.brand}>InnerBloom</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Avatar picker */}
          <View style={s.avatarSection}>
            {/* Large circle */}
            <Pressable style={s.avatarCircleWrap} onPress={handlePickPhoto}>
              {renderLargeAvatar()}
              <View style={s.cameraBadge}>
                <MaterialCommunityIcons name="pencil-outline" size={13} color={C.onPrimaryContainer} />
              </View>
            </Pressable>

            {/* Preset tiles row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.presetRow}
            >
              {/* Upload from gallery */}
              <Pressable
                style={[s.presetTile, s.presetTileUpload]}
                onPress={handlePickPhoto}
              >
                <MaterialCommunityIcons name="image-plus-outline" size={24} color={C.primary} />
              </Pressable>

              {BLOOM_PRESETS.map((p) => (
                <Pressable
                  key={p.key}
                  style={[
                    s.presetTile,
                    { backgroundColor: p.bg },
                    selectedAvatar === p.key && s.presetTileSelected,
                  ]}
                  onPress={() => handleSelectPreset(p.key)}
                >
                  <MaterialCommunityIcons name={p.icon} size={24} color={p.fg} />
                  {selectedAvatar === p.key && (
                    <View style={s.presetCheck}>
                      <MaterialCommunityIcons name="check" size={10} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
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
                {name.trim().length > 0 || selectedAvatar ? 'Begin Blooming' : 'Skip for now'}
              </Text>
              <MaterialCommunityIcons
                name={name.trim().length > 0 || selectedAvatar ? 'flower-tulip-outline' : 'arrow-right'}
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

  inner: { flex: 1, paddingHorizontal: 24, gap: 28 },

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

  // ─── Avatar picker ─────────────────────────────────────────────────────────
  avatarSection: { alignItems: 'center', gap: 16 },

  avatarCircleWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.outlineVariant,
    shadowColor: C.primary, shadowOpacity: 0.12,
    shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: 'hidden',
  },
  avatarHint: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 11, color: C.outline,
    marginTop: 4,
  },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.surface,
    elevation: 2,
  },

  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  presetTile: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#5C4742', shadowOpacity: 0.08,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    position: 'relative',
  },
  presetTileUpload: {
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
    borderStyle: 'dashed',
  },
  presetTileSelected: {
    borderWidth: 2.5,
    borderColor: C.primary,
  },
  presetCheck: {
    position: 'absolute', top: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  // ─── Heading ───────────────────────────────────────────────────────────────
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

  // ─── Input ─────────────────────────────────────────────────────────────────
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

  // ─── Footer ────────────────────────────────────────────────────────────────
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

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useSetMyIdentity,
  useUploadAvatar,
} from '../../lib/queries/identity';
import { useMyProfile } from '../../lib/queries/profile';

// ─── Tokens ──────────────────────────────────────────────────────────────────
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
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  tertiary:               '#a8315c',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
  error:                  '#ba1a1a',
} as const;

const MAX_NAME = 32;

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const myProfile = useMyProfile();
  const setIdentity = useSetMyIdentity();
  const uploadAvatar = useUploadAvatar();

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hydrate from server once data lands. Doesn't fight subsequent user edits.
  useEffect(() => {
    if (!myProfile.data) return;
    setName(myProfile.data.anonymous_alias && myProfile.data.anonymous_alias.startsWith('Bloom #')
      ? ''
      : myProfile.data.anonymous_alias ?? '');
    // Display name + avatar from the augmented profile — fall back to nulls.
    const dn = (myProfile.data as { display_name?: string | null }).display_name;
    if (dn != null) setName(dn);
    const av = (myProfile.data as { avatar_url?: string | null }).avatar_url;
    setAvatarUrl(av ?? null);
  }, [myProfile.data]);

  const alias = myProfile.data?.anonymous_alias ?? 'Bloom';
  const trimmedName = name.trim();
  const canSave =
    !setIdentity.isPending &&
    !uploadAvatar.isPending &&
    trimmedName.length <= MAX_NAME;

  async function pickImage() {
    void Haptics.selectionAsync();
    setErrorMsg(null);

    try {
      // expo-image-picker handles web (file input) and native (gallery)
      // through the same call.
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted' && Platform.OS !== 'web') {
        setErrorMsg('Please allow photo access in settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: false,
      });
      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      const uploaded = await uploadAvatar.mutateAsync({
        uri: asset.uri,
        mime: asset.mimeType,
      });
      setAvatarUrl(uploaded.publicUrl);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not upload the image. Try again.',
      );
    }
  }

  async function save() {
    if (!canSave) return;
    setErrorMsg(null);

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await setIdentity.mutateAsync({
        displayName: trimmedName || null,
        avatarUrl:   avatarUrl,
      });
      router.back();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not save your changes.',
      );
    }
  }

  async function clearAvatar() {
    void Haptics.selectionAsync();
    setAvatarUrl(null);
  }

  return (
    <View style={s.root}>
      <View style={[s.blob, s.blobTop]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 140 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={s.headerRow}>
            <Pressable
              style={s.backBtn}
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/(main)/dashboard');
              }}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={C.primary} />
            </Pressable>
            <View style={s.headerText}>
              <Text style={s.eyebrow}>YOUR IDENTITY</Text>
              <Text style={s.headline}>How you show up</Text>
            </View>
          </View>

          <Text style={s.subhead}>
            Anonymity is the default — your alias <Text style={s.aliasMono}>{alias}</Text> stays
            visible no matter what. Add a name or photo only if you want to.
          </Text>

          {/* Avatar */}
          <Animated.View entering={FadeInUp.springify()} style={s.avatarSection}>
            <View style={s.avatarWrap}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={s.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <MaterialCommunityIcons name="flower-tulip" size={56} color={C.primary} />
                </View>
              )}

              {uploadAvatar.isPending ? (
                <View style={s.avatarLoading}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </View>

            <View style={s.avatarActions}>
              <TouchableOpacity
                style={s.avatarBtn}
                activeOpacity={0.85}
                onPress={pickImage}
                disabled={uploadAvatar.isPending}
              >
                <MaterialCommunityIcons name="image-edit-outline" size={16} color={C.onPrimaryContainer} />
                <Text style={s.avatarBtnText}>
                  {avatarUrl ? 'Change photo' : 'Add a photo'}
                </Text>
              </TouchableOpacity>
              {avatarUrl ? (
                <TouchableOpacity
                  style={s.avatarClearBtn}
                  activeOpacity={0.75}
                  onPress={clearAvatar}
                >
                  <Text style={s.avatarClearText}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>

          {/* Display name */}
          <Animated.View entering={FadeInDown.delay(60).springify()} style={s.fieldSection}>
            <Text style={s.fieldLabel}>Display name</Text>
            <Text style={s.fieldHint}>
              Optional. What kindreds see instead of your alias. Leave blank to
              stay fully anonymous.
            </Text>
            <View style={s.inputWrap}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Maya R. — or leave blank"
                placeholderTextColor={C.outlineVariant}
                style={s.input}
                maxLength={MAX_NAME}
                autoCapitalize="words"
              />
              <Text style={s.charCount}>
                {MAX_NAME - name.length}
              </Text>
            </View>
          </Animated.View>

          {/* Reset to anonymous */}
          <Animated.View entering={FadeInDown.delay(120).springify()} style={s.resetCard}>
            <MaterialCommunityIcons name="incognito" size={20} color={C.outline} />
            <View style={{ flex: 1 }}>
              <Text style={s.resetTitle}>Reset to fully anonymous</Text>
              <Text style={s.resetBody}>
                Clears both name and photo. Only <Text style={s.aliasMono}>{alias}</Text> remains.
              </Text>
            </View>
            <TouchableOpacity
              style={s.resetBtn}
              activeOpacity={0.7}
              onPress={() => {
                setName('');
                setAvatarUrl(null);
              }}
            >
              <Text style={s.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Footer save */}
        <View
          style={[
            s.footer,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}
          <TouchableOpacity
            style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
            activeOpacity={0.85}
            onPress={save}
            disabled={!canSave}
          >
            {setIdentity.isPending ? (
              <ActivityIndicator color={C.onPrimaryContainer} />
            ) : (
              <Text style={s.saveBtnText}>SAVE</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  blob: { position: 'absolute', borderRadius: 9999, opacity: 0.4 },
  blobTop: {
    top: -120, left: -60,
    width: 320, height: 320,
    backgroundColor: C.primaryFixed,
  },

  scroll: { paddingHorizontal: 20, gap: 26 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.outlineVariant,
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, color: C.primary,
    letterSpacing: 1.6, textTransform: 'uppercase',
  },
  headline: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26, lineHeight: 32, color: C.onSurface,
    letterSpacing: -0.3, marginTop: 2,
  },

  subhead: {
    fontFamily: 'Fraunces_400Regular',
    fontStyle: 'italic',
    fontSize: 14, lineHeight: 21,
    color: C.onSurfaceVariant,
    marginTop: -10,
  },
  aliasMono: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontStyle: 'normal',
    color: C.primary,
  },

  // Avatar
  avatarSection: { alignItems: 'center', gap: 16 },
  avatarWrap: {
    width: 144, height: 144,
    borderRadius: 72,
    backgroundColor: '#fff',
    padding: 4,
    shadowColor: '#5C4742',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  avatar: {
    width: 136, height: 136, borderRadius: 68,
  },
  avatarFallback: {
    backgroundColor: C.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLoading: {
    position: 'absolute', top: 4, left: 4,
    width: 136, height: 136, borderRadius: 68,
    backgroundColor: 'rgba(40,24,20,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primaryContainer,
    paddingHorizontal: 18, height: 44, borderRadius: 9999,
    shadowColor: C.primary, shadowOpacity: 0.2,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  avatarBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.onPrimaryContainer,
    letterSpacing: 0.3,
  },
  avatarClearBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  avatarClearText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.outline,
    textDecorationLine: 'underline',
  },

  // Field
  fieldSection: { gap: 8 },
  fieldLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.onSurfaceVariant,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  fieldHint: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 19, color: C.outline,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceContainer,
    borderRadius: 16, paddingHorizontal: 16, height: 56,
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16, color: C.onSurface,
    paddingVertical: 0,
  },
  charCount: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, color: C.outline,
  },

  // Reset card
  resetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.surfaceContainerHigh,
  },
  resetTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, color: C.onSurface,
  },
  resetBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12, lineHeight: 17,
    color: C.onSurfaceVariant, marginTop: 2,
  },
  resetBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1, borderColor: C.outlineVariant,
  },
  resetBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, color: C.onSurfaceVariant,
    letterSpacing: 0.3,
  },

  // Footer save
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: 'rgba(255,248,246,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(219,193,187,0.30)',
    gap: 10,
  },
  errorText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.error, textAlign: 'center',
  },
  saveBtn: {
    height: 56, borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOpacity: 0.22,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: C.surfaceContainerHigh,
    shadowOpacity: 0, elevation: 0,
  },
  saveBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, color: C.onPrimaryContainer,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
});

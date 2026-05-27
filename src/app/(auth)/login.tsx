import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';

const C = {
  primary:              '#994531',
  primaryContainer:     '#e8836b',
  onPrimaryContainer:   '#641e0e',
  secondaryContainer:   '#90f2fc',
  onSecondaryContainer: '#006f77',
  surface:              '#fff8f6',
  surfaceLowest:        '#ffffff',
  surfaceContainer:     '#ffe9e4',
  surfaceLow:           '#fff1ed',
  surfaceHigh:          '#ffe2db',
  primaryFixed:         '#ffdad2',
  secondaryFixed:       '#90f2fc',
  onSurface:            '#281814',
  onSurfaceVariant:     '#55443e',
  outlineVariant:       '#dbc1bb',
  outline:              '#88726d',
  tertiary:             '#a8315c',
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setUser = useAuthStore((s) => s.setUser);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!supabase) {
      setError('Supabase is not configured yet.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        const { data, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        if (!data.session) {
          setError('Check your email to confirm your account, then log in.');
          setLoading(false);
          return;
        }
        setUser({ id: data.user!.id, anonymousAlias: 'Bloom User', createdAt: data.user!.created_at });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/onboarding/mood');
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        if (data.user) {
          // Query onboarding status inline — don't trust the async Zustand flag
          // which is hydrated by useSessionBootstrap and not yet settled here.
          const { data: profile } = await supabase
            .from('profiles')
            .select('anonymous_alias, onboarding_completed_at')
            .eq('id', data.user.id)
            .maybeSingle();
          const p = profile as { anonymous_alias: string; onboarding_completed_at: string | null } | null;
          const onboarded = !!p?.onboarding_completed_at;
          setUser({ id: data.user.id, anonymousAlias: p?.anonymous_alias ?? 'Bloom User', createdAt: data.user.created_at });
          setOnboarded(onboarded);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace(onboarded ? '/(main)/checkin' : '/onboarding/mood');
        }
      }
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background blobs */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.blob, styles.blobTopLeft]} />
        <View style={[styles.blob, styles.blobMidRight]} />
        <View style={[styles.blob, styles.blobBottom]} />
      </View>

      <View
        style={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      >
        {/* Branding Header */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.header}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="head-heart-outline" size={32} color={C.onPrimaryContainer} />
          </View>
          <Text style={styles.brandName}>InnerBloom</Text>
          <Text style={styles.tagline}>Create your safe space for mindful reflection</Text>
        </Animated.View>

        {/* Toggle */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.toggleWrap}>
          <View style={styles.toggle}>
            <Pressable
              style={[styles.toggleTab, isSignUp && styles.toggleTabActive]}
              onPress={() => { setIsSignUp(true); setError(''); }}
            >
              <Text style={[styles.toggleLabel, isSignUp && styles.toggleLabelActive]}>Sign Up</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleTab, !isSignUp && styles.toggleTabActive]}
              onPress={() => { setIsSignUp(false); setError(''); }}
            >
              <Text style={[styles.toggleLabel, !isSignUp && styles.toggleLabelActive]}>Login</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Form Card */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="sarah@example.com"
              placeholderTextColor={C.outlineVariant}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View>
              <TextInput
                style={[styles.input, { paddingRight: 52 }]}
                placeholder="••••••••"
                placeholderTextColor={C.outlineVariant}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={C.onSurfaceVariant}
                />
              </Pressable>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.submitButton, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.onPrimaryContainer} />
            ) : (
              <Text style={styles.submitLabel}>
                {isSignUp ? 'CREATE ACCOUNT' : 'LOG IN'}
              </Text>
            )}
          </Pressable>

          {/* OR divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social buttons */}
          <Pressable style={styles.socialBtn}>
            <Ionicons name="logo-google" size={20} color={C.onSurfaceVariant} />
            <Text style={styles.socialLabel}>Continue with Google</Text>
          </Pressable>
          <Pressable style={styles.socialBtn}>
            <Ionicons name="logo-apple" size={20} color={C.onSurfaceVariant} />
            <Text style={styles.socialLabel}>Continue with Apple</Text>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },

  blob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.55,
  },
  blobTopLeft: {
    width: 380,
    height: 380,
    backgroundColor: C.secondaryFixed,
    top: -100,
    left: -100,
  },
  blobMidRight: {
    width: 280,
    height: 280,
    backgroundColor: C.surfaceHigh,
    top: '38%',
    right: -80,
  },
  blobBottom: {
    width: 460,
    height: 460,
    backgroundColor: C.primaryFixed,
    bottom: -160,
    left: '15%',
  },

  inner: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  header: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 440,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  brandName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
    color: C.primary,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
  },

  toggleWrap: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    marginTop: 20,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: C.surfaceLow,
    borderRadius: 9999,
    padding: 6,
    gap: 4,
    width: 280,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9999,
    alignItems: 'center',
  },
  toggleTabActive: {
    backgroundColor: C.secondaryContainer,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
    color: C.onSurfaceVariant,
  },
  toggleLabelActive: {
    color: C.onSecondaryContainer,
  },

  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: C.surfaceLowest,
    borderRadius: 32,
    padding: 28,
    marginTop: 20,
    gap: 12,
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  field: {
    gap: 8,
  },
  label: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
    color: C.onSurface,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: C.surfaceContainer,
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 16,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    color: C.onSurface,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 17,
  },
  errorText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    color: '#ba1a1a',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: C.primaryContainer,
    height: 56,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#994531',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  submitLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.8,
    color: C.onPrimaryContainer,
    textTransform: 'uppercase',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.outlineVariant,
  },
  dividerText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.3,
    color: C.outline,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    gap: 12,
  },
  socialLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.3,
    color: C.onSurfaceVariant,
  },
});

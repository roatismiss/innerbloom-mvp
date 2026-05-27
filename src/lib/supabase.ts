import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const authOptions: Record<string, unknown> = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
  // PKCE is the recommended flow for SPAs/PWAs — more reliable refresh
  // behavior across PWA standalone vs browser tab contexts.
  flowType: 'pkce',
  // Explicit, stable key so the PWA (standalone, scope "/") and the same
  // origin opened in a regular tab don't end up reading from different
  // auto-generated keys after Supabase URL changes.
  storageKey: 'innerbloom-auth',
};

if (Platform.OS !== 'web') {
  authOptions.storage = AsyncStorage;
} else if (typeof window !== 'undefined') {
  // Pin storage to window.localStorage explicitly. Without this, supabase-js
  // auto-detects and can fall back to in-memory storage in some PWA
  // standalone contexts (notably when launched from the home screen on iOS
  // before document is fully ready), which silently logs the user out on
  // every cold start. The typeof check keeps this safe during static SSG.
  authOptions.storage = window.localStorage;
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl as string, supabaseAnonKey as string, {
      auth: authOptions,
    })
  : null;

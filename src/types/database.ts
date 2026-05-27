// ============================================================================
// Database types — 1:1 with supabase/migrations/20260601000000_initial.sql
// Keep in lockstep with the canonical migration.
// ============================================================================

export type IntentionTask = { id: string; label: string; done: boolean };

export type EmotionCategory =
  | 'anxious' | 'sad' | 'stressed' | 'neutral' | 'happy' | 'hopeful';

export type ReelCategory =
  | 'anxiety_stillness'
  | 'depression_hope'
  | 'motivation_direction'
  | 'financial_clarity'
  | 'breaking_patterns'
  | 'rest_recovery';

export type Tone =
  | 'soothing' | 'energizing' | 'grounding' | 'reflective';

export type LookingFor =
  | 'listener' | 'similar_story' | 'perspective' | 'just_presence';

export type CheckinFrequency = 'daily' | 'few_per_week' | 'flexible';
export type MatchStatus      = 'pending' | 'connected' | 'passed';
export type InstitutionType  = 'bpo' | 'university';
export type HugContextType   = 'reel' | 'match' | 'post';

export type Database = {
  public: {
    Tables: {
      institutions: {
        Row: {
          id: string;
          name: string;
          type: InstitutionType;
          city: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: InstitutionType;
          city: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['institutions']['Insert']>;
      };

      profiles: {
        Row: {
          id: string;
          anonymous_alias: string;
          city: string | null;
          institution_id: string | null;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          anonymous_alias: string;
          city?: string | null;
          institution_id?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['profiles']['Insert'], 'id'>>;
      };

      onboarding_responses: {
        Row: {
          user_id: string;
          baseline_mood: EmotionCategory;
          growth_goals: string[];
          checkin_frequency: CheckinFrequency;
          blooming_focus: string[];
          notification_opt_in: boolean;
          completed_at: string;
        };
        Insert: {
          user_id: string;
          baseline_mood: EmotionCategory;
          growth_goals?: string[];
          checkin_frequency: CheckinFrequency;
          blooming_focus?: string[];
          notification_opt_in?: boolean;
          completed_at?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['onboarding_responses']['Insert'], 'user_id'>>;
      };

      mood_checkins: {
        Row: {
          id: string;
          user_id: string;
          category: EmotionCategory;
          color_hex: string;
          intensity: number;
          anchor_word: string;
          checkin_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: EmotionCategory;
          color_hex: string;
          intensity: number;
          anchor_word: string;
          checkin_date?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mood_checkins']['Insert']>;
      };

      mood_streaks: {
        Row: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_checkin_date: string | null;
          updated_at: string;
        };
        // Populated by trigger only; never inserted/updated from client.
        Insert: { user_id: string };
        Update: { user_id?: string };
      };

      bloom_quotes: {
        Row: {
          id: string;
          body: string;
          author: string | null;
          categories: EmotionCategory[];
          tone: Tone;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          body: string;
          author?: string | null;
          categories: EmotionCategory[];
          tone: Tone;
          is_published?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bloom_quotes']['Insert']>;
      };

      bloom_posts: {
        Row: {
          id: string;
          user_id: string;
          sentence: string;
          color_hex: string;
          anchor_word: string;
          category: EmotionCategory;
          resonance_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sentence: string;
          color_hex: string;
          anchor_word: string;
          category: EmotionCategory;
          resonance_count?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bloom_posts']['Insert']>;
      };

      resonances: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['resonances']['Insert']>;
      };

      bloom_reels: {
        Row: {
          id: string;
          content: string;
          category: ReelCategory;
          color_hex: string;
          duration_ms: number;
          author_alias: string;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          category: ReelCategory;
          color_hex: string;
          duration_ms?: number;
          author_alias: string;
          is_published?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bloom_reels']['Insert']>;
      };

      soul_match_quiz_responses: {
        Row: {
          id: string;
          user_id: string;
          quiz_date: string;
          current_feeling: EmotionCategory;
          looking_for: LookingFor;
          energy_level: number;
          openness_level: number;
          prompt_answer: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quiz_date?: string;
          current_feeling: EmotionCategory;
          looking_for: LookingFor;
          energy_level: number;
          openness_level: number;
          prompt_answer: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['soul_match_quiz_responses']['Insert']>;
      };

      soul_matches: {
        Row: {
          id: string;
          user_a_id: string;
          user_b_id: string;
          shared_category: EmotionCategory;
          resonance_score: number;
          status: MatchStatus;
          match_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_a_id: string;
          user_b_id: string;
          shared_category: EmotionCategory;
          resonance_score: number;
          status?: MatchStatus;
          match_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['soul_matches']['Insert']>;
      };

      conversations: {
        Row: {
          id: string;
          match_id: string | null;
          user_a_id: string;
          user_b_id: string;
          created_at: string;
          closed_at: string | null;
          is_kept: boolean;
        };
        Insert: {
          id?: string;
          match_id?: string | null;
          user_a_id: string;
          user_b_id: string;
          created_at?: string;
          closed_at?: string | null;
          is_kept?: boolean;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };

      hugs: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          context_type: HugContextType;
          context_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          context_type: HugContextType;
          context_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['hugs']['Insert']>;
      };

      bloom_chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          last_at: string;
          message_count: number;
          title: string | null;
          primary_feeling: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          started_at?: string;
          last_at?: string;
          message_count?: number;
          title?: string | null;
          primary_feeling?: string | null;
        };
        Update: Partial<Database['public']['Tables']['bloom_chat_sessions']['Insert']>;
      };

      user_push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android' | 'web';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android' | 'web';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_push_tokens']['Insert']>;
      };

      bloom_chat_messages: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          cards: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          cards?: unknown;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bloom_chat_messages']['Insert']>;
      };

      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          body: string;
          entry_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          body: string;
          entry_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['journal_entries']['Insert'], 'user_id'>>;
      };

      daily_intentions: {
        Row: {
          id: string;
          user_id: string;
          intention_date: string;
          primary_text: string;
          tasks: IntentionTask[];
          honored: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          intention_date?: string;
          primary_text?: string;
          tasks?: IntentionTask[];
          honored?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['daily_intentions']['Insert'], 'user_id'>>;
      };
    };

    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// ---------------------------------------------------------------------------
// RPC payload + return types — used with `sb().rpc('name', args as never)`.
// We keep these separate from the supabase-js Functions generic because
// the v2 generic constraint is strict and we'd rather cast at the boundary
// than risk the whole Database type collapsing to `never` on mismatch.
// ---------------------------------------------------------------------------

export type CompleteOnboardingArgs = {
  payload: {
    baseline_mood: EmotionCategory;
    growth_goals?: string[];
    checkin_frequency: CheckinFrequency;
    blooming_focus?: string[];
    notification_opt_in?: boolean;
    baseline_color_hex?: string;
    baseline_intensity?: number;
    baseline_anchor_word?: string;
  };
};
export type CompleteOnboardingResult = {
  onboarded_at: string;
  baseline_mood: EmotionCategory;
};

export type SubmitMoodCheckinArgs = {
  p_category: EmotionCategory;
  p_intensity: number;
  p_anchor_word: string;
  p_color_hex: string;
};
export type SubmitMoodCheckinResult = {
  mood: MoodCheckinRow;
  streak: MoodStreakRow;
};

export type TodayForMe = {
  mood: MoodCheckinRow | null;
  streak: MoodStreakRow;
  quote: BloomQuoteRow | null;
  reels: BloomReelRow[];
  feed_categories: EmotionCategory[];
};

export type MoodHistoryDay = {
  day: string;
  category: EmotionCategory | null;
  intensity: number | null;
  color_hex: string | null;
  anchor_word: string | null;
};

export type SendMessageArgs = { p_conversation_id: string; p_body: string };
export type SendMessageResult = MessageRow;

// ─── Kindred (Soul Garden) ────────────────────────────────────────────────

export type KindredRequestStatus =
  | 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export type KindredRequestRow = {
  id: string;
  conversation_id: string;
  from_user_id: string;
  to_user_id: string;
  note: string | null;
  status: KindredRequestStatus;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
};

export type KindredStatusState = 'none' | 'sent' | 'incoming' | 'kept';

export type KindredStatus =
  | { state: 'none' }
  | { state: 'sent';     request_id: string; sent_at: string }
  | { state: 'incoming'; request_id: string; note: string | null }
  | { state: 'kept' };

export type KindredGardenRow = {
  conversation_id: string;
  other_user_id: string;
  other_alias: string;
  shared_category: EmotionCategory;
  kept_since: string;
  last_message_at: string | null;
  last_message_body: string | null;
  unread_count: number;
};

export type PendingKindredRequestRow = {
  request_id: string;
  conversation_id: string;
  from_user_id: string;
  from_alias: string;
  shared_category: EmotionCategory;
  note: string | null;
  created_at: string;
  expires_at: string;
};

export type KindredRequestSendArgs = {
  p_conversation_id: string;
  p_note?: string | null;
};
export type KindredRequestRespondArgs = {
  p_request_id: string;
  p_accept: boolean;
};
export type KindredRequestCancelArgs = { p_request_id: string };
export type KindredReleaseArgs       = { p_conversation_id: string };
export type KindredStatusArgs        = { p_conversation_id: string };

// Convenience row-type aliases
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type ProfileRow             = Tables<'profiles'>;
export type OnboardingResponseRow  = Tables<'onboarding_responses'>;
export type MoodCheckinRow         = Tables<'mood_checkins'>;
export type MoodStreakRow          = Tables<'mood_streaks'>;
export type BloomQuoteRow          = Tables<'bloom_quotes'>;
export type BloomPostRow           = Tables<'bloom_posts'>;
export type ResonanceRow           = Tables<'resonances'>;
export type SoulMatchQuizRow       = Tables<'soul_match_quiz_responses'>;
export type SoulMatchRow           = Tables<'soul_matches'>;
export type ConversationRow        = Tables<'conversations'>;
export type MessageRow             = Tables<'messages'>;
export type BloomReelRow           = Tables<'bloom_reels'>;
export type HugRow                 = Tables<'hugs'>;
export type JournalEntryRow        = Tables<'journal_entries'>;
export type DailyIntentionRow      = Tables<'daily_intentions'>;

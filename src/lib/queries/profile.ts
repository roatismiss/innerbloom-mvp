// ============================================================================
// Profile screen — read-only stats + recent activity.
// ============================================================================
// All counts are derived via `head: true` aggregates so we don't pay for
// row payload we never use. Five parallel queries instead of one server-side
// RPC: cheaper than a migration round-trip and well within Supabase's
// connection budget for a single screen.
// ============================================================================

import { useQuery } from '@tanstack/react-query';

import type { JournalEntry } from './journal';
import { sb } from './client';

export type ProfileStats = {
  checkinsTotal:        number;
  checkinsThisMonth:    number;
  journalsTotal:        number;
  journalsThisMonth:    number;
  hugsReceived:         number;
  hugsSent:             number;
  keptKindredCount:     number;
  currentStreak:        number;
  longestStreak:        number;
};

export type ProfileSummary = {
  id:                   string;
  anonymous_alias:      string;
  city:                 string | null;
  institution_id:       string | null;
  joined_at:            string;
  institution_name:     string | null;
};

// First day of the current month, ISO date — for "this month" rollups.
function monthStartISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

// ─── Profile summary (alias, city, institution, joined date) ──────────────

export function useMyProfile() {
  return useQuery<ProfileSummary | null>({
    queryKey: ['my-profile'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const client = sb();
      const { data: { user } } = await client.auth.getUser();
      if (!user) return null;

      // RLS on `profiles` lets the owner read their own row.
      const { data: profile, error } = await client
        .from('profiles')
        .select('id, anonymous_alias, city, institution_id, created_at')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!profile) return null;

      // Institution name is a separate hop — only fetch if linked.
      let institutionName: string | null = null;
      if (profile.institution_id) {
        const { data: inst } = await client
          .from('institutions')
          .select('name')
          .eq('id', profile.institution_id)
          .maybeSingle();
        institutionName = inst?.name ?? null;
      }

      return {
        id:               profile.id,
        anonymous_alias:  profile.anonymous_alias,
        city:             profile.city,
        institution_id:   profile.institution_id,
        joined_at:        profile.created_at,
        institution_name: institutionName,
      };
    },
  });
}

// ─── Aggregated stats ─────────────────────────────────────────────────────

export function useProfileStats() {
  return useQuery<ProfileStats>({
    queryKey: ['profile-stats'],
    staleTime: 60_000,
    queryFn: async () => {
      const client = sb();
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        return {
          checkinsTotal: 0, checkinsThisMonth: 0,
          journalsTotal: 0, journalsThisMonth: 0,
          hugsReceived: 0, hugsSent: 0,
          keptKindredCount: 0,
          currentStreak: 0, longestStreak: 0,
        };
      }

      const uid = user.id;
      const monthStart = monthStartISO();

      const [
        checkinsTotalRes,
        checkinsMonthRes,
        journalsTotalRes,
        journalsMonthRes,
        hugsReceivedRes,
        hugsSentRes,
        keptRes,
        streakRes,
      ] = await Promise.all([
        client.from('mood_checkins').select('*', { count: 'exact', head: true })
          .eq('user_id', uid),
        client.from('mood_checkins').select('*', { count: 'exact', head: true })
          .eq('user_id', uid)
          .gte('checkin_date', monthStart),
        client.from('journal_entries').select('*', { count: 'exact', head: true })
          .eq('user_id', uid),
        client.from('journal_entries').select('*', { count: 'exact', head: true })
          .eq('user_id', uid)
          .gte('entry_date', monthStart),
        client.from('hugs').select('*', { count: 'exact', head: true })
          .eq('to_user_id', uid),
        client.from('hugs').select('*', { count: 'exact', head: true })
          .eq('from_user_id', uid),
        client.from('conversations').select('*', { count: 'exact', head: true })
          .eq('is_kept', true)
          .or(`user_a_id.eq.${uid},user_b_id.eq.${uid}`),
        client.from('mood_streaks')
          .select('current_streak, longest_streak')
          .eq('user_id', uid)
          .maybeSingle(),
      ]);

      return {
        checkinsTotal:     checkinsTotalRes.count ?? 0,
        checkinsThisMonth: checkinsMonthRes.count ?? 0,
        journalsTotal:     journalsTotalRes.count ?? 0,
        journalsThisMonth: journalsMonthRes.count ?? 0,
        hugsReceived:      hugsReceivedRes.count ?? 0,
        hugsSent:          hugsSentRes.count ?? 0,
        keptKindredCount:  keptRes.count ?? 0,
        currentStreak:     streakRes.data?.current_streak ?? 0,
        longestStreak:     streakRes.data?.longest_streak ?? 0,
      };
    },
  });
}

// ─── Recent activity (journal entries, newest first) ──────────────────────

export type RecentActivity = JournalEntry & {
  monthLabel: string;
  dayLabel:   string;
  title:      string;
  snippet:    string;
};

export function useRecentActivity(limit = 5) {
  return useQuery<RecentActivity[]>({
    queryKey: ['profile-recent-activity', limit],
    staleTime: 30_000,
    queryFn: async () => {
      const client = sb();
      const { data: { user } } = await client.auth.getUser();
      if (!user) return [];

      const { data, error } = await client
        .from('journal_entries')
        .select('id, body, entry_date, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;

      return (data ?? []).map((row): RecentActivity => {
        const r = row as JournalEntry;
        const d = new Date(r.created_at);
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const day = String(d.getDate());
        // First line (up to ~40 chars) becomes the title; the remainder
        // becomes the snippet. Mirrors how the journal screen treats entries.
        const firstNewline = r.body.indexOf('\n');
        const titleSource = firstNewline > 0 ? r.body.slice(0, firstNewline) : r.body;
        const title = titleSource.length > 48
          ? titleSource.slice(0, 47).trimEnd() + '…'
          : titleSource;
        const remaining = firstNewline > 0 ? r.body.slice(firstNewline + 1).trim() : '';
        const snippet = remaining || (r.body.length > title.length ? r.body.slice(title.length).trim() : '—');

        return {
          ...r,
          monthLabel: month.toUpperCase(),
          dayLabel:   day,
          title:      title || 'Untitled reflection',
          snippet:    snippet.length > 80 ? snippet.slice(0, 79).trimEnd() + '…' : snippet,
        };
      });
    },
  });
}

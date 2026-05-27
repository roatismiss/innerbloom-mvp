import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { sb } from './client';

export type JournalEntry = {
  id: string;
  body: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
};

type RawJournalRow = {
  id: string;
  body: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
};

// List recent journal entries, newest first. Drives the "Recent Entries"
// section on the journal screen.
export function useJournalEntries(limit = 50) {
  return useQuery<JournalEntry[]>({
    queryKey: ['journal', 'list', limit],
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
      return (data ?? []) as unknown as RawJournalRow[];
    },
  });
}

// Create a journal entry. Optimistically prepends so the new entry is
// visible immediately, then reconciles with the server-assigned id.
export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation<JournalEntry, Error, { body: string }>({
    mutationFn: async ({ body }) => {
      const trimmed = body.trim();
      if (!trimmed) throw new Error('empty_entry');

      const client = sb();
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('not_signed_in');

      const today = new Date();
      const entry_date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const { data, error } = await client
        .from('journal_entries')
        .insert({
          user_id: user.id,
          body: trimmed,
          entry_date,
        })
        .select('id, body, entry_date, created_at, updated_at')
        .single();
      if (error) throw error;
      return data as unknown as RawJournalRow;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['journal', 'list'] });
    },
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await sb().from('journal_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['journal', 'list'] });
    },
  });
}

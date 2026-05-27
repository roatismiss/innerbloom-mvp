// ============================================================================
// Identity — set display_name + upload avatar.
// ============================================================================
// Both are opt-in. Empty / null values reset back to fully anonymous.
//
// REQUIRED INSTALL (one-time):
//   npx expo install expo-image-picker
//
// REQUIRED STORAGE BUCKET (one-time, manual via Supabase Dashboard):
//   Dashboard → Storage → New bucket: name = "avatars", public = true
//   Policies (Storage → avatars → Policies → New policy):
//     SELECT  → "Allow public read"  → using: true
//     INSERT  → "Owner uploads"      → with check:
//                 auth.uid()::text = (storage.foldername(name))[1]
//     UPDATE  → "Owner updates"      → using/with check: same as INSERT
//     DELETE  → "Owner deletes"      → using: same as INSERT
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { SetMyIdentityArgs } from '../../types/database';
import { callRpc, sb } from './client';

// ─── Set display_name / avatar_url ────────────────────────────────────────

export function useSetMyIdentity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { displayName?: string | null; avatarUrl?: string | null }) =>
      callRpc<SetMyIdentityArgs, unknown>('set_my_identity', {
        p_display_name: args.displayName ?? null,
        p_avatar_url:   args.avatarUrl ?? null,
      }),
    onSuccess: () => {
      // Every surface that shows alias/name/avatar should refetch.
      void qc.invalidateQueries({ queryKey: ['my-profile'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['kindred-garden'] });
      void qc.invalidateQueries({ queryKey: ['conversation-with-other'] });
      void qc.invalidateQueries({ queryKey: ['notifications-inbox'] });
    },
  });
}

// ─── Upload avatar to Storage (returns public URL) ────────────────────────

export type UploadAvatarResult = { publicUrl: string };

export function useUploadAvatar() {
  return useMutation<UploadAvatarResult, Error, { uri: string; mime?: string }>({
    mutationFn: async ({ uri, mime }) => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user) throw new Error('unauthenticated');

      // Works for both native file:// URIs and web blob URLs — fetch turns
      // both into a Blob the supabase-js storage client accepts.
      const response = await fetch(uri);
      const blob = await response.blob();
      const contentType = mime || blob.type || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png'
              : contentType.includes('webp') ? 'webp'
              : 'jpg';

      // Path scopes the upload under the user's id, which is what our
      // bucket policies expect for the INSERT/UPDATE/DELETE rules.
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadErr } = await sb()
        .storage
        .from('avatars')
        .upload(path, blob, {
          contentType,
          upsert: true,
          cacheControl: '3600',
        });
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: { publicUrl } } = sb()
        .storage
        .from('avatars')
        .getPublicUrl(path);

      return { publicUrl };
    },
  });
}

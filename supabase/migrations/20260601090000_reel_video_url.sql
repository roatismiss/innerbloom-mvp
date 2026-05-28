-- ============================================================================
-- InnerBloom — Add video_url to bloom_reels + storage bucket for reels
-- ============================================================================
-- Existing text-only reels stay valid (video_url is nullable).
-- Video reels stream from Supabase Storage CDN instead of bundled assets.
-- ============================================================================

begin;

-- Add video_url column (nullable — text reels don't have one)
alter table bloom_reels
  add column if not exists video_url text;

-- Create public storage bucket for reels (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reels',
  'reels',
  true,
  52428800,  -- 50 MB per file
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;

-- Anyone authenticated can read (stream) reel videos
drop policy if exists reels_storage_select on storage.objects;
create policy reels_storage_select
  on storage.objects for select to authenticated
  using (bucket_id = 'reels');

-- Only service_role can upload (uploads happen via server/script, not client)
drop policy if exists reels_storage_insert on storage.objects;
create policy reels_storage_insert
  on storage.objects for insert to service_role
  with check (bucket_id = 'reels');

commit;

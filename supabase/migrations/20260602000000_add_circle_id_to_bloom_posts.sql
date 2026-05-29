-- ============================================================================
-- Add circle_id column to bloom_posts table
-- This allows posts to be associated with specific circles (anxiety, recovery, etc.)
-- ============================================================================

-- Add circle_id column (nullable to support existing posts and community feed posts)
alter table bloom_posts 
  add column if not exists circle_id text;

-- Add index for efficient circle-specific queries
create index if not exists bloom_posts_circle_idx 
  on bloom_posts(circle_id, created_at desc) 
  where circle_id is not null;

-- Add comment for documentation
comment on column bloom_posts.circle_id is 
  'Optional circle identifier (e.g., "anxiety", "recovery", "grief"). NULL means community feed post.';

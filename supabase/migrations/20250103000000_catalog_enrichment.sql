-- ============================================================================
-- Catalog enrichment: editable YouTube links and lyrics
--
-- Safe to re-run. The existing catalog_songs RLS policies already allow
-- authenticated admins to update catalog rows.
-- ============================================================================

alter table public.catalog_songs
  add column if not exists youtube_url text,
  add column if not exists youtube_video_id text,
  add column if not exists youtube_title text,
  add column if not exists youtube_channel text,
  add column if not exists youtube_updated_at timestamptz,
  add column if not exists lyrics_text text,
  add column if not exists lyrics_source text,
  add column if not exists lyrics_source_url text,
  add column if not exists lyrics_updated_at timestamptz;

comment on column public.catalog_songs.youtube_url is
  'Canonical YouTube watch URL for this catalog recording.';
comment on column public.catalog_songs.youtube_video_id is
  'YouTube video id extracted from youtube_url.';
comment on column public.catalog_songs.lyrics_text is
  'Full lyrics text. May be manually edited or imported from a provider.';
comment on column public.catalog_songs.lyrics_source is
  'Where the lyrics came from, e.g. tkaraoke, lyrics.vn, lrclib, manual.';

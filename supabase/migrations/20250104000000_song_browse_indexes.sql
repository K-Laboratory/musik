-- Indexes for the admin song browser: server-side search, status filters,
-- emotion filters, and the sort options. Safe to re-run.

create extension if not exists pg_trgm;

create index if not exists catalog_songs_title_trgm_idx
  on public.catalog_songs using gin (title gin_trgm_ops);

create index if not exists catalog_songs_artist_trgm_idx
  on public.catalog_songs using gin (artist gin_trgm_ops);

create index if not exists catalog_songs_year_title_idx
  on public.catalog_songs (year, title);

create index if not exists catalog_songs_artist_sort_idx
  on public.catalog_songs (artist, year, title);

create index if not exists catalog_songs_created_at_idx
  on public.catalog_songs (created_at desc);

create index if not exists catalog_songs_lyrics_updated_idx
  on public.catalog_songs (lyrics_updated_at desc)
  where lyrics_updated_at is not null;

create index if not exists catalog_songs_missing_youtube_idx
  on public.catalog_songs (year, title)
  where youtube_url is null;

create index if not exists catalog_songs_missing_lyrics_idx
  on public.catalog_songs (year, title)
  where lyrics_text is null;

create index if not exists song_analysis_recent_idx
  on public.song_analysis (taxonomy_version, analyzed_at desc);

create index if not exists song_analysis_review_idx
  on public.song_analysis (taxonomy_version, song_id)
  where needs_review;

create index if not exists song_emotions_emotion_song_idx
  on public.song_emotions (emotion_id, song_id);

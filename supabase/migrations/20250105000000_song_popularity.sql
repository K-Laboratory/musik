-- Popularity metrics for catalog songs.
--
-- The summary score lives on catalog_songs so the admin list can filter and
-- sort cheaply. The detailed metrics live in song_popularity.

alter table public.catalog_songs
  add column if not exists popularity_score numeric(5,2);

create index if not exists catalog_songs_popularity_idx
  on public.catalog_songs (popularity_score desc nulls last);

create table if not exists public.song_popularity (
  song_id               uuid primary key references public.catalog_songs (id) on delete cascade,
  youtube_video_id      text,
  view_count            bigint,
  like_count            bigint,
  comment_count         bigint,
  channel_id            text,
  channel_subscribers   bigint,
  published_at          timestamptz,
  duration_seconds      integer,
  views_per_day         numeric(12,2),
  engagement_rate       numeric(8,5),
  popularity_score      numeric(5,2) not null,
  popularity_tier       text not null,
  source                text not null default 'youtube',
  calculated_at         timestamptz not null default now()
);

create index if not exists song_popularity_score_idx
  on public.song_popularity (popularity_score desc);

alter table public.song_popularity enable row level security;

drop policy if exists "song_popularity_select" on public.song_popularity;
create policy "song_popularity_select"
  on public.song_popularity for select to authenticated using (true);

drop policy if exists "song_popularity_admin_write" on public.song_popularity;
create policy "song_popularity_admin_write"
  on public.song_popularity for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.song_popularity to authenticated;
grant insert, update, delete on public.song_popularity to authenticated;

-- User-designed albums.
--
-- Albums are deliberately separate from playlists: an album references the
-- shared catalog directly, so generating one never copies songs into the
-- listener's personal library.

create table if not exists public.albums (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  title          text not null check (char_length(trim(title)) between 1 and 100),
  description    text,
  config         jsonb not null default '{}'::jsonb,
  stats          jsonb not null default '{}'::jsonb,
  track_count    integer not null default 0 check (track_count between 0 and 50),
  cover_video_ids text[] not null default '{}'::text[],
  created_at     timestamptz not null default now()
);

create table if not exists public.album_songs (
  id         uuid primary key default gen_random_uuid(),
  album_id   uuid not null references public.albums (id) on delete cascade,
  song_id    uuid not null references public.catalog_songs (id) on delete cascade,
  position   integer not null check (position >= 0),
  role       text not null default 'track',
  created_at timestamptz not null default now()
);

create unique index if not exists album_songs_album_song_key
  on public.album_songs (album_id, song_id);

create unique index if not exists album_songs_album_position_key
  on public.album_songs (album_id, position);

create index if not exists albums_user_created_idx
  on public.albums (user_id, created_at desc);

create index if not exists album_songs_album_position_idx
  on public.album_songs (album_id, position);

alter table public.albums enable row level security;
alter table public.album_songs enable row level security;

drop policy if exists "albums_select_own" on public.albums;
create policy "albums_select_own"
  on public.albums for select
  using ((select auth.uid()) = user_id);

drop policy if exists "albums_insert_own" on public.albums;
create policy "albums_insert_own"
  on public.albums for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "albums_update_own" on public.albums;
create policy "albums_update_own"
  on public.albums for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "albums_delete_own" on public.albums;
create policy "albums_delete_own"
  on public.albums for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "album_songs_select_own" on public.album_songs;
create policy "album_songs_select_own"
  on public.album_songs for select
  using (
    exists (
      select 1
      from public.albums a
      where a.id = album_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "album_songs_insert_own" on public.album_songs;
create policy "album_songs_insert_own"
  on public.album_songs for insert
  with check (
    exists (
      select 1
      from public.albums a
      where a.id = album_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "album_songs_update_own" on public.album_songs;
create policy "album_songs_update_own"
  on public.album_songs for update
  using (
    exists (
      select 1
      from public.albums a
      where a.id = album_id and a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.albums a
      where a.id = album_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "album_songs_delete_own" on public.album_songs;
create policy "album_songs_delete_own"
  on public.album_songs for delete
  using (
    exists (
      select 1
      from public.albums a
      where a.id = album_id and a.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.albums to authenticated;
grant select, insert, update, delete on public.album_songs to authenticated;

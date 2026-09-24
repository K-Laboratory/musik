-- ============================================================================
-- Favorite Songs - database schema + Row Level Security policies
--
-- How to run:
--   1. Open your Supabase project dashboard.
--   2. Go to "SQL Editor" -> "New query".
--   3. Paste the entire contents of this file and click "Run".
--
-- This script is idempotent-ish: it uses "if not exists" / "drop policy if
-- exists" so it is safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- One profile per authenticated user. Linked to Supabase's own auth.users table.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- A user's playlists.
create table if not exists public.playlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

-- A user's personal library of songs (global, not tied to a playlist).
create table if not exists public.songs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  youtube_video_id text not null,
  title            text not null,
  channel_title    text,
  thumbnail_url    text,
  duration         text,
  created_at       timestamptz not null default now()
);

-- Join table linking songs to playlists, with an explicit ordering.
create table if not exists public.playlist_songs (
  id          uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  song_id     uuid not null references public.songs (id) on delete cascade,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Constraints + indexes
-- ---------------------------------------------------------------------------

-- Each user can only save the same YouTube video once in their library.
create unique index if not exists songs_user_id_youtube_video_id_key
  on public.songs (user_id, youtube_video_id);

-- The same song can only appear once in a given playlist.
create unique index if not exists playlist_songs_playlist_id_song_id_key
  on public.playlist_songs (playlist_id, song_id);

create index if not exists playlists_user_id_idx
  on public.playlists (user_id);

create index if not exists songs_user_id_idx
  on public.songs (user_id);

create index if not exists playlist_songs_playlist_id_position_idx
  on public.playlist_songs (playlist_id, position);

create index if not exists playlist_songs_song_id_idx
  on public.playlist_songs (song_id);

-- ---------------------------------------------------------------------------
-- 3. Automatically create a profile on first sign-up / first login
-- ---------------------------------------------------------------------------
-- Supabase inserts a row into auth.users the first time a user signs in with an
-- OAuth provider. This trigger mirrors that row into public.profiles.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'user_name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    coalesce(
      case
        when (new.raw_user_meta_data ->> 'avatar_url') like 'http%'
        then new.raw_user_meta_data ->> 'avatar_url'
      end,
      case
        when (new.raw_user_meta_data ->> 'picture') like 'http%'
        then new.raw_user_meta_data ->> 'picture'
      end
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.playlists      enable row level security;
alter table public.songs          enable row level security;
alter table public.playlist_songs enable row level security;

-- --- profiles ---------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- --- playlists --------------------------------------------------------------
drop policy if exists "playlists_select_own" on public.playlists;
create policy "playlists_select_own"
  on public.playlists for select
  using ((select auth.uid()) = user_id);

drop policy if exists "playlists_insert_own" on public.playlists;
create policy "playlists_insert_own"
  on public.playlists for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "playlists_update_own" on public.playlists;
create policy "playlists_update_own"
  on public.playlists for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "playlists_delete_own" on public.playlists;
create policy "playlists_delete_own"
  on public.playlists for delete
  using ((select auth.uid()) = user_id);

-- --- songs ------------------------------------------------------------------
drop policy if exists "songs_select_own" on public.songs;
create policy "songs_select_own"
  on public.songs for select
  using ((select auth.uid()) = user_id);

drop policy if exists "songs_insert_own" on public.songs;
create policy "songs_insert_own"
  on public.songs for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "songs_update_own" on public.songs;
create policy "songs_update_own"
  on public.songs for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "songs_delete_own" on public.songs;
create policy "songs_delete_own"
  on public.songs for delete
  using ((select auth.uid()) = user_id);

-- --- playlist_songs ---------------------------------------------------------
-- Rows are readable/writable only when the user owns BOTH the playlist and the
-- song being linked.

drop policy if exists "playlist_songs_select_own" on public.playlist_songs;
create policy "playlist_songs_select_own"
  on public.playlist_songs for select
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "playlist_songs_insert_own" on public.playlist_songs;
create policy "playlist_songs_insert_own"
  on public.playlist_songs for insert
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.songs s
      where s.id = song_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "playlist_songs_update_own" on public.playlist_songs;
create policy "playlist_songs_update_own"
  on public.playlist_songs for update
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "playlist_songs_delete_own" on public.playlist_songs;
create policy "playlist_songs_delete_own"
  on public.playlist_songs for delete
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Table privileges
-- ---------------------------------------------------------------------------
-- Supabase grants these by default, but we state them explicitly so the script
-- works even on a bare Postgres instance. RLS still restricts every row.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles       to authenticated;
grant select, insert, update, delete on public.playlists      to authenticated;
grant select, insert, update, delete on public.songs          to authenticated;
grant select, insert, update, delete on public.playlist_songs to authenticated;

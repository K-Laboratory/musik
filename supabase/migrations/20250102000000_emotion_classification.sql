-- ============================================================================
-- Music emotion classification - schema (Step 2b)
--
-- How to run:
--   1. Open your Supabase project dashboard.
--   2. Go to "SQL Editor" -> "New query".
--   3. Paste the entire contents of this file and click "Run".
--
-- Safe to re-run (uses "if not exists" / "create or replace" / "drop policy
-- if exists").
--
-- Admin access is gated on the user's email appearing in the
-- `admin_emails` table (see the seed insert at the bottom). RLS lets normal
-- authenticated users READ the taxonomy and catalog; only admins may write.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Admin allowlist
-- ---------------------------------------------------------------------------

create table if not exists public.admin_emails (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;

-- Helper used by RLS policies on the other tables.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. Taxonomy tables
-- ---------------------------------------------------------------------------

-- Vietnamese generational cohorts (see docs/generations-vietnam.md).
create table if not exists public.generations (
  id            text primary key,          -- e.g. 'millennial'
  label_en      text not null,
  label_vi      text not null,
  birth_start   integer,
  birth_end     integer,
  formative_era text,
  position      integer not null default 0
);

-- The 20 emotion categories, anchored on the valence-arousal plane
-- (see docs/emotion-taxonomy.md).
create table if not exists public.emotions (
  id          text primary key,            -- e.g. 'nostalgic'
  name        text not null,
  definition  text,
  sounds_like text,
  valence     numeric(3,1) not null,       -- -2.0 .. 2.0
  arousal     numeric(3,1) not null,       -- -2.0 .. 2.0
  quadrant    text not null                -- Q1_happy | Q2_angry | Q3_sad | Q4_relaxed
);

-- ---------------------------------------------------------------------------
-- 2. Catalog
-- ---------------------------------------------------------------------------

-- A song in the classification catalog. This is DELIBERATELY separate from
-- public.songs (which is each end-user's personal YouTube library).
create table if not exists public.catalog_songs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  artist        text not null,
  year          integer,
  generation_id text references public.generations (id) on delete set null,
  source        text,                      -- 'manual' | 'musicbrainz' | 'deezer' ...
  source_id     text,
  source_url    text,
  created_at    timestamptz not null default now()
);

create index if not exists catalog_songs_generation_idx
  on public.catalog_songs (generation_id);

create unique index if not exists catalog_songs_identity_key
  on public.catalog_songs (lower(title), lower(artist));

-- ---------------------------------------------------------------------------
-- 3. Classification results
-- ---------------------------------------------------------------------------

-- One or more emotion tags per song (a song can be, e.g., nostalgic + tender).
create table if not exists public.song_emotions (
  id          uuid primary key default gen_random_uuid(),
  song_id     uuid not null references public.catalog_songs (id) on delete cascade,
  emotion_id  text not null references public.emotions (id) on delete cascade,
  confidence  numeric(4,3) not null default 0 check (confidence between 0 and 1),
  is_primary  boolean not null default false,
  source      text not null default 'auto',  -- 'auto' | 'manual'
  created_at  timestamptz not null default now()
);

create unique index if not exists song_emotions_song_emotion_key
  on public.song_emotions (song_id, emotion_id);

create index if not exists song_emotions_song_idx
  on public.song_emotions (song_id);

-- Dimensional analysis, keyed by taxonomy version so old and new results can
-- coexist during a re-classification.
create table if not exists public.song_analysis (
  id                uuid primary key default gen_random_uuid(),
  song_id           uuid not null references public.catalog_songs (id) on delete cascade,
  valence           numeric(3,1),           -- -2.0 .. 2.0
  arousal           numeric(3,1),           -- -2.0 .. 2.0
  quadrant          text,
  model             text,                   -- e.g. 'gpt-x'
  taxonomy_version  integer not null default 1,
  rationale         text,                   -- short; must NOT contain lyric quotes
  needs_review      boolean not null default false,
  analyzed_at       timestamptz not null default now()
);

create unique index if not exists song_analysis_song_version_key
  on public.song_analysis (song_id, taxonomy_version);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.generations      enable row level security;
alter table public.emotions         enable row level security;
alter table public.catalog_songs    enable row level security;
alter table public.song_emotions    enable row level security;
alter table public.song_analysis    enable row level security;

-- Taxonomy + catalog: readable by any authenticated user, writable by admins.

drop policy if exists "generations_select" on public.generations;
create policy "generations_select"
  on public.generations for select to authenticated using (true);

drop policy if exists "generations_admin_write" on public.generations;
create policy "generations_admin_write"
  on public.generations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "emotions_select" on public.emotions;
create policy "emotions_select"
  on public.emotions for select to authenticated using (true);

drop policy if exists "emotions_admin_write" on public.emotions;
create policy "emotions_admin_write"
  on public.emotions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "catalog_songs_select" on public.catalog_songs;
create policy "catalog_songs_select"
  on public.catalog_songs for select to authenticated using (true);

drop policy if exists "catalog_songs_admin_write" on public.catalog_songs;
create policy "catalog_songs_admin_write"
  on public.catalog_songs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "song_emotions_select" on public.song_emotions;
create policy "song_emotions_select"
  on public.song_emotions for select to authenticated using (true);

drop policy if exists "song_emotions_admin_write" on public.song_emotions;
create policy "song_emotions_admin_write"
  on public.song_emotions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "song_analysis_select" on public.song_analysis;
create policy "song_analysis_select"
  on public.song_analysis for select to authenticated using (true);

drop policy if exists "song_analysis_admin_write" on public.song_analysis;
create policy "song_analysis_admin_write"
  on public.song_analysis for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- admin_emails itself is not readable via RLS; access goes through is_admin().
drop policy if exists "admin_emails_select_self" on public.admin_emails;
create policy "admin_emails_select_self"
  on public.admin_emails for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ---------------------------------------------------------------------------
-- 5. Table privileges
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.generations   to authenticated;
grant select on public.emotions      to authenticated;
grant select on public.catalog_songs to authenticated;
grant select on public.song_emotions to authenticated;
grant select on public.song_analysis to authenticated;
grant select on public.admin_emails  to authenticated;

grant insert, update, delete on public.generations   to authenticated;
grant insert, update, delete on public.emotions      to authenticated;
grant insert, update, delete on public.catalog_songs to authenticated;
grant insert, update, delete on public.song_emotions to authenticated;
grant insert, update, delete on public.song_analysis to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Seed the taxonomy (idempotent upserts)
-- ---------------------------------------------------------------------------

insert into public.generations (id, label_en, label_vi, birth_start, birth_end, formative_era, position) values
  ('pre1975',    'Pre-1975 (Saigon golden age)', 'thế hệ trước 1975', 1930, 1959, 'Nhạc vàng, bolero, tiền chiến, Saigon rock', 0),
  ('genx',       'Gen X',                        'thế hệ 7x',         1965, 1979, 'Bao cấp → Đổi Mới; nhạc đỏ (N), nhạc vàng (S), nhạc nhẹ', 1),
  ('millennial', 'Millennials',                  'thế hệ 8x',         1980, 1989, 'Late-90s–2000s nhạc trẻ boom; nhạc Hoa lời Việt', 2),
  ('gen9x',      '9x bridge',                    'thế hệ 9x',         1990, 1999, 'Yahoo era → 2010s V-pop; teen pop, early hip-hop', 3),
  ('genz',       'Gen Z',                        'thế hệ 10x (2K)',   2000, 2012, 'Streaming/TikTok, indie wave, Rap Việt', 4),
  ('diaspora',   'Diaspora',                     'Việt Kiều',         null, null, 'Pre-1975 repertoire preserved abroad; Paris By Night', 5)
on conflict (id) do update set
  label_en = excluded.label_en,
  label_vi = excluded.label_vi,
  birth_start = excluded.birth_start,
  birth_end = excluded.birth_end,
  formative_era = excluded.formative_era,
  position = excluded.position;

insert into public.emotions (id, name, definition, sounds_like, valence, arousal, quadrant) values
  ('joyful',     'Joyful / Happy',          'Bright, buoyant pleasure and good cheer',            'Upbeat major-key pop, fast tempo',              2.0,  2.0, 'Q1_happy'),
  ('euphoric',   'Euphoric / Pumped-up',    'Peak elation and high-intensity exhilaration',       'Festival EDM drop, stadium anthem',             2.0,  2.0, 'Q1_happy'),
  ('triumphant', 'Triumphant / Heroic',     'Victorious, soaring, confident grandeur',            'Cinematic brass fanfare, orchestral finale',    2.0,  1.5, 'Q1_happy'),
  ('erotic',     'Erotic / Sensual',        'Slow, seductive, physically intimate desire',        'Slow R&B groove, breathy vocals',               1.5,  0.0, 'Q4_relaxed'),
  ('tender',     'Tender / Affectionate',   'Warm, gentle fondness and care',                     'Soft acoustic ballad, lullaby',                 2.0, -1.0, 'Q4_relaxed'),
  ('nostalgic',  'Nostalgic / Sentimental', 'Bittersweet longing for the past',                   'Vintage torch song, old standard',              1.0, -0.5, 'Q4_relaxed'),
  ('dreamy',     'Dreamy / Ethereal',       'Hazy, floating, weightless reverie',                 'Ambient, shoegaze, reverb-washed pads',         1.0, -1.5, 'Q4_relaxed'),
  ('serene',     'Serene / Peaceful',       'Calm, still, untroubled contentment',                'New-age piano, slow drone',                     1.5, -2.0, 'Q4_relaxed'),
  ('relaxed',    'Relaxed / Mellow',        'Easygoing, low-tension groove',                      'Chill lo-fi hip-hop, bossa nova',               1.5, -1.0, 'Q4_relaxed'),
  ('awe',        'Awe / Wonder',            'Vast, sublime, self-transcending amazement',         'Choral crescendo, epic post-rock',              1.5,  0.5, 'Q1_happy'),
  ('funky',      'Funky / Groovy',          'Playful, danceable, body-moving good humour',        'Funk, disco, upbeat soul',                      1.5,  1.5, 'Q1_happy'),
  ('humorous',   'Humorous / Quirky',       'Silly, whimsical, comedic playfulness',              'Cartoon music, novelty song',                   1.0,  1.0, 'Q1_happy'),
  ('bittersweet','Bittersweet / Wistful',   'Simultaneous poignancy and beauty, gentle sorrow',   'Minor-key folk with warm harmony',             -0.5, -0.5, 'Q3_sad'),
  ('sad',        'Sad / Melancholic',       'Grief, sorrow, and low spirits',                     'Slow minor-key piano, blues',                  -2.0, -1.5, 'Q3_sad'),
  ('brooding',   'Brooding / Reflective',   'Dark, introspective, heavy rumination',              'Slow post-punk, moody trip-hop',               -1.0, -1.0, 'Q3_sad'),
  ('tense',      'Tense / Anxious',         'Uneasy, agitated foreboding',                        'Dissonant strings, ticking percussion',        -1.5,  1.0, 'Q2_angry'),
  ('angry',      'Angry / Aggressive',      'Hostile, forceful, confrontational fury',            'Distorted metal, hardcore punk',               -2.0,  2.0, 'Q2_angry'),
  ('fearful',    'Fearful / Scary',         'Threat, dread, and fright',                          'Horror-film stingers, discordant clusters',    -2.0,  1.5, 'Q2_angry'),
  ('defiant',    'Defiant / Rebellious',    'Bold, anti-authority, resistant energy',             'Protest rock, punk chant',                     -0.5,  2.0, 'Q2_angry'),
  ('neutral',    'Neutral / Ambient',       'Emotionally flat, functional background sound',      'Muzak, minimal tone bed',                       0.0,  0.0, 'Q3_sad')
on conflict (id) do update set
  name = excluded.name,
  definition = excluded.definition,
  sounds_like = excluded.sounds_like,
  valence = excluded.valence,
  arousal = excluded.arousal,
  quadrant = excluded.quadrant;

-- ---------------------------------------------------------------------------
-- 7. IMPORTANT: add your admin email(s)
-- ---------------------------------------------------------------------------
-- Replace with the email you sign in with. You can add more rows later.
--
-- insert into public.admin_emails (email) values ('you@example.com')
--   on conflict (email) do nothing;

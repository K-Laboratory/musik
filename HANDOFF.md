# Restart notes

Current goal: catalog enrichment and bilingual admin UI, kept local until
reviewed.

Completed:

- Added `.env.local` for local development using the hosted Supabase project.
- Added row selection and chunked re-classification to `/admin/songs`.
- Extended `/api/admin/classify/batch` to accept explicit `songIds`.
- Added YouTube, stored lyrics preview/full-text hover, and last-analyzed
  columns to the admin Songs table. Hovering never triggers a lyrics lookup.
- Added a per-song editor for YouTube URLs, full lyrics, and classification,
  plus separate batch auto-fill actions for YouTube and lyrics.
- Added tkaraoke and lyrics.vn lyrics providers and a YouTube match scorer.
- Added EN/VI language switching across the app and admin pages.
- Applied `20250103000000_catalog_enrichment.sql` to the hosted Supabase
  project. It adds YouTube and lyrics columns to `catalog_songs`.
- Applied `20250103000001_emotion_translations.sql` to the hosted Supabase
  project. It adds Vietnamese name, definition, and sounds-like columns to
  `emotions`; IDs remain stable in English.
- Local `.env.local` now has working `YOUTUBE_API_KEY` and `DEEPSEEK_API_KEY`
  values. Never commit this file.
- Fixed blank optional env values (`CLASSIFIER_API_BASE`, `CLASSIFIER_MODEL`,
  `LYRICS_API_BASE`, `SEARCH_API_BASE`) so they no longer produce invalid
  request URLs.
- Tightened YouTube matching: results that do not mention the catalog artist
  are rejected, preventing covers from being saved as the canonical recording.

Checks: `npm run typecheck`, `npm run lint`, and `npm run build` pass.
Live check: reclassified "Tình Thôi Xót Xa" from `/admin/songs`; the row
refreshed and the run log reported `lrclib` as the lyrics source.

Catalog note: the YouTube column uses `catalog_songs.youtube_url` when set,
otherwise a YouTube search for the title and artist.

Next step: review auto-filled matches for ambiguous songs, then continue with
the review UI in Step 4.

## 2026-10-19 song browser

Completed:

- Removed the no-lyrics rule. Hovering a lyrics cell shows the text already
  stored in `catalog_songs.lyrics_text`; it makes no network request.
- Added an always-visible pencil beside each song title and a full editor for
  YouTube URL, lyrics/source URL, emotion tags, confidence, primary tag,
  valence/arousal, and review status.
- Split batch auto-fill into `Auto-fill YouTube` and `Auto-fill lyrics`, each
  calling `/api/admin/enrich` with its own `kind`.
- Added server-side search, generation, emotion, content-status,
  classification-status, and year-range filters.
- Added server-side sorting by year, title, artist, recent classification,
  recent addition, and lyrics update time.
- Added page sizes 25/50/100/200, a page-jump control, and filter-preserving
  pagination. Filter state lives in the URL.
- Fixed EN/VI switching so it preserves the current query string.
- Added `supabase/migrations/20250104000000_song_browse_indexes.sql` with
  trigram search and browse/sort indexes for larger catalogs.

Checks: `npm run typecheck` and `npm run lint` pass. Manual browser checks
against the hosted Supabase project verified 99 missing-YouTube songs, 82
missing-lyrics songs, 47 sad songs, 1 needs-review song, a 2000-2005 year
range returning 52 songs, page-size and page-jump behavior, and both language
directions with filters retained.

Open items:

- The index migration is written but has not been applied to Supabase yet.
- Batch selection is per page; a server-side job would be needed to process
  an entire multi-thousand-song filter in one run.

## 2026-10-19 catalog build (2,100 songs)

Completed:

- Built a candidate pool from iTunes' Vietnamese catalog plus curated artist
  rosters for each generation, filtering karaoke, covers, live/medley cuts,
  and duplicate versions.
- Selected and inserted 2,000 new songs. The catalog now has exactly 2,100
  songs: 350 in each of `pre1975`, `genx`, `millennial`, `gen9x`, `genz`, and
  `diaspora`. The previous 100 Millennial songs were retained.
- Used era windows for the final selection: pre-1975 <=1975, Gen X 1975-2005,
  Millennial 1995-2015, 9x 2005-2020, Gen Z 2015+, Diaspora 1980+.
- Enriched YouTube links for 2,096 of 2,100 songs. Four remain unlinked
  because the catalog metadata conflicts with the available videos or only
  covers exist: "Tình Yêu Chắp Vá", "Đừng Hỏi Vì Sao", "Be Water My Friend",
  and "Cơn Mưa Ngang Qua".
- Filled lyrics for 1,377 of 2,100 songs using tkaraoke, lyrics.vn, and
  LRCLIB. 723 rows still lack lyrics; most are newer/obscure album tracks or
  titles that differ from the site listing.
- Classified all 2,100 songs with `deepseek-chat`: 2,100 `song_analysis`
  rows, one marked `needs_review`.
- Current primary-emotion distribution is led by bittersweet (626), sad
  (604), nostalgic (204), and tender (204). Quadrants: Q3 sad 1,105,
  Q1 happy 534, Q4 relaxed 337, Q2 angry 124.

Scripts added:

- `scripts/build-catalog-seed.mjs`
- `scripts/select-final.mjs`
- `scripts/import-catalog.mjs`
- `scripts/fill-missing.mjs`
- `scripts/enrich-catalog.ts`
- `scripts/infer-years.mjs`

The local bulk admin `catalog-bot@musik.local` was created in Supabase Auth
and added to `public.admin_emails`. Its password is only in `.env.local`.

Checks: final database counts and the admin Songs page both show 2,100 rows
with 350 per generation; `npm run typecheck` and `npm run lint` pass.

Open items:

- Review the four missing YouTube links and the 723 lyrics gaps in the admin
  "Missing YouTube"/"Missing lyrics" filters.
- Apply `20250104000000_song_browse_indexes.sql` before the catalog grows
  further.

## 2026-10-19 catalog expansion and popularity

Completed:

- Expanded the catalog to 5,000 songs. Per-generation totals: pre-1975 833,
  Gen X 833, Millennial 834, 9x bridge 833, Gen Z 834, Diaspora 833.
- Added `public.song_popularity` for detailed metrics and denormalized
  `catalog_songs.popularity_score` for list sorting.
- Scored 4,968 songs from YouTube statistics. Tiers: Viral 178, Popular 1,059,
  Established 1,893, Niche 1,813, Deep cut 25.
- Popularity score combines views, views per day, engagement
  (likes + comments / views), channel subscribers, and upload recency into a
  0-100 summary. The admin table shows the score, tier, and a hover breakdown.
- Added "Most popular" and "Least popular" sorting.
- Corrected pre-1975 years so the bucket now spans 1944-1975.
- Current coverage: YouTube 4,968/5,000, lyrics 3,199/5,000, analysis
  5,000/5,000, popularity 4,968/5,000.
- Classification has 12 rows marked `needs_review`. Quadrants: Q3 sad 2,603,
  Q1 happy 1,324, Q4 relaxed 757, Q2 angry 316.

Scripts added:

- `scripts/popularity.mjs`
- `scripts/add-2900.mjs`
- `scripts/fix-pre1975-years.mjs`

Migration: `20250105000000_song_popularity.sql`.

Open items:

- 32 songs still lack YouTube links; 1,801 lack lyrics. Both are visible in
  the admin filters.
- The score is a YouTube-based proxy, not a chart-rank measure. Re-run
  `scripts/popularity.mjs` after future enrichment to refresh it.

## Local-first workflow

- Current work branch: `codex/catalog-enrichment`. Do not push or merge until
  the local change is reviewed. Vercel auto-deploys every push to `main`.
- `.env.local` connects the local site to the hosted Supabase project.
- The login page now supports email/password sign-in as well as OAuth.
- Local Google login needs `http://localhost:3000/auth/callback` in Supabase
  Authentication -> URL Configuration -> Redirect URLs.
- For password login, use an existing confirmed Supabase Auth user with a
  password, or create one in Authentication -> Users. Its email must also be
  present in `public.admin_emails` for `/admin` access.
- A local admin account (`local-admin@example.com`) exists in Supabase and is
  on the admin allowlist. The password is intentionally not stored in Git.

## 2026-10-19 album design studio

Completed:

- Added `/albums/design`, a bilingual album studio for the public catalog.
- Added generation, emotion, era, energy, length, hit-to-discovery balance,
  artist-variety, album-title, and four mood-preset controls.
- Added a server-side curation engine that fills every requested album, even
  when filters are too narrow. It progressively widens the constraints and
  marks affected tracks in the result.
- The selector balances known favorites and discoveries, rotates across
  selected generations, limits repeated artists, and sequences tracks as an
  opener, build, centerpiece, release, and finale.
- Added album cover mosaics from actual YouTube thumbnails, inline playback
  through the existing global player, reshuffle, and save.
- Added `/albums/[id]` for saved albums and "Album design" navigation.
- Promoted the app navigation to three primary pages: Dashboard, Album
  creation, and Admin. Admin is now part of the desktop and mobile nav for
  allowlisted users.
- Added a compact Album creation entry point at the top of the dashboard.
- Kept controls and page links in the collapsed menu below the wide desktop
  breakpoint to prevent header wrapping on tablets.
- Kept Album creation and the dashboard entry point available in Work mode.
  Work mode calls it "Collection builder" and uses collection-oriented
  dashboard copy instead of music terminology.
- Added a classic workspace favicon and switch it dynamically with the active
  music/work mode, including the initial pre-hydration load.
- Replaced Next's automatic icon convention with a single managed favicon
  link. The old setup left both the music and workspace icons in the document,
  allowing the browser to keep showing the music icon in Work mode.
- Saving an album now also creates a playlist with the same name, adds each
  catalog recording to the user's library when missing, and preserves the
  album order in `playlist_songs`.
- Added `albums.playlist_id` and a one-time migration/backfill so albums saved
  before this fix appear in the Dashboard playlist panel immediately.
- Album saves refresh the shared client data before returning to the Dashboard,
  so the new playlist appears without a manual page reload.
- Work mode now keeps the complete player transport: previous, play/pause,
  next, and close. The main control uses the standard transport icon instead
  of the work-mode settings glyph.
- Applied `20250106000000_user_albums.sql` to the hosted Supabase project.
  Albums and album tracks are user-owned and separate from personal playlists.

Checks:

- `npm run typecheck` and `npm run lint` pass.
- Manual browser checks passed for the Vietnamese studio, preset generation,
  narrow-filter fallback warnings, playback, save, saved-album reload, and
  desktop/mobile layout.

Open items:

- Add album deletion or renaming if the collection grows beyond the current
  five-item recent list.
- Consider a user-selectable priority when era and mood filters conflict
  (currently era is preserved before mood during the final fallback stage).

## 2026-10-19 Facebook login

Completed:

- Created the Meta app `Musik Login` (App ID `4560709130839879`).
- Added the Facebook Login use case with `public_profile` and `email`.
- Added the Supabase callback
  `https://itdiekttnkqpmihcsqmz.supabase.co/auth/v1/callback` to Valid OAuth
  Redirect URIs and set the production domain `musik-two-wine.vercel.app`.
- Enabled Facebook in Supabase with the app credentials. The App Secret is
  stored only in Supabase and is not recorded in this repository.
- Added public `/privacy` and data-deletion instructions, linked from the login
  page, and made the route public in middleware.
- Added the Meta app icon at `public/musik-app-icon.jpg`.
- Verified the complete live OAuth flow from `/login` through Facebook consent
  and back to `/dashboard`.

Remaining publication gate:

- Meta's Publish action is disabled until business/identity verification is
  completed. Until then, Facebook login works for the app owner, admins, and
  configured test users, but not for arbitrary public accounts.

## 2026-10-19 email registration

Completed:

- Removed Facebook from the login page's OAuth provider list and removed its
  now-unused icon. Google remains available; the Supabase Facebook provider
  configuration was not changed.
- Expanded email/password sign-in with a create-account mode, password
  confirmation, and an eight-character minimum for new passwords.
- New registrations send confirmation links through the existing auth
  callback when Supabase email confirmation is enabled; the page explains
  that the user should check their email.
- Added English and Vietnamese labels for sign-in, registration, validation,
  and confirmation states. Updated privacy text to match the login methods.

Checks: `npm run typecheck`, `npm run lint`, and `npm run build` pass.

Open items:

- Confirm Supabase's Auth URL allowlist includes the production and local
  `/auth/callback` URLs for email confirmation links.
- Confirm production email delivery is configured if new public signups should
  receive Supabase confirmation emails.
- This change is local only; no commit or deployment has been made.

## 2026-10-20 Dashboard scroll and player sizing

- Removed sticky positioning from the Dashboard playlist panel so the right
  column scrolls naturally with the document and its bottom remains reachable.
- Reduced the fixed player bar's video preview and transport controls to make
  the bar substantially shorter while preserving previous, play/pause, next,
  and close actions.
- Verified with `npm run typecheck`, `npm run lint`, `npm run build`, and
  `git diff --check`.
- Local dev server remains available at `http://localhost:3000`. Playwright's
  independent browser session is unauthenticated and redirects to `/login`.
- Running `next build` while `next dev` shared the `.next` directory left the
  login page temporarily unstyled; restarting `next dev` regenerated its
  assets and restored the page. Avoid building while the dev server is active.
- Reserved a consistent `16rem` bottom cushion (`18rem` at the `sm` breakpoint)
  on every app page so expanded playlist content can scroll fully above the
  fixed player. Kept top and bottom padding utilities separate to avoid
  Tailwind `py-*` overriding the larger bottom spacing.
- Verified the Dashboard's expanded playlist and bottom cushion in the open
  browser. `npm run typecheck` and `npm run lint` pass; skipped another build
  while the dev server is active.
- Dashboard changes were pushed to `origin/main` in commit `51f792d` for
  publication. Deployment status was not checked.

## 2026-10-20 Collection builder UX

- Replaced the builder's six per-generation count queries with the existing
  catalog summary data, reducing initial server-side database roundtrips.
- Added an immediate loading skeleton for the collection builder and route
  transition feedback/prefetching in the app navigation.
- Added a clickable valence/arousal emotion map with quadrant colors, accessible
  emotion names, intensity tuning, and intensity-aware song selection.
- Replaced year entry with a dual-handle range selector, decade shortcuts, and
  an all-years option that keeps unknown-year songs eligible.
- Renamed the user-facing page to Collection builder / Tạo bộ sưu tập and
  updated the Dashboard entry point and page metadata.
- Verified emotion selection/intensity, decade selection, and a generated
  collection in the local browser. Lint, typecheck, production build, and
  `git diff --check` pass.
- The local dev server was stopped for the production build; restart it with
  `npm run dev -- -p 3000` before local browser testing.
- Changes are being published to `origin/main`; confirm the resulting commit
  hash and deployment status after push.

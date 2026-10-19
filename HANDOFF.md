# Restart notes

Current goal: catalog enrichment and bilingual admin UI, kept local until
reviewed.

Completed:

- Added `.env.local` for local development using the hosted Supabase project.
- Added row selection and chunked re-classification to `/admin/songs`.
- Extended `/api/admin/classify/batch` to accept explicit `songIds`.
- Added YouTube, transient lyrics-preview, and last-analyzed columns to the
  admin Songs table. Lyrics previews are fetched on demand from LRCLIB.
- Added an editor for YouTube URLs and full lyrics, plus batch auto-fill.
- Added tkaraoke and lyrics.vn lyrics providers and a YouTube match scorer.
- Added EN/VI language switching across the app and admin pages.
- Applied `20250103000000_catalog_enrichment.sql` to the hosted Supabase
  project. It adds YouTube and lyrics columns to `catalog_songs`.

Checks: `npm run typecheck`, `npm run lint`, and `npm run build` pass.
Live check: reclassified "Tình Thôi Xót Xa" from `/admin/songs`; the row
refreshed and the run log reported `lrclib` as the lyrics source.

Catalog note: the YouTube column uses `catalog_songs.youtube_url` when set,
otherwise a YouTube search for the title and artist.

Next step: add `YOUTUBE_API_KEY` and `CLASSIFIER_API_KEY` to `.env.local` for
local automatic YouTube search and classification. Continue with the review
UI in Step 4.

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

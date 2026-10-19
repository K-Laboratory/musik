# Restart notes

Current goal: re-classify selected songs from the admin Songs page.

Completed:

- Added `.env.local` for local development using the hosted Supabase project.
- Added row selection and chunked re-classification to `/admin/songs`.
- Extended `/api/admin/classify/batch` to accept explicit `songIds`.
- Added YouTube, transient lyrics-preview, and last-analyzed columns to the
  admin Songs table. Lyrics previews are fetched on demand from LRCLIB.

Checks: `npm run typecheck`, `npm run lint`, and `npm run build` pass.
Live check: reclassified "Tình Thôi Xót Xa" from `/admin/songs`; the row
refreshed and the run log reported `lrclib` as the lyrics source.

Catalog note: `catalog_songs` has no YouTube id column. The table uses a
direct link when `source_url`/`source_id` identifies a video, otherwise a
YouTube search for the title and artist.

Next step: fill `CLASSIFIER_API_KEY` in `.env.local` to run the classifier
locally. Continue with the review UI in Step 4.

## Local-first workflow

- Current work branch: `codex/local-admin-login`. Do not push or merge until
  the local change is reviewed. Vercel auto-deploys every push to `main`.
- `.env.local` connects the local site to the hosted Supabase project.
- The login page now supports email/password sign-in as well as OAuth.
- Local Google login needs `http://localhost:3000/auth/callback` in Supabase
  Authentication -> URL Configuration -> Redirect URLs.
- For password login, use an existing confirmed Supabase Auth user with a
  password, or create one in Authentication -> Users. Its email must also be
  present in `public.admin_emails` for `/admin` access.

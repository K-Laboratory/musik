# Restart notes

Current goal: re-classify selected songs from the admin Songs page.

Completed:

- Added `.env.local` for local development using the hosted Supabase project.
- Added row selection and chunked re-classification to `/admin/songs`.
- Extended `/api/admin/classify/batch` to accept explicit `songIds`.
- Added YouTube, transient lyrics-preview, and last-analyzed columns to the
  admin Songs table. Lyrics previews are fetched on demand and never stored.

Checks: `npm run typecheck`, `npm run lint`, and `npm run build` pass.
Live check: reclassified "Tình Thôi Xót Xa" from `/admin/songs`; the row
refreshed and the run log reported `lrclib` as the lyrics source.

Catalog note: `catalog_songs` has no YouTube id column. The table uses a
direct link when `source_url`/`source_id` identifies a video, otherwise a
YouTube search for the title and artist.

Next step: fill `CLASSIFIER_API_KEY` in `.env.local` to run the classifier
locally. Continue with the review UI in Step 4.

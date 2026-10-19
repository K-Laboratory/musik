# Restart notes

Current goal: re-classify selected songs from the admin Songs page.

Completed:

- Added `.env.local` for local development using the hosted Supabase project.
- Added row selection and chunked re-classification to `/admin/songs`.
- Extended `/api/admin/classify/batch` to accept explicit `songIds`.

Checks: `npm run typecheck`, `npm run lint`, and `npm run build` pass.
Live check: reclassified "Tình Thôi Xót Xa" from `/admin/songs`; the row
refreshed and the run log reported `lrclib` as the lyrics source.

Next step: fill `CLASSIFIER_API_KEY` in `.env.local` to run the classifier
locally. Continue with the review UI in Step 4.

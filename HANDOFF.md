# Restart notes

Current goal: re-classify selected songs from the admin Songs page.

Completed:

- Added `.env.local` for local development using the hosted Supabase project.
- Added row selection and chunked re-classification to `/admin/songs`.
- Extended `/api/admin/classify/batch` to accept explicit `songIds`.

Checks: `npm run typecheck`, `npm run lint`, and `npm run build` pass.

Next step: fill `CLASSIFIER_API_KEY` in `.env.local` to run the classifier
locally, then deploy and verify the re-classification flow on Vercel.

# 🎵 Favorite Songs

A small web app to **search YouTube, save the songs you love, and organise them
into playlists** that you can play right inside the app.

- Sign in with **Google** or **Facebook**
- Search YouTube for music videos and save them to your personal library
- Create playlists, drag songs into them, and reorder with drag & drop
- Play any saved song in an embedded YouTube player
- Works on desktop and mobile

Everything runs on **free tiers**: Next.js on Vercel + Supabase (Postgres &
Auth) + the YouTube Data API. You do **not** need to own a server.

---

## Table of contents

1. [What you'll need](#1-what-youll-need)
2. [Project structure](#2-project-structure)
3. [Step-by-step setup](#3-step-by-step-setup)
   - [3.1 Create a Supabase project](#31-create-a-supabase-project)
   - [3.2 Run the database migration](#32-run-the-database-migration)
   - [3.3 Enable Google login](#33-enable-google-login)
   - [3.4 Enable Facebook login](#34-enable-facebook-login)
   - [3.5 Get a YouTube Data API key](#35-get-a-youtube-data-api-key)
   - [3.6 Add environment variables locally](#36-add-environment-variables-locally)
   - [3.7 Run the app locally](#37-run-the-app-locally)
4. [Deploy to Vercel](#4-deploy-to-vercel)
5. [Environment variables reference](#5-environment-variables-reference)
6. [How it works](#6-how-it-works)
7. [Adding another login provider](#7-adding-another-login-provider-easily)
8. [Troubleshooting](#8-troubleshooting)
9. [Security notes](#9-security-notes)

---

## 1. What you'll need

| Thing | Cost | Why |
| --- | --- | --- |
| [Supabase](https://supabase.com) account | Free | Database + login |
| [Google Cloud](https://console.cloud.google.com) account | Free | Google login + YouTube search |
| [Facebook Developers](https://developers.facebook.com) account | Free | Facebook login |
| [Vercel](https://vercel.com) account | Free | Hosting |
| [Node.js](https://nodejs.org) 18.18+ | Free | Running the app locally |

You'll create two separate things in Google Cloud: an **OAuth client** (for
"Sign in with Google") and an **API key** (for searching YouTube). They are
different, and you need both.

---

## 2. Project structure

```
.
├── middleware.ts                     # Protects routes, refreshes the login session
├── supabase/
│   └── migrations/
│       └── 20250101000000_init.sql   # Tables + Row Level Security (paste into Supabase)
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root HTML layout
│   │   ├── page.tsx                  # "/" → redirects to the dashboard
│   │   ├── login/page.tsx            # Login screen
│   │   ├── auth/
│   │   │   ├── callback/route.ts     # OAuth callback (finishes sign-in)
│   │   │   └── signout/route.ts      # Logout
│   │   ├── api/youtube/search/route.ts # Server-side YouTube search (keeps the API key secret)
│   │   └── (app)/                    # Everything in here requires a login
│   │       ├── layout.tsx            # Auth guard + shared app shell
│   │       ├── dashboard/page.tsx    # Search + library + playlists
│   │       └── playlists/[id]/page.tsx # One playlist + player + reordering
│   ├── components/                   # React components (cards, search, panels…)
│   └── lib/
│       ├── supabase/                 # Supabase clients (browser, server, middleware)
│       ├── database.types.ts         # TypeScript types for the database
│       ├── oauth.ts                  # ⭐ List of login providers
│       ├── youtube.ts                # YouTube API helper (server only)
│       └── ...
└── .env.local.example                # Copy to .env.local and fill in
```

---

## 3. Step-by-step setup

### 3.1 Create a Supabase project

1. Go to <https://supabase.com> and sign in (GitHub or email is fine).
2. Click **New project**.
3. Give it a name (e.g. `favorite-songs`), choose a **database password** (save
   it somewhere), and pick the region closest to you.
4. Wait ~1 minute for the project to finish starting.
5. In the left sidebar open **Project Settings → API**. You will need:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> The **anon** key is safe to put in a website's front end. The **service_role**
> key is *not* — never use or expose that one here.

### 3.2 Run the database migration

1. In your Supabase project, open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file [`supabase/migrations/20250101000000_init.sql`](supabase/migrations/20250101000000_init.sql),
   copy **all** of it, and paste it into the editor.
4. Click **Run** (or press `Ctrl/Cmd + Enter`). You should see "Success".
5. (Optional check) Open **Table Editor** — you should now see four tables:
   `profiles`, `playlists`, `songs`, `playlist_songs`.

This script creates the tables, the indexes that prevent duplicates, a trigger
that creates a profile row the first time someone signs in, and **Row Level
Security (RLS) policies** so each user can only ever see their own data.

### 3.3 Enable Google login

**Part A — create OAuth credentials in Google Cloud**

1. Go to <https://console.cloud.google.com> and create a new project
   (e.g. `favorite-songs`).
2. In the search bar, look for **APIs & Services → OAuth consent screen**.
   - Choose **External**, fill in the app name and your email, then **Save and
     continue** through the steps.
   - On the **Test users** step, add your own Google email address while the app
     is in "Testing" mode.
3. Now go to **APIs & Services → Credentials**.
4. Click **Create credentials → OAuth client ID**.
   - Application type: **Web application**
   - Under **Authorized redirect URIs**, click **Add URI** and paste your
     Supabase callback URL (see below).
5. Click **Create**, then copy the **Client ID** and **Client secret**.

**Your Supabase callback URL** is:

```
https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
```

You can find the exact value in Supabase: **Authentication → Providers → Google**
(it is shown as "Callback URL"). `<YOUR-PROJECT-REF>` is the short code in your
project URL.

**Part B — switch on Google in Supabase**

1. In Supabase go to **Authentication → Providers → Google**.
2. Toggle **Enable Sign in with Google** on.
3. Paste the **Client ID** and **Client secret** from Google.
4. Click **Save**.

### 3.4 Enable Facebook login

**Part A — create a Facebook app**

1. Go to <https://developers.facebook.com/apps> and click **Create App**.
2. Choose **Consumer** (or "Authenticate and request data from users"), give it
   a name, and create it.
3. On the app dashboard, find the **Facebook Login** product and click **Set
   up**. Choose **Web**.
4. In **Facebook Login → Settings**, add your Supabase callback URL to
   **Valid OAuth Redirect URIs**:
   ```
   https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
   ```
5. Also fill in the **App Domains** (e.g. `your-app.vercel.app`).
6. Go to **Settings → Basic** and copy the **App ID** and **App secret**.

> Facebook requires an **HTTPS** URL for real users. `localhost` works while
> your Facebook app is in **Development mode**, which is enough for testing.

**Part B — switch on Facebook in Supabase**

1. In Supabase go to **Authentication → Providers → Facebook**.
2. Toggle **Enable Sign in with Facebook** on.
3. Paste the **App ID** (Client ID) and **App secret** (Client secret).
4. Click **Save**.

**Part C — allow your app's callback URLs**

In Supabase go to **Authentication → URL Configuration** and set:

- **Site URL**: `http://localhost:3000` for now (change to your Vercel URL
  after deploying).
- **Redirect URLs** (add all that apply):
  ```
  http://localhost:3000/auth/callback
  https://your-app-name.vercel.app/auth/callback
  ```

Without this, Supabase will refuse to redirect back to your app after login
with an "invalid redirect URL" error.

### 3.5 Get a YouTube Data API key

1. Stay in <https://console.cloud.google.com> (the same project you used above
   is fine).
2. Go to **APIs & Services → Library**.
3. Search for **YouTube Data API v3**, open it, and click **Enable**.
4. Go to **APIs & Services → Credentials → Create credentials → API key**.
5. Copy the key. Then click **Edit** on the key and, under **API restrictions**,
   choose **Restrict key → YouTube Data API v3**. Click **Save**.

This key is used **only on the server** (inside `src/app/api/youtube/search/route.ts`),
so it is never sent to the browser.

### 3.6 Add environment variables locally

1. In the project root, copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```
2. Open `.env.local` and fill in your three values:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon public key>
   YOUTUBE_API_KEY=<your YouTube Data API v3 key>
   ```

> `.env.local` is listed in `.gitignore` and will never be committed.

### 3.7 Run the app locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You should be redirected to `/login`. Click
**Sign in with Google** (or Facebook), and after logging in you'll land on the
dashboard.

> **First run tip:** if the login buttons don't work, double-check that the
> Supabase callback URL is added to Google/Facebook and that
> `http://localhost:3000/auth/callback` is in Supabase's **Redirect URLs**.

---

## 4. Deploy to Vercel

1. Push this project to a new **GitHub** repository:
   ```bash
   git init
   git add .
   git commit -m "Favorite Songs"
   git branch -M main
   git remote add origin https://github.com/<you>/favorite-songs.git
   git push -u origin main
   ```
2. Go to <https://vercel.com/new> and **import** the repository. Vercel will
   detect Next.js automatically — you don't need to change any build settings.
3. Before clicking **Deploy**, open **Environment Variables** and add the same
   three variables from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `YOUTUBE_API_KEY`
4. Click **Deploy** and wait for the build to finish. You'll get a URL like
   `https://favorite-songs-xyz.vercel.app`.
5. Finally, tell Supabase and the OAuth providers about your live URL:
   - **Supabase → Authentication → URL Configuration**: set **Site URL** to your
     Vercel URL and add `https://<your-app>.vercel.app/auth/callback` to
     **Redirect URLs**.
   - **Google Cloud → Credentials → your OAuth client**: the redirect URI stays
     the Supabase callback URL, so nothing changes there.
   - **Facebook → Facebook Login → Settings**: add `https://<your-app>.vercel.app`
     to **App Domains** and complete the app so it can be used by the public.

That's it — no server or database to host yourself. 🎉

---

## 5. Environment variables reference

| Variable | Where it's used | Exposed to browser? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client (browser + server) | Yes (safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (browser + server) | Yes (safe, RLS protects data) |
| `YOUTUBE_API_KEY` | `src/app/api/youtube/search/route.ts` only | **No — server only** |

Set these in `.env.local` for local development and in
**Vercel → Project → Settings → Environment Variables** for production.

---

## 6. How it works

### Authentication

- `middleware.ts` runs on every request. It refreshes the Supabase session and
  **redirects anyone who isn't logged in to `/login`** (and logged-in users
  away from `/login`).
- The login buttons call `supabase.auth.signInWithOAuth(...)`. After the
  provider signs the user in, Supabase redirects to `/auth/callback`, where the
  code is exchanged for a session cookie.
- A database **trigger** (`handle_new_user`) creates a row in `profiles` the
  first time a user signs in. The callback route also upserts a profile as a
  safety net.

### Data model

| Table | Purpose |
| --- | --- |
| `profiles` | One row per user (`id` = the Supabase auth user id) |
| `playlists` | A user's playlists |
| `songs` | A user's global library of saved YouTube videos |
| `playlist_songs` | Which songs are in which playlist, plus their `position` |

Every table has **Row Level Security**. A user can only read or write rows that
belong to them (`auth.uid()`), and `playlist_songs` additionally checks that the
user owns both the playlist and the song.

Duplicates are impossible by design:

- `songs` has a unique index on `(user_id, youtube_video_id)`
- `playlist_songs` has a unique index on `(playlist_id, song_id)`

### Search & drag and drop

- The search box **debounces** your typing (400 ms) then calls
  [`/api/youtube/search`](src/app/api/youtube/search/route.ts). That route
  checks you're logged in and calls the YouTube Data API
  (`search.list`, `type=video`, `videoCategoryId=10` for Music) using the
  server-only API key.
- Saved songs are draggable cards ([dnd-kit](https://dndkit.com)); playlists are
  drop targets. Dropping a card on a playlist inserts a `playlist_songs` row.
- On a playlist page, songs are a **sortable list** — dragging a row updates the
  `position` column so your order is saved.

### Scripts

```bash
npm run dev        # start the dev server at http://localhost:3000
npm run build      # production build
npm run start      # run the production build
npm run lint       # ESLint
npm run typecheck  # TypeScript check
```

---

## 7. Adding another login provider (easily)

The login buttons are generated from a single list in
[`src/lib/oauth.ts`](src/lib/oauth.ts). To add GitHub, for example:

1. Enable GitHub in **Supabase → Authentication → Providers** and add the
   callback URL to your GitHub OAuth app.
2. Uncomment (or add) the entry in `src/lib/oauth.ts`:
   ```ts
   {
     id: "github",
     label: "GitHub",
     icon: "github",
     className: "bg-slate-800 text-white hover:bg-slate-700",
   },
   ```
3. If the provider returns avatars from a new domain **and** you decide to render
   them with `next/image`, add that domain to `images.remotePatterns` in
   `next.config.ts` (the header avatar uses a plain `<img>`, so this is optional).

The login page, the callback route and the profile trigger all work unchanged.

---

## 8. Troubleshooting

| Problem | Fix |
| --- | --- |
| "Almost there — configuration needed" screen | `.env.local` is missing values. Fill in all three variables and restart `npm run dev`. |
| Redirected back to `/login` right after signing in | Add `http://localhost:3000/auth/callback` (and your Vercel equivalent) to **Supabase → Authentication → URL Configuration → Redirect URLs**. |
| Google: `redirect_uri_mismatch` | The Authorized redirect URI in Google Cloud must be exactly `https://<project-ref>.supabase.co/auth/v1/callback`. |
| Facebook: "URL Blocked" | Add the Supabase callback URL under **Facebook Login → Settings → Valid OAuth Redirect URIs** and put your domain in **App Domains**. |
| YouTube search returns an error / 429 | Your API key is wrong, the YouTube Data API v3 isn't enabled, or you hit the daily quota (10,000 units/day on the free tier; each search uses ~101). |
| Songs or playlists don't show up | Re-run the migration. If you skipped RLS, the row insert will fail; if RLS is on but policies are missing, reads return nothing. |
| `new row violates row-level security policy` | You ran part of the migration only. Run the whole SQL file again — it is safe to re-run. |

---

## 9. Security notes

- **Row Level Security is enabled on every table.** Even if someone got your
  anon key (it's public by design), they could only ever touch their own rows.
- **The YouTube API key never reaches the browser.** It lives only in the
  server route, which also requires a logged-in user, so strangers can't burn
  your quota.
- **Secrets stay out of git.** `.env.local` is git-ignored; only
  `.env.local.example` (with empty values) is committed.
- **Open redirects are blocked** — the `next=` parameter after login is
  validated to be an internal path (see `src/lib/url.ts`).

---

Built with Next.js (App Router), TypeScript, Tailwind CSS, Supabase and dnd-kit.

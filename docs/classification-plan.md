# Music emotion classification — build plan

This documents the multi-step plan for building the emotion-classified music
database and its admin dashboard. **Each step stops for review before the
next.**

## Scope decisions (agreed)

| Decision | Choice |
|----------|--------|
| Taxonomy | Two-layer: valence–arousal + 20 categorical tags (see `emotion-taxonomy.md`) |
| Generations | Proposed 6 Vietnamese cohorts (see `generations-vietnam.md`) |
| Pilot size | **100 songs, one generation** (Millennials / 8x) |
| Catalog source | Curated seed list from research (`seed-catalog-millennial.md`) |
| Home | Pilot inside **this repo**; split out later |
| Lyrics | **Fetched transiently only. Never stored.** Only derived tags are persisted. |

## Why lyrics are not stored (important)

Storing full lyrics — even "for training" or "not for release" — is
reproduction plus the creation of a derivative work, which is the conduct at
issue in the major AI copyright suits. It also puts the operator (you) at risk
and violates lyrics sites' terms. Instead:

- The pipeline **fetches lyrics at analysis time and discards the text**.
- It stores only **facts about the song**: emotions, valence, arousal,
  confidence, model+version, and a short rationale.
- Re-analysis when the taxonomy changes = re-fetch by source URL and re-run.
  The pipeline is **idempotent and versioned**, so this is cheap.
- If you later license a lyrics corpus, a `lyrics_ref` slot exists and nothing
  else changes.

```
SONG CATALOG (safe)  →  [transient lyrics fetch]  →  ANALYSIS  →  EMOTION TAGS (safe)
```

## Proposed data model (Supabase)

```
generations(id, label_en, label_vi, birth_start, birth_end, formative_era)
emotions(id, name, definition, sounds_like, valence, arousal, quadrant)

songs(
  id, title, artist, year, generation_id,
  source, source_id, source_url,        -- e.g. musicbrainz / deezer
  created_at
)

song_emotions(
  song_id, emotion_id, confidence,      -- 0..1
  is_primary, rank,
  primary key (song_id, emotion_id)
)

song_analysis(
  song_id, valence, arousal, quadrant,
  model, taxonomy_version, rationale,   -- short, no lyric quotes
  analyzed_at,
  primary key (song_id, taxonomy_version)
)
```

Notes:
- `song_analysis` is keyed by taxonomy version so old + new classifications
  coexist during a re-analysis.
- A `needs_review` flag can live on `song_analysis` for low-confidence rows.
- RLS: admin-only writes; read access for the app.

## Step-by-step plan

- [x] **Step 1 — Research.** Emotion taxonomy (20 tags + V-A) and Vietnamese
      generations, with sources.
- [x] **Step 2a — Seed data.** 100-song millennial catalog + machine-readable
      taxonomy files.
- [ ] **Step 2b — Admin dashboard skeleton.** Schema + `/admin` routes to
      browse songs, taxonomy, and (later) classifications. *← next*
- [ ] **Step 3 — Classification pipeline.** A server job that: takes songs →
      transiently fetches lyrics → calls an LLM/embedding model → writes
      emotions/valence/arousal/confidence. Idempotent, rate-limited, resumable.
- [ ] **Step 4 — Review UI.** Low-confidence queue, manual correction, bulk
      re-classify when the taxonomy version changes.
- [ ] **Step 5 — Scale.** Grow to ~1000 songs × N generations; add a licensed
      audio-feature source (tempo/energy/key) to complement text analysis.

## Open questions for later steps

- Which LLM/embedding provider for Step 3, and the cost per 100/1000 songs?
- Do we want audio features (Deezer/Spotify) as a second signal or as the
  primary signal?
- Admin auth: reuse the existing Supabase users, or a separate admin role?

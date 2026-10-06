# Music Emotion Taxonomy

This is the shared taxonomy for classifying songs by emotional state. It is
grounded in established research and is intentionally a **two-layer** model:

1. **Dimensional layer (primary, always stored):** each song gets coordinates
   on the **valence–arousal (V-A)** plane. Valence = pleasantness
   (negative ↔ positive); arousal = activation (calm ↔ energetic). This is the
   dominant approach in Music Information Retrieval (Reg. Russell's circumplex
   model) because it is continuous, language-neutral, and generalizes across
   genre/culture.
2. **Categorical layer (display/retrieval):** each song gets one or more of the
   20 tags below, each of which maps to a representative V-A point.

## Where the 20 categories come from

- Russell's circumplex / four quadrants (happy, sad, angry, relaxed) — the
  culturally-robust MIR core.
- Geneva Emotional Music Scale (GEMS; Zentner et al. 2008) — the only
  music-specific instrument; adds **aesthetic** emotions the quadrants miss
  (nostalgia, tenderness, wonder/awe, peacefulness, transcendence).
- Cowen et al. 2020 (PNAS) — **13 cross-culturally replicated** music-evoked
  emotions (adds dreaminess, eroticism, triumph, defiance, etc.).
- MIREX Audio Mood Classification clusters — for the "aggressive/tense" family.

## Reliability caveats (design for these)

- Inter-rater agreement for emotion tags is only moderate (κ ≈ 0.20–0.40).
  Therefore every tag carries a **confidence** score (0..1) and songs can be
  flagged for human review.
- **Valence is harder than arousal** for models (arousal r≈0.81, valence
  r≈0.67). The UI should let humans correct valence more readily.
- Distinguish **perceived** emotion ("sounds sad") from **induced** emotion
  ("makes me feel calm"). We default to **perceived**.
- Disagreement concentrates between neighbouring labels, so keep the label set
  coarse enough (≈16–20) and well-separated in V-A space.

## The 20 categories

V and A are on a −2..+2 scale (−2 = most negative / calm).

| id | name | definition | sounds_like | v | a |
|----|------|------------|-------------|---|---|
| joyful | Joyful / Happy | Bright, buoyant pleasure and good cheer | Upbeat major-key pop, fast tempo | 2.0 | 2.0 |
| euphoric | Euphoric / Pumped-up | Peak elation and high-intensity exhilaration | Festival EDM drop, stadium anthem | 2.0 | 2.0 |
| triumphant | Triumphant / Heroic | Victorious, soaring, confident grandeur | Cinematic brass fanfare, orchestral finale | 2.0 | 1.5 |
| erotic | Erotic / Sensual | Slow, seductive, physically intimate desire | Slow R&B groove, breathy vocals | 1.5 | 0.0 |
| tender | Tender / Affectionate | Warm, gentle fondness and care | Soft acoustic ballad, lullaby | 2.0 | -1.0 |
| nostalgic | Nostalgic / Sentimental | Bittersweet longing for the past | Vintage torch song, old standard | 1.0 | -0.5 |
| dreamy | Dreamy / Ethereal | Hazy, floating, weightless reverie | Ambient, shoegaze, reverb-washed pads | 1.0 | -1.5 |
| serene | Serene / Peaceful | Calm, still, untroubled contentment | New-age piano, slow drone | 1.5 | -2.0 |
| relaxed | Relaxed / Mellow | Easygoing, low-tension groove | Chill lo-fi hip-hop, bossa nova | 1.5 | -1.0 |
| awe | Awe / Wonder | Vast, sublime, self-transcending amazement | Choral crescendo, epic post-rock | 1.5 | 0.5 |
| funky | Funky / Groovy | Playful, danceable, body-moving good humour | Funk, disco, upbeat soul | 1.5 | 1.5 |
| humorous | Humorous / Quirky | Silly, whimsical, comedic playfulness | Cartoon music, novelty song | 1.0 | 1.0 |
| bittersweet | Bittersweet / Wistful | Simultaneous poignancy and beauty, gentle sorrow | Minor-key folk with warm harmony | -0.5 | -0.5 |
| sad | Sad / Melancholic | Grief, sorrow, and low spirits | Slow minor-key piano, blues | -2.0 | -1.5 |
| brooding | Brooding / Reflective | Dark, introspective, heavy rumination | Slow post-punk, moody trip-hop | -1.0 | -1.0 |
| tense | Tense / Anxious | Uneasy, agitated foreboding | Dissonant strings, ticking percussion | -1.5 | 1.0 |
| angry | Angry / Aggressive | Hostile, forceful, confrontational fury | Distorted metal, hardcore punk | -2.0 | 2.0 |
| fearful | Fearful / Scary | Threat, dread, and fright | Horror-film stingers, discordant clusters | -2.0 | 1.5 |
| defiant | Defiant / Rebellious | Bold, anti-authority, resistant energy | Protest rock, punk chant | -0.5 | 2.0 |
| neutral | Neutral / Ambient | Emotionally flat, functional background sound | Muzak, minimal tone bed | 0.0 | 0.0 |

## Coarse reduction

The 20 tags collapse losslessly to the four Russell quadrants:

- **Q1 happy-ish:** joyful, euphoric, triumphant, funky
- **Q2 angry-ish:** tense, angry, fearful, defiant
- **Q3 sad-ish:** bittersweet, sad, brooding, neutral
- **Q4 relaxed-ish:** erotic, tender, nostalgic, dreamy, serene, relaxed, awe

## Generation labels (Vietnam)

| id | label_en | label_vi | birth_years | formative_era |
|----|----------|----------|-------------|----------------|
| pre1975 | Pre-1975 (Saigon golden age) | thế hệ trước 1975 | 1930–1959 | Nhạc vàng, bolero, tiền chiến, Saigon rock |
| genx | Gen X | thế hệ 7x | 1965–1979 | Bao cấp → Đổi Mới; nhạc đỏ (N), nhạc vàng (S), nhạc nhẹ |
| millennial | Millennials | thế hệ 8x | 1980–1989 | Late-90s–2000s nhạc trẻ boom; nhạc Hoa lời Việt |
| gen9x | 9x bridge | thế hệ 9x | 1990–1999 | Yahoo era → 2010s V-pop; teen pop, early hip-hop |
| genz | Gen Z | thế hệ 10x (2K) | 2000–2012 | Streaming/TikTok, indie wave, Rap Việt |
| diaspora | Diaspora | Việt Kiều | overlaps | Pre-1975 repertoire preserved abroad; Paris By Night |

See `generations-vietnam.md` for the full research and sources.

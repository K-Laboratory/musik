import "server-only";

import type { CatalogSong, Emotion } from "@/lib/types";

/**
 * Transient lyrics fetcher.
 *
 * IMPORTANT: the text returned here is used ONLY to build the model prompt and
 * is never persisted. The pipeline stores the derived classification, not the
 * lyrics. See docs/classification-plan.md.
 *
 * Configure with LRCLIB or a licensed provider via env vars. If neither is
 * set, fetchLyrics returns null and the pipeline classifies from metadata
 * alone (title/artist/year) - still useful, just coarser.
 */

export interface LyricsResult {
  text: string;
  provider: string;
  url: string | null;
}

const REQUEST_TIMEOUT_MS = 8000;

interface LyricsProvider {
  name: string;
  run(song: CatalogSong): Promise<LyricsResult | null>;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when two titles/artists are similar enough to trust. */
function looselyMatches(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function stripTimestamps(synced: string | null | undefined): string | null {
  if (!synced) return null;
  const lines = synced
    .split("\n")
    .map((line) =>
      line.replace(/^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]\s*/, "").trim(),
    )
    .filter(Boolean);
  return lines.length ? lines.join("\n") : null;
}

async function jsonFetch<T>(
  url: string,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = process.env.LYRICS_API_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * LRCLIB exact lookup, then fuzzy search across its catalog. The exact `/get`
 * endpoint misses a lot for non-Western tracks; `/search` is far more
 * forgiving and we verify with a loose title/artist match.
 */
const lrclib: LyricsProvider = {
  name: "lrclib",
  async run(song) {
    const base = process.env.LYRICS_API_BASE ?? "https://lrclib.net/api";

    const exactUrl = `${base}/get?${new URLSearchParams({
      track_name: song.title,
      artist_name: song.artist,
    }).toString()}`;
    const exact = await jsonFetch<{ plainLyrics?: string; syncedLyrics?: string }>(
      exactUrl,
    );
    if (exact) {
      const text = exact.plainLyrics ?? stripTimestamps(exact.syncedLyrics);
      if (text && text.trim().length >= 40) {
        return { text, provider: "lrclib", url: exactUrl };
      }
    }

    // Fuzzy search: try "title artist", then just the title.
    for (const query of [`${song.title} ${song.artist}`, song.title]) {
      const searchUrl = `${base}/search?q=${encodeURIComponent(query)}`;
      const results = await jsonFetch<
        {
          trackName?: string;
          artistName?: string;
          plainLyrics?: string;
          syncedLyrics?: string;
        }[]
      >(searchUrl);
      if (!Array.isArray(results)) continue;

      const hit = results.find((r) => {
        const text = r.plainLyrics ?? stripTimestamps(r.syncedLyrics);
        if (!text || text.trim().length < 40) return false;
        return (
          looselyMatches(r.trackName ?? "", song.title) &&
          (looselyMatches(r.artistName ?? "", song.artist) || query === song.title)
        );
      });
      if (hit) {
        const text = hit.plainLyrics ?? stripTimestamps(hit.syncedLyrics);
        if (text && text.trim().length >= 40) {
          return { text, provider: "lrclib:search", url: searchUrl };
        }
      }
    }

    return null;
  },
};

/**
 * Transient web-search fallback. Uses Tavily (or any search API that accepts
 * a Bearer token) to find a lyrics page, then extracts a compact text body.
 * The text is used ONLY for the prompt and is never stored.
 */
const webSearch: LyricsProvider = {
  name: "websearch",
  async run(song) {
    const key = process.env.SEARCH_API_KEY;
    if (!key) return null;

    const base = process.env.SEARCH_API_BASE ?? "https://api.tavily.com/search";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(base, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          query: `${song.title} ${song.artist} lyrics lời bài hát`,
          search_depth: "basic",
          max_results: 3,
          include_answer: false,
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        results?: { content?: string; url?: string; title?: string }[];
      };
      const best = (payload.results ?? [])
        .map((r) => r.content ?? "")
        .sort((a, b) => b.length - a.length)[0];
      if (!best || best.trim().length < 80) return null;
      return { text: best, provider: "websearch", url: payload.results?.[0]?.url ?? null };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  },
};

const PROVIDERS: LyricsProvider[] = [lrclib, webSearch];

/**
 * Returns lyrics text for analysis, or null when unavailable/unconfigured.
 * Never throws. Tries providers in order until one yields usable text.
 */
export async function fetchLyrics(
  song: CatalogSong,
): Promise<LyricsResult | null> {
  if (process.env.LYRICS_PROVIDER === "none") return null;

  for (const provider of PROVIDERS) {
    const result = await provider.run(song).catch(() => null);
    if (result && result.text.trim().length >= 40) return result;
  }
  return null;
}

/** A compact, non-copyrighted preview for storing in the rationale field. */
export function lyricsFingerprint(text: string): string {
  // We deliberately do NOT slice lyric text into the DB. This only reports a
  // stable length so reviewers can tell whether lyrics were available.
  return `${text.trim().length} chars`;
}

/** Builds the model prompt from taxonomy + metadata (+ lyrics, transiently). */
export function buildPrompt(
  song: Pick<CatalogSong, "title" | "artist" | "year">,
  emotions: Emotion[],
  lyrics: string | null,
): { system: string; user: string } {
  const taxonomy = emotions
    .map(
      (e) =>
        `- ${e.id}: ${e.name} (valence ${e.valence}, arousal ${e.arousal}) - ${e.sounds_like ?? ""}`,
    )
    .join("\n");

  const system = [
    "You are a music emotion analyst. You classify songs on two layers:",
    "1) valence (pleasantness, -2..2) and arousal (energy, -2..2);",
    "2) one or more category ids from the fixed taxonomy below.",
    "",
    "Taxonomy (use ONLY these ids):",
    taxonomy,
    "",
    "Rules:",
    "- Output strictly valid JSON, no prose outside it.",
    "- Pick 1-3 category ids, ordered most to least dominant.",
    "- confidence is 0..1 per category. Be honest: emotion tagging has a low",
    "  reliability ceiling, so use values like 0.5-0.85, not 1.0.",
    "- rationale: ONE short sentence (< 25 words). Never quote or reproduce",
    "  lyrics - describe the mood only.",
    "",
    "When lyrics are not provided, use your own knowledge of the SONG (its",
    "title, artist, era and cultural context) to judge its emotional content.",
    "Many of these are well-known Vietnamese songs. Only fall back to a generic",
    "guess if you genuinely do not recognise the song, and lower confidence in",
    "that case.",
    "",
    'Schema: {"valence":number,"arousal":number,"categories":[{"id":string,"confidence":number}],"rationale":string}',
  ].join("\n");

  const user = [
    `Title: ${song.title}`,
    `Artist: ${song.artist}`,
    song.year ? `Year: ${song.year}` : "Year: unknown",
    lyrics
      ? "Reference lyrics text (transient; do NOT quote it back):\n" +
        lyrics.slice(0, 8000)
      : "No lyrics text supplied. Classify using your own knowledge of this song.",
  ].join("\n");

  return { system, user };
}

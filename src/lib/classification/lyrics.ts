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

/** LRCLIB returns synced/plain lyrics for a title+artist lookup. */
async function fetchFromLrclib(song: CatalogSong): Promise<LyricsResult | null> {
  const base = process.env.LYRICS_API_BASE ?? "https://lrclib.net/api";
  const params = new URLSearchParams({
    track_name: song.title,
    artist_name: song.artist,
  });
  const url = `${base}/get?${params.toString()}`;

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

    const payload = (await response.json()) as {
      plainLyrics?: string | null;
      syncedLyrics?: string | null;
    };
    const text = payload.plainLyrics ?? stripTimestamps(payload.syncedLyrics);
    if (!text || text.trim().length < 40) return null;
    return { text, provider: "lrclib", url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function stripTimestamps(synced: string | null | undefined): string | null {
  if (!synced) return null;
  const lines = synced
    .split("\n")
    .map((line) => line.replace(/^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]\s*/, "").trim())
    .filter(Boolean);
  return lines.length ? lines.join("\n") : null;
}

/**
 * Returns lyrics text for analysis, or null when unavailable/unconfigured.
 * Never throws.
 */
export async function fetchLyrics(
  song: CatalogSong,
): Promise<LyricsResult | null> {
  if (process.env.LYRICS_PROVIDER === "none") return null;
  return fetchFromLrclib(song);
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
    "  reliability ceiling, so use values like 0.5-0.8, not 1.0.",
    "- rationale: ONE short sentence (< 25 words). Never quote lyrics.",
    "- If lyrics are missing, classify from title/artist/year/era and lower",
    "  confidence accordingly.",
    "",
    'Schema: {"valence":number,"arousal":number,"categories":[{"id":string,"confidence":number}],"rationale":string}',
  ].join("\n");

  const user = [
    `Title: ${song.title}`,
    `Artist: ${song.artist}`,
    song.year ? `Year: ${song.year}` : "Year: unknown",
    lyrics
      ? "Lyrics (transient, do not quote):\n" + lyrics.slice(0, 8000)
      : "Lyrics: unavailable - classify from metadata only.",
  ].join("\n");

  return { system, user };
}

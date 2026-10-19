import { appendFile, mkdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  classifySong,
  classifierModel,
  quadrantFor,
} from "../src/lib/classification/classify";
import { buildPrompt, fetchLyrics } from "../src/lib/classification/lyrics";
import { scoreYouTubeMatch } from "../src/lib/youtube-match";
import type { CatalogSong, Emotion, YouTubeSearchResult } from "../src/lib/types";

interface SearchResult extends YouTubeSearchResult {
  views: number;
}

interface VideoRenderer {
  videoId?: string;
  title?: {
    runs?: { text?: string }[];
    simpleText?: string;
  };
  ownerText?: { runs?: { text?: string }[] };
  longBylineText?: { runs?: { text?: string }[] };
  lengthText?: { simpleText?: string };
  viewCountText?: { simpleText?: string };
}

const STAGE = (process.argv[2] ?? "all") as
  | "youtube"
  | "lyrics"
  | "analysis"
  | "all";
const OUT = "/tmp/musik-catalog";
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TAXONOMY_VERSION = 1;
const YOUTUBE_DELAY_MS = 850;
const LIMIT = Number(process.env.ENRICH_LIMIT ?? "0");
const OFFSET = Number(process.env.ENRICH_OFFSET ?? "0");
const LYRICS_CONCURRENCY = Number(process.env.LYRICS_CONCURRENCY ?? "4");
const execFileAsync = promisify(execFile);
const YOUTUBE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

let token = "";

async function refreshToken() {
  const auth = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.BULK_ADMIN_EMAIL,
      password: process.env.BULK_ADMIN_PASSWORD,
    }),
  }).then((response) => response.json());
  if (!auth.access_token) {
    throw new Error(auth.error_description ?? auth.msg ?? "Admin sign-in failed");
  }
  token = auth.access_token;
}

function headers(): Record<string, string> {
  return {
    apikey: ANON,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slicePending<T>(items: T[]): T[] {
  return items.slice(
    OFFSET,
    LIMIT > 0 ? OFFSET + LIMIT : undefined,
  );
}

function parseViews(text: string): number {
  const match = text.replace(/\./g, "").match(/([\d,]+)/);
  return match ? Number(match[1]!.replace(/,/g, "")) : 0;
}

function extractInitialData(html: string): unknown {
  const marker = html.indexOf("ytInitialData");
  if (marker === -1) return null;
  const start = html.indexOf("{", marker);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(html.slice(start, index + 1));
      }
    }
  }
  return null;
}

function collectVideoRenderers(node: unknown, out: VideoRenderer[]): void {
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  if (record.videoRenderer) {
    out.push(record.videoRenderer as VideoRenderer);
  }
  for (const value of Object.values(record)) {
    collectVideoRenderers(value, out);
  }
}

async function searchYouTube(
  query: string,
  retries = 3,
): Promise<SearchResult[]> {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const url =
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(query) +
      "&hl=vi&gl=VN";
    let html = "";
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "vi,en;q=0.8",
          "User-Agent": YOUTUBE_UA,
        },
      });
      if (response.status === 429 || response.status >= 500) {
        await sleep(10_000 * (attempt + 1));
        continue;
      }
      if (!response.ok) return [];
      html = await response.text();
    } catch {
      try {
        const { stdout } = await execFileAsync(
          "curl",
          ["-L", "-s", "--compressed", "-A", YOUTUBE_UA, url],
          { maxBuffer: 20 * 1024 * 1024, timeout: 30_000 },
        );
        html = stdout;
      } catch {
        await sleep(10_000 * (attempt + 1));
        continue;
      }
    }
    const data = extractInitialData(html);
    if (!data) {
      await sleep(10_000 * (attempt + 1));
      continue;
    }
    const renderers: VideoRenderer[] = [];
    collectVideoRenderers(data, renderers);
    const results: SearchResult[] = [];
    for (const renderer of renderers) {
      const videoId = renderer.videoId;
      const title =
        renderer.title?.runs?.map((run) => run.text).join("") ??
        renderer.title?.simpleText ??
        "";
      const channelTitle =
        renderer.ownerText?.runs?.[0]?.text ??
        renderer.longBylineText?.runs?.[0]?.text ??
        "";
      const duration = renderer.lengthText?.simpleText ?? null;
      const viewsText = renderer.viewCountText?.simpleText ?? "";
      if (!videoId || !title) continue;
      results.push({
        videoId,
        title,
        channelTitle,
        duration,
        thumbnailUrl: "",
        views: parseViews(viewsText),
      });
      if (results.length >= 20) break;
    }
    return results;
  }
  return [];
}

async function pickYouTube(song: CatalogSong): Promise<{
  videoId: string;
  title: string;
  channel: string;
  score: number;
} | null> {
  const queries = [
    `${song.title} ${song.artist}`,
    `${song.title} ${song.artist} official`,
    `${song.title} ${song.artist} audio`,
    `${song.title} ${song.artist} lyrics`,
  ];
  for (const query of queries) {
    const results = await searchYouTube(query);
    const ranked = results
      .map((result, index) => {
        const match = scoreYouTubeMatch(song.title, song.artist, result, index);
        const viewBonus = Math.min(15, Math.log10(result.views + 1) * 3);
        const livePenalty = /\b(liveshow|live\s*show|concert)\b/i.test(
          result.title,
        )
          ? 50
          : 0;
        return {
          ...match,
          score: match.score + viewBonus - livePenalty,
        };
      })
      .filter((match) => match.artistMatched)
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (best && best.score >= 45) {
      return {
        videoId: best.result.videoId,
        title: best.result.title,
        channel: best.result.channelTitle,
        score: best.score,
      };
    }
    await sleep(400);
  }
  return null;
}

async function allSongs(): Promise<CatalogSong[]> {
  const rows: CatalogSong[] = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(
      `${BASE}/rest/v1/catalog_songs?select=*&order=id&offset=${offset}&limit=1000`,
      { headers: headers() },
    );
    if (!response.ok) {
      throw new Error(`catalog fetch ${response.status}: ${await response.text()}`);
    }
    const page = (await response.json()) as CatalogSong[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

async function loadProgress(stage: string): Promise<Set<string>> {
  try {
    const text = await readFile(`${OUT}/progress-${stage}.jsonl`, "utf8");
    return new Set(
      text
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .filter((item) => item.ok === true)
        .map((item) => item.id as string),
    );
  } catch {
    return new Set();
  }
}

async function markProgress(
  stage: string,
  id: string,
  ok: boolean,
  detail?: string,
) {
  await appendFile(
    `${OUT}/progress-${stage}.jsonl`,
    JSON.stringify({ id, ok, detail, at: new Date().toISOString() }) + "\n",
  );
}

async function patchSong(id: string, body: Record<string, unknown>) {
  const send = () =>
    fetch(`${BASE}/rest/v1/catalog_songs?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...headers(), Prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
  let response = await send();
  if (response.status === 401) {
    await refreshToken();
    response = await send();
  }
  if (!response.ok) {
    throw new Error(`PATCH ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
}

async function pool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let cursor = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]!);
    }
  });
  await Promise.all(runners);
}

async function youtubeStage(songs: CatalogSong[]) {
  const done = await loadProgress("youtube");
  const pending = slicePending(
    songs.filter((song) => !song.youtube_url && !done.has(song.id)),
  );
  console.log(`youtube pending ${pending.length}`);
  let ok = 0;
  let failed = 0;
  for (const song of pending) {
    try {
      const match = await pickYouTube(song);
      if (!match) {
        failed += 1;
        await markProgress("youtube", song.id, false, "no match");
      } else {
        await patchSong(song.id, {
          youtube_url: `https://www.youtube.com/watch?v=${match.videoId}`,
          youtube_video_id: match.videoId,
          youtube_title: match.title.slice(0, 300),
          youtube_channel: match.channel.slice(0, 200),
          youtube_updated_at: new Date().toISOString(),
        });
        ok += 1;
        await markProgress("youtube", song.id, true, String(Math.round(match.score)));
      }
    } catch (error) {
      failed += 1;
      await markProgress("youtube", song.id, false, String(error).slice(0, 200));
    }
    if ((ok + failed) % 25 === 0) {
      console.log(`youtube ${ok + failed}/${pending.length} ok=${ok} failed=${failed}`);
    }
    await sleep(YOUTUBE_DELAY_MS + Math.random() * 500);
  }
  console.log(`youtube done ok=${ok} failed=${failed}`);
}

async function lyricsStage(songs: CatalogSong[]) {
  const done = await loadProgress("lyrics");
  const pending = slicePending(
    songs.filter((song) => !song.lyrics_text && !done.has(song.id)),
  );
  console.log(`lyrics pending ${pending.length}`);
  let ok = 0;
  let failed = 0;
  await pool(pending, LYRICS_CONCURRENCY, async (song) => {
    let result = null;
    try {
      result = await Promise.race([
        fetchLyrics(song),
        sleep(80_000).then(() => null),
      ]);
    } catch {
      result = null;
    }
    if (!result) {
      failed += 1;
      await markProgress("lyrics", song.id, false, "no lyrics");
      return;
    }
    try {
      await patchSong(song.id, {
        lyrics_text: result.text.trim().slice(0, 60_000),
        lyrics_source: result.provider.slice(0, 40),
        lyrics_source_url: result.url,
        lyrics_updated_at: new Date().toISOString(),
      });
      ok += 1;
      await markProgress("lyrics", song.id, true, result.provider);
    } catch (error) {
      failed += 1;
      await markProgress("lyrics", song.id, false, String(error).slice(0, 200));
    }
    if ((ok + failed) % 25 === 0) {
      console.log(`lyrics ${ok + failed}/${pending.length} ok=${ok} failed=${failed}`);
    }
  });
  console.log(`lyrics done ok=${ok} failed=${failed}`);
}

async function analysisStage(songs: CatalogSong[]) {
  const emotionsResponse = await fetch(
    `${BASE}/rest/v1/emotions?select=*`,
    { headers: headers() },
  );
  const emotions = (await emotionsResponse.json()) as Emotion[];
  if (!Array.isArray(emotions) || emotions.length === 0) {
    throw new Error("Emotion taxonomy is empty.");
  }
  const analyzedResponse = await fetch(
    `${BASE}/rest/v1/song_analysis?select=song_id&taxonomy_version=eq.${TAXONOMY_VERSION}`,
    { headers: headers() },
  );
  const analyzed = new Set(
    ((await analyzedResponse.json()) as { song_id: string }[]).map(
      (row) => row.song_id,
    ),
  );
  const done = await loadProgress("analysis");
  const pending = slicePending(
    songs.filter((song) => !analyzed.has(song.id) && !done.has(song.id)),
  );
  console.log(`analysis pending ${pending.length}`);

  let ok = 0;
  let failed = 0;
  await pool(pending, 3, async (song) => {
    try {
      const { system, user } = buildPrompt(
        song,
        emotions,
        song.lyrics_text ?? null,
      );
      let result;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          result = await classifySong(system, user);
          break;
        } catch (error) {
          if (attempt === 2) throw error;
          await sleep(5_000 * (attempt + 1));
        }
      }
      if (!result) throw new Error("No classifier result");

      const validIds = new Set(emotions.map((emotion) => emotion.id));
      const categories = result.categories
        .filter((category) => validIds.has(category.id))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
      if (categories.length === 0) throw new Error("No valid categories");

      const analysisResponse = await fetch(
        `${BASE}/rest/v1/song_analysis?on_conflict=song_id,taxonomy_version`,
        {
          method: "POST",
          headers: {
            ...headers(),
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({
            song_id: song.id,
            valence: result.valence,
            arousal: result.arousal,
            quadrant: quadrantFor(result.valence, result.arousal),
            model: classifierModel(),
            taxonomy_version: TAXONOMY_VERSION,
            rationale: result.rationale,
            needs_review: categories[0]!.confidence < 0.45,
            analyzed_at: new Date().toISOString(),
          }),
        },
      );
      if (!analysisResponse.ok) {
        throw new Error(
          `analysis ${analysisResponse.status}: ${(await analysisResponse.text()).slice(0, 200)}`,
        );
      }

      await fetch(
        `${BASE}/rest/v1/song_emotions?song_id=eq.${encodeURIComponent(song.id)}`,
        { method: "DELETE", headers: headers() },
      );
      const tagsResponse = await fetch(`${BASE}/rest/v1/song_emotions`, {
        method: "POST",
        headers: { ...headers(), Prefer: "return=minimal" },
        body: JSON.stringify(
          categories.map((category, index) => ({
            song_id: song.id,
            emotion_id: category.id,
            confidence: category.confidence,
            is_primary: index === 0,
            source: "auto",
          })),
        ),
      });
      if (!tagsResponse.ok) {
        throw new Error(
          `tags ${tagsResponse.status}: ${(await tagsResponse.text()).slice(0, 200)}`,
        );
      }
      ok += 1;
      await markProgress("analysis", song.id, true, categories[0]!.id);
    } catch (error) {
      failed += 1;
      await markProgress("analysis", song.id, false, String(error).slice(0, 200));
    }
    if ((ok + failed) % 25 === 0) {
      console.log(`analysis ${ok + failed}/${pending.length} ok=${ok} failed=${failed}`);
    }
  });
  console.log(`analysis done ok=${ok} failed=${failed}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await refreshToken();
  setInterval(() => {
    void refreshToken().catch((error) => {
      console.error("token refresh failed", String(error));
    });
  }, 45 * 60 * 1000).unref();

  const songs = await allSongs();
  console.log(`catalog ${songs.length}`);
  if (STAGE === "youtube" || STAGE === "all") await youtubeStage(songs);
  if (STAGE === "lyrics" || STAGE === "all") await lyricsStage(songs);
  if (STAGE === "analysis" || STAGE === "all") await analysisStage(songs);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

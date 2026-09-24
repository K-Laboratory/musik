import "server-only";

import type { YouTubeSearchResult } from "@/lib/types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/** Music category id in the YouTube Data API. */
const MUSIC_CATEGORY_ID = "10";

export class YouTubeApiError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "YouTubeApiError";
    this.status = status;
  }
}

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: { url?: string };
      default?: { url?: string };
      high?: { url?: string };
    };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
  error?: { message?: string };
}

interface YouTubeVideosResponse {
  items?: { id?: string; contentDetails?: { duration?: string } }[];
  error?: { message?: string };
}

/**
 * Converts an ISO 8601 duration (e.g. "PT3M33S") into a friendly "3:33".
 * Returns null when the input can't be parsed.
 */
export function formatIsoDuration(iso?: string | null): string | null {
  if (!iso) return null;

  const match = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;

  const [, days, hours, minutes, seconds] = match;
  const totalHours = Number(days ?? 0) * 24 + Number(hours ?? 0);
  const mins = Number(minutes ?? 0);
  const secs = Number(seconds ?? 0);

  const parts: string[] =
    totalHours > 0
      ? [String(totalHours), String(mins).padStart(2, "0")]
      : [String(mins)];

  return `${parts.join(":")}:${String(secs).padStart(2, "0")}`;
}

async function youtubeFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new YouTubeApiError(
      "YouTube is not configured. Add YOUTUBE_API_KEY to your environment.",
      500,
    );
  }

  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  url.searchParams.set("key", apiKey);

  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new YouTubeApiError("Could not reach the YouTube API.", 502);
  }

  const data = (await response.json()) as T & { error?: { message?: string } };

  if (!response.ok) {
    const message = data?.error?.message ?? "YouTube API request failed.";
    const status = response.status === 403 ? 429 : 502;
    throw new YouTubeApiError(message, status);
  }

  return data;
}

/** Looks up durations for a batch of video ids (one extra quota unit). */
async function fetchDurations(
  videoIds: string[],
): Promise<Record<string, string | null>> {
  if (videoIds.length === 0) return {};

  const data = await youtubeFetch<YouTubeVideosResponse>("videos", {
    part: "contentDetails",
    id: videoIds.join(","),
    maxResults: String(videoIds.length),
  });

  const durations: Record<string, string | null> = {};
  for (const item of data.items ?? []) {
    if (item.id) durations[item.id] = formatIsoDuration(item.contentDetails?.duration);
  }
  return durations;
}

/**
 * Searches YouTube for music videos matching `query`.
 * Uses search.list with type=video and videoCategoryId=10 (Music).
 */
export async function searchMusic(
  query: string,
  maxResults = 10,
): Promise<YouTubeSearchResult[]> {
  const data = await youtubeFetch<YouTubeSearchResponse>("search", {
    part: "snippet",
    type: "video",
    videoCategoryId: MUSIC_CATEGORY_ID,
    maxResults: String(Math.min(Math.max(maxResults, 1), 25)),
    q: query,
  });

  const items = (data.items ?? []).filter((item) => item.id?.videoId);
  const videoIds = items.map((item) => item.id!.videoId!);

  // Durations are not part of search results, so fetch them separately.
  let durations: Record<string, string | null> = {};
  try {
    durations = await fetchDurations(videoIds);
  } catch {
    // Duration is a nice-to-have; never fail the whole search because of it.
    durations = {};
  }

  return items.map((item) => {
    const videoId = item.id!.videoId!;
    const snippet = item.snippet ?? {};
    const thumbnails = snippet.thumbnails ?? {};
    return {
      videoId,
      title: snippet.title ?? "Untitled",
      channelTitle: snippet.channelTitle ?? "",
      thumbnailUrl:
        thumbnails.medium?.url ??
        thumbnails.high?.url ??
        thumbnails.default?.url ??
        `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      duration: durations[videoId] ?? null,
    };
  });
}

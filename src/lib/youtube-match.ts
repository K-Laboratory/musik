import type { YouTubeSearchResult } from "@/lib/types";

export interface YouTubeMatch {
  result: YouTubeSearchResult;
  score: number;
  reason: string;
  artistMatched: boolean;
}

const TITLE_NOISE =
  /\b(?:official\s+(?:music\s+)?video|official\s+audio|lyrics?\s+video|lyric\s+video|audio\s+only|music\s+video|official|karaoke|cover|remix|instrumental|reaction|live)\b/gi;

const BAD_TITLE =
  /\b(?:karaoke|cover|remix|instrumental|reaction|shorts|tiktok|live)\b/i;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function overlapFraction(haystack: string, needles: string[]): number {
  if (needles.length === 0) return 0;
  const normalized = normalize(haystack);
  const found = needles.filter((token) => normalized.includes(token)).length;
  return found / needles.length;
}

function durationSeconds(duration: string | null): number | null {
  if (!duration) return null;
  const parts = duration.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  if (parts.length === 3) {
    return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  }
  return null;
}

/**
 * Scores a YouTube search result against a catalog song.
 *
 * The goal is to prefer the canonical recording, not merely a video whose
 * title contains the song name. Covers, karaoke tracks, live cuts, remixes,
 * and reaction videos are penalized unless the catalog metadata itself asks
 * for them.
 */
export function scoreYouTubeMatch(
  title: string,
  artist: string,
  result: YouTubeSearchResult,
  index: number,
): YouTubeMatch {
  const titleNorm = normalize(title);
  const artistNorm = normalize(artist);
  const resultTitleClean = result.title.replace(TITLE_NOISE, " ");
  const resultTitleNorm = normalize(resultTitleClean);
  const channelNorm = normalize(result.channelTitle);
  const titleTokens = tokens(title);
  const artistTokens = tokens(artist);

  const reasons: string[] = [];
  let score = 0;

  if (resultTitleNorm === titleNorm) {
    score += 65;
    reasons.push("exact title");
  } else if (resultTitleNorm.includes(titleNorm)) {
    score += 55;
    reasons.push("title contained");
  } else {
    const titleOverlap = overlapFraction(resultTitleClean, titleTokens);
    score += titleOverlap * 35;
    if (titleOverlap >= 0.75) reasons.push("strong title overlap");
    else if (titleOverlap > 0) reasons.push("partial title overlap");
    if (titleOverlap < 0.4) score -= 15;
  }

  const artistInChannel = artistNorm ? channelNorm.includes(artistNorm) : false;
  const artistInTitle = artistNorm
    ? resultTitleNorm.includes(artistNorm)
    : false;
  const artistChannelOverlap = artistNorm
    ? overlapFraction(result.channelTitle, artistTokens)
    : 1;
  const artistMatched =
    !artistNorm || artistInChannel || artistInTitle || artistChannelOverlap >= 0.5;
  if (artistInChannel) {
    score += 28;
    reasons.push("artist channel");
  } else if (artistInTitle) {
    score += 22;
    reasons.push("artist in title");
  } else {
    score += artistChannelOverlap * 12;
  }

  if (!artistMatched) {
    score -= 25;
    reasons.push("artist not matched");
  }

  if (/\b(?:vevo|topic|official)\b/.test(channelNorm)) {
    score += 7;
    reasons.push("official channel");
  }

  if (BAD_TITLE.test(result.title)) {
    score -= 30;
    reasons.push("alternate version");
  }

  const seconds = durationSeconds(result.duration);
  if (seconds !== null) {
    if (seconds >= 120 && seconds <= 480) score += 6;
    if (seconds < 75 || seconds > 900) score -= 25;
  }

  // Search rank is a weak prior; exact matches from lower ranks can still win.
  score -= index * 1.5;

  return {
    result,
    score,
    reason: reasons.join(", ") || "search result",
    artistMatched,
  };
}

/** Returns the best match, or null when no result clears the confidence bar. */
export function pickBestYouTubeMatch(
  title: string,
  artist: string,
  results: YouTubeSearchResult[],
  minimumScore = 45,
): YouTubeMatch | null {
  const ranked = results
    .map((result, index) => scoreYouTubeMatch(title, artist, result, index))
    .filter((match) => match.artistMatched)
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  return best && best.score >= minimumScore ? best : null;
}

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export interface ParsedYouTubeUrl {
  videoId: string;
  url: string;
}

/**
 * Accepts a full YouTube URL or a bare 11-character video id and returns the
 * canonical watch URL. Returns null for anything else.
 */
export function parseYouTubeUrl(value: string): ParsedYouTubeUrl | null {
  const raw = value.trim();
  if (!raw) return null;
  if (VIDEO_ID_RE.test(raw)) {
    return {
      videoId: raw,
      url: `https://www.youtube.com/watch?v=${raw}`,
    };
  }

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const allowed =
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtu.be";
  if (!allowed) return null;

  let videoId: string | null = null;
  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  } else {
    const match = url.pathname.match(
      /^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})(?:\/|$)/,
    );
    if (match) videoId = match[1]!;
  }

  if (!videoId || !VIDEO_ID_RE.test(videoId)) return null;

  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

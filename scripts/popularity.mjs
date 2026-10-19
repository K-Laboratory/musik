import { writeFile } from "node:fs/promises";

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;
const OUT = "/tmp/musik-catalog/popularity-report.json";
const CHUNK = 50;
const PATCH_CONCURRENCY = 8;

const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

function parseDuration(value) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value ?? "");
  if (!match) return null;
  return (
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
  );
}

function tier(score) {
  if (score >= 75) return "Viral";
  if (score >= 55) return "Popular";
  if (score >= 35) return "Established";
  if (score >= 15) return "Niche";
  return "Deep cut";
}

async function authHeaders() {
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
  return {
    apikey: ANON,
    Authorization: `Bearer ${auth.access_token}`,
    "Content-Type": "application/json",
  };
}

async function allSongs(headers) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await fetch(
      `${BASE}/rest/v1/catalog_songs?select=id,title,artist,year,youtube_video_id&order=id&limit=1000&offset=${offset}`,
      { headers },
    ).then((response) => response.json());
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

async function youtube(path, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("key", YOUTUBE_KEY);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `YouTube ${path} ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  }
  return response.json();
}

async function pool(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

async function main() {
  if (!YOUTUBE_KEY) throw new Error("YOUTUBE_API_KEY is missing");
  const headers = await authHeaders();
  const songs = await allSongs(headers);
  const withVideo = songs.filter((song) =>
    /^[A-Za-z0-9_-]{11}$/.test(song.youtube_video_id ?? ""),
  );
  console.log(`catalog ${songs.length}; linked videos ${withVideo.length}`);

  const videoIds = [...new Set(withVideo.map((song) => song.youtube_video_id))];
  const videos = [];
  for (let index = 0; index < videoIds.length; index += CHUNK) {
    const batch = videoIds.slice(index, index + CHUNK);
    const payload = await youtube("videos", {
      part: "snippet,statistics,contentDetails",
      id: batch.join(","),
      maxResults: String(CHUNK),
    });
    videos.push(...(payload.items ?? []));
    console.log(`videos ${Math.min(index + CHUNK, videoIds.length)}/${videoIds.length}`);
  }
  const videoById = new Map(videos.map((video) => [video.id, video]));

  const channelIds = [
    ...new Set(
      videos
        .map((video) => video.snippet?.channelId)
        .filter((value) => typeof value === "string"),
    ),
  ];
  const channels = [];
  for (let index = 0; index < channelIds.length; index += CHUNK) {
    const batch = channelIds.slice(index, index + CHUNK);
    const payload = await youtube("channels", {
      part: "statistics",
      id: batch.join(","),
      maxResults: String(CHUNK),
    });
    channels.push(...(payload.items ?? []));
    console.log(`channels ${Math.min(index + CHUNK, channelIds.length)}/${channelIds.length}`);
  }
  const subsByChannel = new Map(
    channels.map((channel) => [
      channel.id,
      Number(channel.statistics?.subscriberCount ?? 0),
    ]),
  );

  const now = Date.now();
  const metrics = [];
  for (const song of withVideo) {
    const video = videoById.get(song.youtube_video_id);
    if (!video) continue;
    const stats = video.statistics ?? {};
    const views = Number(stats.viewCount ?? 0);
    const likes = Number(stats.likeCount ?? 0);
    const comments = Number(stats.commentCount ?? 0);
    const channelId = video.snippet?.channelId ?? null;
    const subscribers = channelId ? subsByChannel.get(channelId) ?? 0 : 0;
    const publishedAt = video.snippet?.publishedAt ?? null;
    const ageDays = publishedAt
      ? Math.max(1, (now - new Date(publishedAt).getTime()) / 86_400_000)
      : 3650;
    const viewsPerDay = views / ageDays;
    const engagementRate = (likes + comments) / Math.max(views, 1);
    const viewScore = clamp((Math.log10(views + 1) / 8) * 100);
    const dailyScore = clamp((Math.log10(viewsPerDay + 1) / 4.5) * 100);
    const engagementScore = clamp((engagementRate / 0.08) * 100);
    const subscriberScore = clamp((Math.log10(subscribers + 1) / 7) * 100);
    const recencyScore = clamp(100 - (ageDays / 3650) * 100);
    const score = Number(
      (
        viewScore * 0.4 +
        dailyScore * 0.25 +
        engagementScore * 0.15 +
        subscriberScore * 0.1 +
        recencyScore * 0.1
      ).toFixed(2),
    );
    metrics.push({
      song_id: song.id,
      youtube_video_id: song.youtube_video_id,
      view_count: views,
      like_count: likes,
      comment_count: comments,
      channel_id: channelId,
      channel_subscribers: subscribers,
      published_at: publishedAt,
      duration_seconds: parseDuration(video.contentDetails?.duration),
      views_per_day: Number(viewsPerDay.toFixed(2)),
      engagement_rate: Number(engagementRate.toFixed(5)),
      popularity_score: score,
      popularity_tier: tier(score),
      source: "youtube",
      calculated_at: new Date().toISOString(),
    });
  }

  for (let index = 0; index < metrics.length; index += CHUNK) {
    const batch = metrics.slice(index, index + CHUNK);
    const response = await fetch(
      `${BASE}/rest/v1/song_popularity?on_conflict=song_id`,
      {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(batch),
      },
    );
    if (!response.ok) {
      throw new Error(
        `popularity upsert ${response.status}: ${(await response.text()).slice(0, 300)}`,
      );
    }
    console.log(`popularity rows ${Math.min(index + CHUNK, metrics.length)}/${metrics.length}`);
  }

  await pool(metrics, PATCH_CONCURRENCY, async (row) => {
    const response = await fetch(
      `${BASE}/rest/v1/catalog_songs?id=eq.${encodeURIComponent(row.song_id)}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ popularity_score: row.popularity_score }),
      },
    );
    if (!response.ok) {
      throw new Error(`score patch ${response.status}`);
    }
  });

  const report = {
    songs: songs.length,
    linked_videos: withVideo.length,
    videos_found: videos.length,
    channels: channels.length,
    metrics: metrics.length,
    missing_video_stats: withVideo.length - metrics.length,
    tiers: Object.fromEntries(
      ["Viral", "Popular", "Established", "Niche", "Deep cut"].map((name) => [
        name,
        metrics.filter((row) => row.popularity_tier === name).length,
      ]),
    ),
  };
  await writeFile(OUT, JSON.stringify({ report, metrics }, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

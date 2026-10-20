import type { Song } from "@/lib/types";

export const ALBUM_MIN_TRACKS = 3;
export const ALBUM_MAX_TRACKS = 50;

export type AlbumEnergy =
  | "any"
  | "gentle"
  | "uplifting"
  | "intense"
  | "melancholic";

export type AlbumRole =
  | "opener"
  | "build"
  | "ride"
  | "centerpiece"
  | "release"
  | "finale";

export type AlbumSignal =
  | "anchor"
  | "discovery"
  | "emotion"
  | "era"
  | "widened";

export interface AlbumConfig {
  generationIds: string[];
  emotionIds: string[];
  yearFrom: number | null;
  yearTo: number | null;
  count: number;
  mainstream: number;
  energy: AlbumEnergy;
  onePerArtist: boolean;
  language: "en" | "vi";
  title?: string;
}

export interface AlbumEmotionTag {
  id: string;
  name: string;
  nameVi: string | null;
  confidence: number;
  isPrimary: boolean;
  valence: number;
  arousal: number;
  quadrant: string;
}

export interface AlbumTrackEmotion {
  id: string;
  name: string;
  nameVi: string | null;
}

export interface AlbumTrack {
  songId: string;
  title: string;
  artist: string;
  year: number | null;
  generationId: string | null;
  generationLabel: string;
  videoId: string;
  youtubeChannel: string | null;
  popularityScore: number | null;
  popularityTier: string | null;
  thumbnailUrl: string;
  emotions: AlbumTrackEmotion[];
  role: AlbumRole;
  signals: AlbumSignal[];
}

export interface AlbumStats {
  averagePopularity: number;
  anchors: number;
  discoveries: number;
  generations: number;
  emotions: number;
  yearFrom: number | null;
  yearTo: number | null;
}

export interface AlbumView {
  id: string;
  title: string;
  description: string | null;
  config: AlbumConfig;
  stats: AlbumStats;
  tracks: AlbumTrack[];
  relaxations: AlbumSignal[];
  createdAt?: string;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function albumTracksToSongs(
  album: AlbumView,
  userId: string,
): Song[] {
  return album.tracks.map((track) => ({
    id: `album:${album.id}:${track.songId}`,
    user_id: userId,
    youtube_video_id: track.videoId,
    title: track.title,
    channel_title: track.artist || track.youtubeChannel,
    thumbnail_url: track.thumbnailUrl,
    duration: null,
    created_at: album.createdAt ?? new Date(0).toISOString(),
  }));
}

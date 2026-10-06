import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type Playlist = Tables["playlists"]["Row"];
export type Song = Tables["songs"]["Row"];
export type PlaylistSong = Tables["playlist_songs"]["Row"];

// Emotion classification (admin).
export type Generation = Tables["generations"]["Row"];
export type Emotion = Tables["emotions"]["Row"];
export type CatalogSong = Tables["catalog_songs"]["Row"];
export type SongEmotion = Tables["song_emotions"]["Row"];
export type SongAnalysis = Tables["song_analysis"]["Row"];

/** A single result returned by the YouTube search API route. */
export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: string | null;
}

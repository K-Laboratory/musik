"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type {
  Playlist,
  PlaylistSong,
  Profile,
  Song,
  YouTubeSearchResult,
} from "@/lib/types";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

type MutationResult = { status: "added" | "exists" };

interface DataContextValue {
  user: User;
  profile: Profile | null;
  songs: Song[];
  playlists: Playlist[];
  playlistSongs: PlaylistSong[];
  loading: boolean;
  error: string | null;
  toasts: Toast[];
  refresh: () => Promise<void>;
  dismissToast: (id: string) => void;
  notify: (message: string, kind?: ToastKind) => void;
  addSongFromYouTube: (result: YouTubeSearchResult) => Promise<MutationResult>;
  removeSong: (songId: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist | null>;
  renamePlaylist: (playlistId: string, name: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addSongToPlaylist: (
    playlistId: string,
    songId: string,
  ) => Promise<MutationResult>;
  removeSongFromPlaylist: (playlistSongId: string) => Promise<void>;
  reorderPlaylist: (playlistId: string, orderedIds: string[]) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { id, kind, message }]);
      setTimeout(() => dismissToast(id), 4000);
    },
    [dismissToast],
  );

  const refresh = useCallback(async () => {
    const supabase = createClient();
    setError(null);

    try {
      const [profileRes, songsRes, playlistsRes, playlistSongsRes] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase
            .from("songs")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("playlists")
            .select("*")
            .order("created_at", { ascending: true }),
          supabase
            .from("playlist_songs")
            .select("*")
            .order("position", { ascending: true }),
        ]);

      const firstError =
        profileRes.error ??
        songsRes.error ??
        playlistsRes.error ??
        playlistSongsRes.error;
      if (firstError) throw new Error(firstError.message);

      setProfile(profileRes.data ?? null);
      setSongs(songsRes.data ?? []);
      setPlaylists(playlistsRes.data ?? []);
      setPlaylistSongs(playlistSongsRes.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your library."));
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addSongFromYouTube = useCallback(
    async (result: YouTubeSearchResult): Promise<MutationResult> => {
      const supabase = createClient();
      const existing = songs.find(
        (song) => song.youtube_video_id === result.videoId,
      );
      if (existing) return { status: "exists" };

      const { data, error: insertError } = await supabase
        .from("songs")
        .insert({
          user_id: user.id,
          youtube_video_id: result.videoId,
          title: result.title,
          channel_title: result.channelTitle || null,
          thumbnail_url: result.thumbnailUrl || null,
          duration: result.duration,
        })
        .select()
        .single();

      if (insertError) {
        // 23505 = unique_violation, i.e. the song is already in the library.
        if (insertError.code === "23505") {
          const { data: existingRow } = await supabase
            .from("songs")
            .select("*")
            .eq("youtube_video_id", result.videoId)
            .maybeSingle();
          if (existingRow) {
            setSongs((current) => [existingRow, ...current]);
            return { status: "exists" };
          }
        }
        throw new Error(insertError.message);
      }

      setSongs((current) => [data, ...current]);
      return { status: "added" };
    },
    [songs, user.id],
  );

  const removeSong = useCallback(async (songId: string) => {
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("songs")
      .delete()
      .eq("id", songId);
    if (deleteError) throw new Error(deleteError.message);

    setSongs((current) => current.filter((song) => song.id !== songId));
    setPlaylistSongs((current) =>
      current.filter((entry) => entry.song_id !== songId),
    );
  }, []);

  const createPlaylist = useCallback(
    async (name: string): Promise<Playlist | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("playlists")
        .insert({ user_id: user.id, name: trimmed })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);

      setPlaylists((current) => [...current, data]);
      return data;
    },
    [user.id],
  );

  const renamePlaylist = useCallback(
    async (playlistId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("playlists")
        .update({ name: trimmed })
        .eq("id", playlistId);
      if (updateError) throw new Error(updateError.message);

      setPlaylists((current) =>
        current.map((playlist) =>
          playlist.id === playlistId ? { ...playlist, name: trimmed } : playlist,
        ),
      );
    },
    [],
  );

  const deletePlaylist = useCallback(async (playlistId: string) => {
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("playlists")
      .delete()
      .eq("id", playlistId);
    if (deleteError) throw new Error(deleteError.message);

    setPlaylists((current) =>
      current.filter((playlist) => playlist.id !== playlistId),
    );
    setPlaylistSongs((current) =>
      current.filter((entry) => entry.playlist_id !== playlistId),
    );
  }, []);

  const addSongToPlaylist = useCallback(
    async (playlistId: string, songId: string): Promise<MutationResult> => {
      const alreadyThere = playlistSongs.some(
        (entry) => entry.playlist_id === playlistId && entry.song_id === songId,
      );
      if (alreadyThere) return { status: "exists" };

      const positions = playlistSongs
        .filter((entry) => entry.playlist_id === playlistId)
        .map((entry) => entry.position);
      const nextPosition = positions.length ? Math.max(...positions) + 1 : 0;

      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("playlist_songs")
        .upsert(
          { playlist_id: playlistId, song_id: songId, position: nextPosition },
          { onConflict: "playlist_id,song_id", ignoreDuplicates: true },
        )
        .select();

      if (insertError) throw new Error(insertError.message);
      if (!data || data.length === 0) return { status: "exists" };

      setPlaylistSongs((current) => [...current, ...data]);
      return { status: "added" };
    },
    [playlistSongs],
  );

  const removeSongFromPlaylist = useCallback(async (playlistSongId: string) => {
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("playlist_songs")
      .delete()
      .eq("id", playlistSongId);
    if (deleteError) throw new Error(deleteError.message);

    setPlaylistSongs((current) =>
      current.filter((entry) => entry.id !== playlistSongId),
    );
  }, []);

  const reorderPlaylist = useCallback(
    async (playlistId: string, orderedIds: string[]) => {
      // Optimistic update so the list doesn't jump while we save.
      setPlaylistSongs((current) =>
        current.map((entry) => {
          if (entry.playlist_id !== playlistId) return entry;
          const index = orderedIds.indexOf(entry.id);
          return index === -1 ? entry : { ...entry, position: index };
        }),
      );

      const supabase = createClient();
      const results = await Promise.all(
        orderedIds.map((id, index) =>
          supabase
            .from("playlist_songs")
            .update({ position: index })
            .eq("id", id),
        ),
      );
      const failure = results.find((result) => result.error);
      if (failure?.error) throw new Error(failure.error.message);
    },
    [],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      user,
      profile,
      songs,
      playlists,
      playlistSongs,
      loading,
      error,
      toasts,
      refresh,
      dismissToast,
      notify,
      addSongFromYouTube,
      removeSong,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      reorderPlaylist,
    }),
    [
      user,
      profile,
      songs,
      playlists,
      playlistSongs,
      loading,
      error,
      toasts,
      refresh,
      dismissToast,
      notify,
      addSongFromYouTube,
      removeSong,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      reorderPlaylist,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used inside a <DataProvider>.");
  }
  return context;
}

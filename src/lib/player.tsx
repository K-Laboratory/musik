"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useData } from "@/components/DataProvider";
import type { Song } from "@/lib/types";

export type PlaybackSource =
  | { type: "songs" }
  | { type: "playlist"; playlistId: string };

interface PlayerState {
  /** The list of songs currently queued for playback. */
  queue: Song[];
  /** Index of the current song inside `queue`. */
  index: number;
  /** Where the queue came from (library or a specific playlist). */
  source: PlaybackSource | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

interface PlayerContextValue {
  queue: Song[];
  index: number;
  source: PlaybackSource | null;
  currentSong: Song | null;
  isPlaying: boolean;
  isReady: boolean;
  currentTime: number;
  duration: number;
  hasNext: boolean;
  hasPrevious: boolean;
  /** True when the given song is the one loaded in the player. */
  isCurrentSong: (songId: string) => boolean;
  /** True when the given playlist is the active playback source. */
  isPlaylistPlaying: (playlistId: string) => boolean;
  /** Play a single song. The rest of the library becomes the queue. */
  playSong: (song: Song) => void;
  /** Play a playlist from `startIndex` (defaults to the first song). */
  playPlaylist: (playlistId: string, songs: Song[], startIndex?: number) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  stop: () => void;
  // Low-level hooks used by <PlayerEngine />:
  setIsPlaying: (value: boolean) => void;
  setProgress: (currentTime: number, duration: number) => void;
  setReady: (value: boolean) => void;
}

const initialState: PlayerState = {
  queue: [],
  index: 0,
  source: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { songs } = useData();
  const [state, setState] = useState<PlayerState>(initialState);
  const [isReady, setIsReady] = useState(false);

  // Keep the latest library in a ref so `playSong` stays stable.
  const songsRef = useRef(songs);
  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  const playSong = useCallback((song: Song) => {
    const library = songsRef.current;
    const libraryIndex = library.findIndex((item) => item.id === song.id);
    const useLibrary = libraryIndex >= 0 && library.length > 0;

    setState({
      queue: useLibrary ? library : [song],
      index: useLibrary ? libraryIndex : 0,
      source: { type: "songs" },
      isPlaying: true,
      currentTime: 0,
      duration: 0,
    });
  }, []);

  const playPlaylist = useCallback(
    (playlistId: string, list: Song[], startIndex = 0) => {
      if (list.length === 0) return;
      const safeIndex = Math.min(Math.max(startIndex, 0), list.length - 1);
      setState({
        queue: list,
        index: safeIndex,
        source: { type: "playlist", playlistId },
        isPlaying: true,
        currentTime: 0,
        duration: 0,
      });
    },
    [],
  );

  const toggle = useCallback(() => {
    setState((current) =>
      current.queue.length === 0
        ? current
        : { ...current, isPlaying: !current.isPlaying },
    );
  }, []);

  const next = useCallback(() => {
    setState((current) => {
      if (current.index + 1 < current.queue.length) {
        return {
          ...current,
          index: current.index + 1,
          isPlaying: true,
          currentTime: 0,
          duration: 0,
        };
      }
      return { ...current, isPlaying: false };
    });
  }, []);

  const previous = useCallback(() => {
    setState((current) => {
      if (current.index === 0) return current;
      return {
        ...current,
        index: current.index - 1,
        isPlaying: true,
        currentTime: 0,
        duration: 0,
      };
    });
  }, []);

  const stop = useCallback(() => {
    setState(initialState);
  }, []);

  const setIsPlaying = useCallback((value: boolean) => {
    setState((current) =>
      current.isPlaying === value ? current : { ...current, isPlaying: value },
    );
  }, []);

  const setProgress = useCallback((currentTime: number, duration: number) => {
    setState((current) =>
      current.currentTime === currentTime && current.duration === duration
        ? current
        : { ...current, currentTime, duration },
    );
  }, []);

  const setReady = useCallback((value: boolean) => {
    setIsReady(value);
  }, []);

  const currentSong = state.queue[state.index] ?? null;

  const isCurrentSong = useCallback(
    (songId: string) => currentSong?.id === songId,
    [currentSong],
  );

  const isPlaylistPlaying = useCallback(
    (playlistId: string) =>
      state.source?.type === "playlist" && state.source.playlistId === playlistId,
    [state.source],
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue: state.queue,
      index: state.index,
      source: state.source,
      currentSong,
      isPlaying: state.isPlaying,
      isReady,
      currentTime: state.currentTime,
      duration: state.duration,
      hasNext: state.index + 1 < state.queue.length,
      hasPrevious: state.index > 0,
      isCurrentSong,
      isPlaylistPlaying,
      playSong,
      playPlaylist,
      toggle,
      next,
      previous,
      stop,
      setIsPlaying,
      setProgress,
      setReady,
    }),
    [
      state.queue,
      state.index,
      state.source,
      state.isPlaying,
      state.currentTime,
      state.duration,
      isReady,
      currentSong,
      isCurrentSong,
      isPlaylistPlaying,
      playSong,
      playPlaylist,
      toggle,
      next,
      previous,
      stop,
      setIsPlaying,
      setProgress,
      setReady,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used inside a <PlayerProvider>.");
  }
  return context;
}

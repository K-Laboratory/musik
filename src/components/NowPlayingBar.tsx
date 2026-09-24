"use client";

import { PlayerEngine } from "@/components/PlayerEngine";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  SkipNextIcon,
  SkipPreviousIcon,
} from "@/components/Icons";
import { usePlayer } from "@/lib/player";
import { useViewMode } from "@/lib/view-mode";

/**
 * Persistent player at the bottom of the app.
 *
 * - Normal mode: shows the YouTube video alongside the controls.
 * - Compact mode: the video is collapsed (audio only) and a slim bar is shown.
 *
 * It is always mounted so the underlying player stays alive between songs and
 * page navigations; when idle it is simply moved off-screen.
 */
export function NowPlayingBar() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    hasNext,
    hasPrevious,
    toggle,
    next,
    previous,
    stop,
  } = usePlayer();
  const { isCompact } = useViewMode();

  const idle = !currentSong;
  const progress =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      aria-hidden={idle}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur transition-transform duration-200 ${
        idle
          ? "pointer-events-none translate-y-full opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      <div className="h-0.5 w-full bg-slate-800">
        <div
          className="h-full bg-violet-500 transition-[width] duration-500 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div
          className={`shrink-0 overflow-hidden rounded-lg bg-black ${
            isCompact ? "h-px w-px opacity-0" : "aspect-video w-32 sm:w-52"
          }`}
        >
          <PlayerEngine className="h-full w-full" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {currentSong?.title ?? ""}
          </p>
          <p className="truncate text-xs text-slate-400">
            {currentSong?.channel_title ?? ""}
            {currentSong?.duration ? ` - ${currentSong.duration}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={previous}
            disabled={!hasPrevious}
            aria-label="Previous song"
            className="rounded-full p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipPreviousIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-violet-500"
          >
            {isPlaying ? (
              <PauseIcon className="h-5 w-5" />
            ) : (
              <PlayIcon className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!hasNext}
            aria-label="Next song"
            className="rounded-full p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipNextIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={stop}
            aria-label="Close player"
            className="ml-1 rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

import { PlayerEngine } from "@/components/PlayerEngine";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  SettingsIcon,
  SkipNextIcon,
  SkipPreviousIcon,
} from "@/components/Icons";
import { useDisguise } from "@/lib/disguise";
import { usePlayer } from "@/lib/player";
import { useViewMode } from "@/lib/view-mode";

/** Formats a number of seconds as `m:ss` (or `h:mm:ss` for long songs). */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const paddedSecs = String(secs).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSecs}`;
  }
  return `${minutes}:${paddedSecs}`;
}

/**
 * Persistent player at the bottom of the app.
 *
 * - Normal mode: shows the YouTube video alongside the controls.
 * - Compact mode: the video is collapsed (audio only) and a slim bar is shown.
 * - Work mode: the player UI is reduced to a neutral progress bar and a single
 *   play/pause button; no video, title or music-styled controls.
 *
 * The <PlayerEngine /> is always mounted in the same place so audio keeps
 * playing when the disguise (or the view mode) changes.
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
    seek,
  } = usePlayer();
  const { isCompact } = useViewMode();
  const { isWork } = useDisguise();

  // While the user drags the slider we show a local value so the 500 ms
  // progress poll doesn't fight the drag. `dragTimeRef` keeps the latest value
  // available to the global pointer-up handler below.
  const [dragTime, setDragTime] = useState<number | null>(null);
  const dragTimeRef = useRef<number | null>(null);

  const idle = !currentSong;
  const seekable = duration > 0;
  const displayedTime = dragTime ?? currentTime;
  const value = seekable ? Math.min(displayedTime, duration) : 0;
  const progress = seekable ? Math.min(100, (value / duration) * 100) : 0;

  const commitSeek = (seconds: number) => {
    seek(seconds);
    setDragTime(null);
  };

  // Commit the seek wherever the pointer is released (the slider does not
  // always receive pointerup if the drag ends outside it).
  const isDragging = dragTime !== null;
  useEffect(() => {
    if (!isDragging) return;
    const finish = () => {
      const pending = dragTimeRef.current;
      dragTimeRef.current = null;
      setDragTime(null);
      if (pending !== null) seek(pending);
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [isDragging, seek]);

  const trackColor = isWork ? "rgb(128 128 128)" : "rgb(51 65 85)";
  const fillColor = isWork ? "rgb(0 0 128)" : "rgb(139 92 246)";

  return (
    <div
      aria-hidden={idle}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur transition-transform duration-200 ${
        idle
          ? "pointer-events-none translate-y-full opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 pt-2 text-[11px] tabular-nums text-slate-400 sm:px-6 lg:px-8">
        <span className="w-9 shrink-0 text-right">{formatTime(value)}</span>
        <input
          type="range"
          min={0}
          max={seekable ? duration : 1}
          step={1}
          value={value}
          disabled={!seekable}
          aria-label={isWork ? "Progress" : "Seek"}
          onChange={(event) => {
            const seconds = Number(event.target.value);
            dragTimeRef.current = seconds;
            setDragTime(seconds);
          }}
          onKeyUp={(event) =>
            commitSeek(Number((event.target as HTMLInputElement).value))
          }
          onBlur={(event) =>
            commitSeek(Number((event.target as HTMLInputElement).value))
          }
          style={{
            background: `linear-gradient(to right, ${fillColor} ${progress}%, ${trackColor} ${progress}%)`,
          }}
          className="h-1.5 w-full flex-1 cursor-pointer appearance-none rounded-full outline-none transition disabled:cursor-default disabled:opacity-50 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-violet-400"
        />
        <span className="w-9 shrink-0">{formatTime(duration)}</span>
      </div>

      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div
          className={`shrink-0 overflow-hidden rounded-lg bg-black ${
            isCompact || isWork
              ? "h-px w-px opacity-0"
              : "aspect-video w-32 sm:w-52"
          }`}
        >
          <PlayerEngine className="h-full w-full" />
        </div>

        {!isWork && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {currentSong?.title ?? ""}
            </p>
            <p className="truncate text-xs text-slate-400">
              {currentSong?.channel_title ?? ""}
              {currentSong?.duration ? ` - ${currentSong.duration}` : ""}
            </p>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {!isWork && (
            <button
              type="button"
              onClick={previous}
              disabled={!hasPrevious}
              aria-label="Previous song"
              className="rounded-full p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SkipPreviousIcon className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-violet-500"
          >
            {isWork ? (
              <SettingsIcon className="h-5 w-5" />
            ) : isPlaying ? (
              <PauseIcon className="h-5 w-5" />
            ) : (
              <PlayIcon className="h-5 w-5" />
            )}
          </button>
          {!isWork && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useDraggable } from "@dnd-kit/core";
import type { useSortable } from "@dnd-kit/sortable";
import Image from "next/image";
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { GripIcon, PauseIcon, PlayIcon } from "@/components/Icons";
import type { Song } from "@/lib/types";
import { useViewMode } from "@/lib/view-mode";

export type SongCardVariant = "normal" | "compact";

export interface SongCardVisualProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  song: Song;
  variant?: SongCardVariant;
  actions?: ReactNode;
  active?: boolean;
  /** The song is loaded in the player (playing or paused). */
  playing?: boolean;
  onTogglePlay?: () => void;
  /** Show a drag handle (used by the sortable list on a playlist page). */
  showGrip?: boolean;
  gripProps?: HTMLAttributes<HTMLButtonElement>;
  gripRef?: (node: HTMLButtonElement | null) => void;
  dragging?: boolean;
}

export const SongCardVisual = forwardRef<HTMLDivElement, SongCardVisualProps>(
  function SongCardVisual(
    {
      song,
      variant = "normal",
      actions,
      active = false,
      playing = false,
      onTogglePlay,
      showGrip = false,
      gripProps,
      gripRef,
      dragging = false,
      className = "",
      ...rest
    },
    ref,
  ) {
    const isCompact = variant === "compact";

    const grip = showGrip ? (
      <button
        ref={gripRef}
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab touch-none rounded p-1 text-slate-500 transition hover:text-slate-200 active:cursor-grabbing"
        {...gripProps}
      >
        <GripIcon className="h-4 w-4" />
      </button>
    ) : null;

    const controls =
      onTogglePlay || actions ? (
        <div
          className="flex shrink-0 items-center gap-1"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                playing
                  ? "bg-violet-500 text-white"
                  : "bg-slate-800 text-slate-200 hover:bg-violet-600 hover:text-white"
              }`}
            >
              {playing ? (
                <PauseIcon className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
            </button>
          )}
          {actions}
        </div>
      ) : null;

    const shell = `group flex items-center border bg-slate-900/70 transition ${
      active
        ? "border-violet-500/60 bg-violet-500/10"
        : "border-slate-800 hover:border-slate-700"
    } ${dragging ? "opacity-40" : ""}`;

    // Compact: no thumbnail, everything on a single line.
    if (isCompact) {
      return (
        <div
          ref={ref}
          className={`${shell} gap-2 rounded-lg px-2.5 py-1.5 ${className}`}
          {...rest}
        >
          {grip}
          <p
            className="min-w-0 flex-1 truncate text-sm font-medium text-white"
            title={song.title}
          >
            {song.title}
          </p>
          <span className="max-w-[6rem] shrink-0 truncate text-xs text-slate-400 sm:max-w-[10rem]">
            {song.channel_title || "Unknown channel"}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-slate-400">
            {song.duration ?? "--:--"}
          </span>
          {controls}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={`${shell} gap-3 rounded-xl p-2.5 ${className}`}
        {...rest}
      >
        {grip}

        <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-800">
          {song.thumbnail_url ? (
            <Image
              src={song.thumbnail_url}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-600">
              <GripIcon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium text-white"
            title={song.title}
          >
            {song.title}
          </p>
          <p className="truncate text-xs text-slate-400">
            {song.channel_title || "Unknown channel"}
          </p>
        </div>

        {song.duration && (
          <span className="hidden shrink-0 rounded-md bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-300 sm:inline-block">
            {song.duration}
          </span>
        )}

        {controls}
      </div>
    );
  },
);

export interface DraggableSongCardProps {
  song: Song;
  actions?: ReactNode;
  active?: boolean;
  playing?: boolean;
  onTogglePlay?: () => void;
}

/** A song card that can be dragged onto a playlist. */
export function DraggableSongCard({
  song,
  actions,
  active,
  playing,
  onTogglePlay,
}: DraggableSongCardProps) {
  const { mode } = useViewMode();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `song-${song.id}`,
    data: { type: "song", songId: song.id },
  });

  return (
    <SongCardVisual
      ref={setNodeRef}
      song={song}
      variant={mode}
      actions={actions}
      active={active}
      playing={playing}
      onTogglePlay={onTogglePlay}
      dragging={isDragging}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...(listeners as HTMLAttributes<HTMLDivElement>)}
    />
  );
}

export interface SortableSongRowProps {
  song: Song;
  sortable: ReturnType<typeof useSortable>;
  actions?: ReactNode;
  active?: boolean;
  playing?: boolean;
  onTogglePlay?: () => void;
  onSelect?: () => void;
}

/** A song row for the sortable list on a playlist page. */
export function SortableSongRow({
  song,
  sortable,
  actions,
  active,
  playing,
  onTogglePlay,
  onSelect,
}: SortableSongRowProps) {
  const { mode } = useViewMode();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  return (
    <SongCardVisual
      ref={setNodeRef}
      style={style}
      song={song}
      variant={mode}
      actions={actions}
      active={active}
      playing={playing}
      onTogglePlay={onTogglePlay}
      onClick={onSelect}
      className={onSelect ? "cursor-pointer" : undefined}
      dragging={isDragging}
      showGrip
      gripRef={setActivatorNodeRef}
      gripProps={{
        ...attributes,
        ...(listeners as HTMLAttributes<HTMLButtonElement>),
      }}
    />
  );
}

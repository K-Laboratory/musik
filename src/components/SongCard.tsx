"use client";

import { useDraggable } from "@dnd-kit/core";
import type { useSortable } from "@dnd-kit/sortable";
import Image from "next/image";
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { GripIcon } from "@/components/Icons";
import type { Song } from "@/lib/types";

export interface SongCardVisualProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  song: Song;
  actions?: ReactNode;
  active?: boolean;
  /** Show a drag handle (used by the sortable list on a playlist page). */
  showGrip?: boolean;
  /** Extra props applied to the grip button (sortable listeners live here). */
  gripProps?: HTMLAttributes<HTMLButtonElement>;
  gripRef?: (node: HTMLButtonElement | null) => void;
  /** Fade the card while it is being dragged. */
  dragging?: boolean;
}

export const SongCardVisual = forwardRef<HTMLDivElement, SongCardVisualProps>(
  function SongCardVisual(
    {
      song,
      actions,
      active = false,
      showGrip = false,
      gripProps,
      gripRef,
      dragging = false,
      className = "",
      ...rest
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={`group flex items-center gap-3 rounded-xl border bg-slate-900/70 p-2.5 transition ${
          active
            ? "border-violet-500/60 bg-violet-500/10"
            : "border-slate-800 hover:border-slate-700"
        } ${dragging ? "opacity-40" : ""} ${className}`}
        {...rest}
      >
        {showGrip && (
          <button
            ref={gripRef}
            type="button"
            aria-label="Drag to reorder"
            className="cursor-grab touch-none rounded p-1 text-slate-500 transition hover:text-slate-200 active:cursor-grabbing"
            {...gripProps}
          >
            <GripIcon className="h-4 w-4" />
          </button>
        )}

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

        {actions && (
          <div
            className="flex shrink-0 items-center gap-1"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
    );
  },
);

/** A song card that can be dragged onto a playlist. */
export function DraggableSongCard({
  song,
  actions,
  active,
}: {
  song: Song;
  actions?: ReactNode;
  active?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `song-${song.id}`,
    data: { type: "song", songId: song.id },
  });

  return (
    <SongCardVisual
      ref={setNodeRef}
      song={song}
      actions={actions}
      active={active}
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
  onSelect?: () => void;
}

/** A song row for the sortable list on a playlist page. */
export function SortableSongRow({
  song,
  sortable,
  actions,
  active,
  onSelect,
}: SortableSongRowProps) {
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
      actions={actions}
      active={active}
      dragging={isDragging}
      onClick={onSelect}
      className={onSelect ? "cursor-pointer" : undefined}
      showGrip
      gripRef={setActivatorNodeRef}
      gripProps={{
        ...attributes,
        ...(listeners as HTMLAttributes<HTMLButtonElement>),
      }}
    />
  );
}

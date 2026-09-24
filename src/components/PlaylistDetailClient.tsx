"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useData } from "@/components/DataProvider";
import {
  AlertIcon,
  ListIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { SortableSongRow } from "@/components/SongCard";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { getErrorMessage } from "@/lib/errors";
import type { PlaylistSong, Song } from "@/lib/types";

interface PlaylistItem {
  entry: PlaylistSong;
  song: Song;
}

function PlaylistSongItem({
  item,
  active,
  onPlay,
  onRemove,
}: {
  item: PlaylistItem;
  active: boolean;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const sortable = useSortable({ id: item.entry.id });

  return (
    <SortableSongRow
      song={item.song}
      sortable={sortable}
      active={active}
      onSelect={onPlay}
      actions={
        <>
          <button
            type="button"
            aria-label={`Play ${item.song.title}`}
            onClick={onPlay}
            className="rounded-md p-1.5 text-slate-300 transition hover:bg-violet-500/15 hover:text-violet-200"
          >
            <PlayIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Remove ${item.song.title} from playlist`}
            onClick={onRemove}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </>
      }
    />
  );
}

export function PlaylistDetailClient({ playlistId }: { playlistId: string }) {
  const {
    playlists,
    playlistSongs,
    songs,
    loading,
    reorderPlaylist,
    removeSongFromPlaylist,
    addSongToPlaylist,
    notify,
  } = useData();

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const playlist = playlists.find((item) => item.id === playlistId) ?? null;

  const items = useMemo<PlaylistItem[]>(() => {
    const songById = new Map(songs.map((song) => [song.id, song]));
    return playlistSongs
      .filter((entry) => entry.playlist_id === playlistId)
      .slice()
      .sort(
        (a, b) =>
          a.position - b.position || a.created_at.localeCompare(b.created_at),
      )
      .map((entry) => ({ entry, song: songById.get(entry.song_id) }))
      .filter((item): item is PlaylistItem => Boolean(item.song));
  }, [playlistSongs, songs, playlistId]);

  const activeSong =
    items.find((item) => item.song.youtube_video_id === activeVideoId)?.song ??
    null;

  const availableSongs = useMemo(() => {
    const inPlaylist = new Set(items.map((item) => item.song.id));
    return songs.filter((song) => !inPlaylist.has(song.id));
  }, [items, songs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.entry.id === active.id);
    const newIndex = items.findIndex((item) => item.entry.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    try {
      await reorderPlaylist(
        playlistId,
        reordered.map((item) => item.entry.id),
      );
    } catch (err) {
      notify(getErrorMessage(err, "Could not save the new order."), "error");
    }
  }

  async function handleRemove(item: PlaylistItem) {
    try {
      await removeSongFromPlaylist(item.entry.id);
      if (activeVideoId === item.song.youtube_video_id) {
        setActiveVideoId(null);
      }
    } catch (err) {
      notify(getErrorMessage(err, "Could not remove the song."), "error");
    }
  }

  async function handleAdd(song: Song) {
    try {
      const { status } = await addSongToPlaylist(playlistId, song.id);
      notify(
        status === "added" ? "Added to playlist." : "Already in this playlist.",
        status === "added" ? "success" : "info",
      );
    } catch (err) {
      notify(getErrorMessage(err, "Could not add the song."), "error");
    }
  }

  if (!playlist && loading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-800/60" />
        <div className="h-[72px] animate-pulse rounded-xl bg-slate-800/60" />
        <div className="h-[72px] animate-pulse rounded-xl bg-slate-800/60" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/70 text-slate-400">
          <AlertIcon className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold text-white">Playlist not found</h1>
        <p className="mt-1 text-sm text-slate-400">
          It may have been deleted, or the link is incorrect.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-slate-400 transition hover:text-slate-200"
        >
          &larr; Back to dashboard
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/15 text-violet-300">
            <ListIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {playlist.name}
            </h1>
            <p className="text-sm text-slate-400">
              {items.length} {items.length === 1 ? "song" : "songs"} - drag the
              handle to reorder
            </p>
          </div>
        </div>
      </div>

      {activeSong && (
        <YouTubePlayer
          videoId={activeSong.youtube_video_id}
          title={activeSong.title}
        />
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-12 text-center">
          <p className="text-sm text-slate-300">This playlist is empty.</p>
          <p className="mt-1 text-sm text-slate-500">
            Drag songs onto it from the dashboard, or add them below.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => void handleDragEnd(event)}
        >
          <SortableContext
            items={items.map((item) => item.entry.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2.5">
              {items.map((item) => (
                <li key={item.entry.id}>
                  <PlaylistSongItem
                    item={item}
                    active={
                      activeSong?.youtube_video_id === item.song.youtube_video_id
                    }
                    onPlay={() => setActiveVideoId(item.song.youtube_video_id)}
                    onRemove={() => void handleRemove(item)}
                  />
                </li>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <button
          type="button"
          onClick={() => setShowLibrary((open) => !open)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={showLibrary}
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Add from your library
          </span>
          <span className="text-sm text-slate-400">
            {showLibrary ? "Hide" : `Show (${availableSongs.length})`}
          </span>
        </button>

        {showLibrary && (
          <div className="mt-3 space-y-2">
            {availableSongs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-800 px-3 py-6 text-center text-sm text-slate-500">
                Every song in your library is already in this playlist.
              </p>
            ) : (
              availableSongs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {song.title}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {song.channel_title || "Unknown channel"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAdd(song)}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-500"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

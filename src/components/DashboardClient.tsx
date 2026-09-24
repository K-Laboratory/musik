"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";

import { useData } from "@/components/DataProvider";
import { AlertIcon, MusicIcon, TrashIcon } from "@/components/Icons";
import { PlaylistPanel } from "@/components/PlaylistPanel";
import { DraggableSongCard, SongCardVisual } from "@/components/SongCard";
import { SongSearch } from "@/components/SongSearch";
import { getErrorMessage } from "@/lib/errors";
import type { Song } from "@/lib/types";

export function DashboardClient() {
  const {
    songs,
    loading,
    error,
    refresh,
    addSongToPlaylist,
    removeSong,
    notify,
  } = useData();

  const [activeSong, setActiveSong] = useState<Song | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "song") {
      setActiveSong(songs.find((song) => song.id === data.songId) ?? null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveSong(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === "song" && overData?.type === "playlist") {
      try {
        const { status } = await addSongToPlaylist(
          overData.playlistId as string,
          activeData.songId as string,
        );
        notify(
          status === "added"
            ? "Added to playlist."
            : "That song is already in this playlist.",
          status === "added" ? "success" : "info",
        );
      } catch (err) {
        notify(getErrorMessage(err, "Could not add the song."), "error");
      }
    }
  }

  async function handleRemoveSong(song: Song) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Remove "${song.title}" from your library?`)
    ) {
      return;
    }
    try {
      await removeSong(song.id);
      notify("Removed from your library.", "success");
    } catch (err) {
      notify(getErrorMessage(err, "Could not remove the song."), "error");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={(event) => void handleDragEnd(event)}
      onDragCancel={() => setActiveSong(null)}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <section>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Find a song
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Search YouTube and save songs to your library.
            </p>
            <div className="mt-4">
              <SongSearch />
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                My Songs{" "}
                <span className="text-sm font-normal text-slate-400">
                  ({songs.length})
                </span>
              </h2>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">{error}</div>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="shrink-0 font-medium text-red-100 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {loading && songs.length === 0 ? (
              <div className="grid gap-2.5 sm:grid-cols-2" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[72px] animate-pulse rounded-xl bg-slate-800/60"
                  />
                ))}
              </div>
            ) : songs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-12 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/70 text-slate-400">
                  <MusicIcon className="h-6 w-6" />
                </span>
                <p className="text-sm text-slate-300">
                  Your library is empty.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Use the search box above to add your first song.
                </p>
              </div>
            ) : (
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {songs.map((song) => (
                  <li key={song.id}>
                    <DraggableSongCard
                      song={song}
                      actions={
                        <button
                          type="button"
                          aria-label={`Remove ${song.title} from library`}
                          onClick={() => void handleRemoveSong(song)}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <PlaylistPanel className="h-fit lg:sticky lg:top-24" />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeSong ? (
          <div className="w-72 cursor-grabbing">
            <SongCardVisual
              song={activeSong}
              className="border-violet-500/60 shadow-2xl shadow-violet-900/40"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

"use client";

import { useDroppable } from "@dnd-kit/core";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useData } from "@/components/DataProvider";
import {
  CheckIcon,
  CloseIcon,
  EqualizerIcon,
  ListIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { getErrorMessage } from "@/lib/errors";
import { usePlayer } from "@/lib/player";
import type { Playlist, PlaylistSong, Song } from "@/lib/types";

/** A single playlist card that acts as a drop target and has a play button. */
export function PlaylistCard({
  playlist,
  songs,
}: {
  playlist: Playlist;
  songs: Song[];
}) {
  const { renamePlaylist, deletePlaylist, notify } = useData();
  const { playPlaylist, toggle, isPlaylistPlaying, isPlaying, currentSong } =
    usePlayer();
  const { setNodeRef, isOver } = useDroppable({
    id: `playlist-${playlist.id}`,
    data: { type: "playlist", playlistId: playlist.id },
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playlist.name);
  const [busy, setBusy] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);

  const isActive = isPlaylistPlaying(playlist.id);
  const isExpanded = isActive && songs.length > 0;

  // Keep the playing song centred in the (scrollable) expanded list.
  useEffect(() => {
    if (!isExpanded) return;
    const container = listRef.current;
    const item = activeItemRef.current;
    if (!container || !item) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const delta =
      itemRect.top -
      containerRect.top -
      container.clientHeight / 2 +
      item.clientHeight / 2;
    container.scrollTop += delta;
  }, [isExpanded, currentSong?.id]);

  async function saveName() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === playlist.name) {
      setDraft(playlist.name);
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await renamePlaylist(playlist.id, trimmed);
      notify("Playlist renamed.", "success");
      setEditing(false);
    } catch (err) {
      notify(getErrorMessage(err, "Could not rename the playlist."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete the playlist "${playlist.name}"?`)
    ) {
      return;
    }
    setBusy(true);
    try {
      await deletePlaylist(playlist.id);
      notify("Playlist deleted.", "success");
    } catch (err) {
      notify(getErrorMessage(err, "Could not delete the playlist."), "error");
      setBusy(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 transition ${
        isOver
          ? "border-violet-400 bg-violet-500/15 ring-2 ring-violet-500/40"
          : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
      }`}
    >
      <div className="flex items-center gap-2">
        {songs.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              isActive ? toggle() : playPlaylist(playlist.id, songs)
            }
            aria-label={
              isActive && isPlaying
                ? `Pause ${playlist.name}`
                : `Play ${playlist.name}`
            }
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
              isActive && isPlaying
                ? "bg-violet-500 text-white"
                : "bg-violet-600/15 text-violet-300 hover:bg-violet-600 hover:text-white"
            }`}
          >
            {isActive && isPlaying ? (
              <PauseIcon className="h-4 w-4" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-500">
            <ListIcon className="h-4 w-4" />
          </span>
        )}

        {editing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              void saveName();
            }}
          >
            <input
              autoFocus
              value={draft}
              maxLength={100}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setDraft(playlist.name);
                  setEditing(false);
                }
              }}
              className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white focus:border-violet-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              aria-label="Save playlist name"
              className="rounded-md p-1.5 text-emerald-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Cancel rename"
              onClick={() => {
                setDraft(playlist.name);
                setEditing(false);
              }}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <Link
            href={`/playlists/${playlist.id}`}
            className="min-w-0 flex-1"
            title={playlist.name}
          >
            <p className="truncate text-sm font-medium text-white">
              {playlist.name}
            </p>
            <p className="text-xs text-slate-400">
              {songs.length} {songs.length === 1 ? "song" : "songs"}
            </p>
          </Link>
        )}

        {!editing && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              aria-label={`Rename ${playlist.name}`}
              onClick={() => {
                setDraft(playlist.name);
                setEditing(true);
              }}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${playlist.name}`}
              onClick={() => void handleDelete()}
              disabled={busy}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <ul
          ref={listRef}
          className="mt-2 max-h-44 space-y-0.5 overflow-y-auto pr-0.5"
        >
          {songs.map((song, index) => {
            const isCurrent = currentSong?.id === song.id;
            return (
              <li
                key={song.id}
                ref={isCurrent ? activeItemRef : undefined}
              >
                <button
                  type="button"
                  onClick={() => playPlaylist(playlist.id, songs, index)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                    isCurrent
                      ? "bg-violet-500/20 text-violet-100"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="flex w-4 shrink-0 items-center justify-center text-slate-500">
                    {isCurrent && isPlaying ? (
                      <EqualizerIcon className="h-3 w-3 text-violet-300" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {song.title}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">
                    {song.duration ?? ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Sidebar panel: create a playlist + list existing playlists. */
export function PlaylistPanel({ className = "" }: { className?: string }) {
  const { playlists, playlistSongs, songs, createPlaylist, notify, loading } =
    useData();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const songsByPlaylist = useMemo(() => {
    const songById = new Map(songs.map((song) => [song.id, song]));
    const grouped = new Map<string, PlaylistSong[]>();

    for (const entry of playlistSongs) {
      const list = grouped.get(entry.playlist_id) ?? [];
      list.push(entry);
      grouped.set(entry.playlist_id, list);
    }

    const result = new Map<string, Song[]>();
    for (const [playlistId, entries] of grouped) {
      entries.sort(
        (a, b) =>
          a.position - b.position || a.created_at.localeCompare(b.created_at),
      );
      result.set(
        playlistId,
        entries
          .map((entry) => songById.get(entry.song_id))
          .filter((song): song is Song => Boolean(song)),
      );
    }
    return result;
  }, [songs, playlistSongs]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      await createPlaylist(trimmed);
      setNewName("");
      notify("Playlist created.", "success");
    } catch (err) {
      notify(getErrorMessage(err, "Could not create the playlist."), "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-4 ${className}`}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Playlists
      </h2>

      <form onSubmit={handleCreate} className="mt-3 flex gap-2">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New playlist name"
          maxLength={100}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </form>

      <p className="mt-3 text-xs text-slate-500">
        Tip: drag a song card onto a playlist to add it.
      </p>

      <div className="mt-3 space-y-2">
        {loading && playlists.length === 0 && (
          <div className="space-y-2" aria-hidden="true">
            <div className="h-16 animate-pulse rounded-xl bg-slate-800/60" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-800/60" />
          </div>
        )}

        {!loading && playlists.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-800 px-3 py-6 text-center text-sm text-slate-500">
            No playlists yet. Create one above.
          </p>
        )}

        {playlists.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            songs={songsByPlaylist.get(playlist.id) ?? []}
          />
        ))}
      </div>
    </section>
  );
}

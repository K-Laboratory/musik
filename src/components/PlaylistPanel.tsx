"use client";

import { useDroppable } from "@dnd-kit/core";
import Link from "next/link";
import { useState } from "react";

import { useData } from "@/components/DataProvider";
import {
  CheckIcon,
  CloseIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { getErrorMessage } from "@/lib/errors";
import type { Playlist } from "@/lib/types";

/** A single playlist card that acts as a drop target for song cards. */
export function PlaylistCard({
  playlist,
  songCount,
}: {
  playlist: Playlist;
  songCount: number;
}) {
  const { renamePlaylist, deletePlaylist, notify } = useData();
  const { setNodeRef, isOver } = useDroppable({
    id: `playlist-${playlist.id}`,
    data: { type: "playlist", playlistId: playlist.id },
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playlist.name);
  const [busy, setBusy] = useState(false);

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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/15 text-violet-300">
          <ListIcon className="h-4 w-4" />
        </span>

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
              {songCount} {songCount === 1 ? "song" : "songs"}
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
    </div>
  );
}

/** Sidebar panel: create a playlist + list existing playlists. */
export function PlaylistPanel({ className = "" }: { className?: string }) {
  const { playlists, playlistSongs, createPlaylist, notify, loading } = useData();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

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

  const counts = new Map<string, number>();
  for (const entry of playlistSongs) {
    counts.set(entry.playlist_id, (counts.get(entry.playlist_id) ?? 0) + 1);
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
            songCount={counts.get(playlist.id) ?? 0}
          />
        ))}
      </div>
    </section>
  );
}

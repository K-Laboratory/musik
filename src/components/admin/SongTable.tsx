"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertIcon,
  CheckIcon,
  PlayIcon,
  RefreshIcon,
  SpinnerIcon,
} from "@/components/Icons";

export interface AdminSongRow {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  source: string | null;
  source_id: string | null;
  source_url: string | null;
  tags: { name: string; confidence: number; is_primary: boolean }[];
  analysis: {
    valence: number | null;
    arousal: number | null;
    needs_review: boolean;
    analyzed_at: string;
    model: string | null;
  } | null;
}

interface BatchResponse {
  processed: number;
  remaining: number;
  results: {
    songId: string;
    title: string;
    ok: boolean;
    lyricsSource?: string;
    error?: string;
  }[];
}

interface LogEntry {
  songId: string;
  title: string;
  ok: boolean;
  detail?: string;
}

const CHUNK_SIZE = 5;
const DISPLAY_TIME_ZONE = "America/Anchorage";

interface LyricsPreviewState {
  status: "idle" | "loading" | "ready" | "none" | "error";
  preview?: string;
  excerpt?: string;
  provider?: string;
  url?: string | null;
}

function LyricsPreview({ songId }: { songId: string }) {
  const [state, setState] = useState<LyricsPreviewState>({ status: "idle" });
  const started = useRef(false);

  const load = async () => {
    if (started.current) return;
    started.current = true;
    setState({ status: "loading" });

    try {
      const response = await fetch(
        `/api/admin/lyrics?songId=${encodeURIComponent(songId)}`,
      );
      if (!response.ok) {
        setState({ status: "error" });
        return;
      }
      const data = (await response.json()) as {
        available: boolean;
        provider?: string;
        url?: string | null;
        preview?: string;
        excerpt?: string;
      };
      if (!data.available || !data.preview) {
        setState({ status: "none" });
        return;
      }
      setState({
        status: "ready",
        preview: data.preview,
        excerpt: data.excerpt,
        provider: data.provider,
        url: data.url,
      });
    } catch {
      setState({ status: "error" });
    }
  };

  if (state.status === "idle") {
    return (
      <button
        type="button"
        onClick={() => void load()}
        onMouseEnter={() => void load()}
        onFocus={() => void load()}
        className="text-xs text-violet-300 transition hover:text-violet-200"
        title="Load a short lyrics preview"
      >
        Hover preview
      </button>
    );
  }

  if (state.status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <SpinnerIcon className="h-3 w-3 animate-spin" />
        Loading
      </span>
    );
  }

  if (state.status === "none") {
    return (
      <span className="text-xs text-slate-600" title="No lyrics found">
        Not found
      </span>
    );
  }

  if (state.status === "error") {
    return (
      <span className="text-xs text-slate-600" title="Lyrics lookup failed">
        Unavailable
      </span>
    );
  }

  return (
    <div
      className="max-w-[210px]"
      title={`${state.excerpt ?? state.preview ?? ""}\n\nSource: ${state.provider ?? "unknown"}`}
    >
      <p className="line-clamp-1 text-xs text-slate-300">{state.preview}</p>
      {state.url ? (
        <a
          href={state.url}
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 inline-block text-[11px] text-violet-300 hover:text-violet-200"
        >
          Full lyrics
        </a>
      ) : (
        <span className="mt-0.5 block text-[11px] text-slate-600">
          {state.provider}
        </span>
      )}
    </div>
  );
}

function AnalyzedAt({
  value,
  model,
}: {
  value: string | null;
  model: string | null;
}) {
  if (!value) {
    return <span className="text-xs text-slate-600">Not analyzed</span>;
  }

  const label = new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  });

  return (
    <time
      dateTime={value}
      title={model ? `Model: ${model}` : undefined}
      suppressHydrationWarning
      className="whitespace-nowrap text-xs text-slate-400"
    >
      {label}
    </time>
  );
}

function youTubeLink(song: AdminSongRow): { href: string; direct: boolean } {
  const direct =
    song.source_url && /youtube\.com|youtu\.be/i.test(song.source_url)
      ? song.source_url
      : song.source === "youtube" && song.source_id
        ? `https://www.youtube.com/watch?v=${encodeURIComponent(song.source_id)}`
        : null;

  return {
    href:
      direct ??
      `https://www.youtube.com/results?search_query=${encodeURIComponent(
        `${song.title} ${song.artist}`,
      )}`,
    direct: Boolean(direct),
  };
}

export function SongTable({
  songs,
  startIndex,
  pageKey,
}: {
  songs: AdminSongRow[];
  startIndex: number;
  pageKey: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState("");
  const stopRef = useRef(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const allSelected = songs.length > 0 && selected.size === songs.length;
  const someSelected = selected.size > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    setSelected(new Set());
    setLog([]);
    setSummary("");
    setProgress({ done: 0, total: 0 });
  }, [pageKey]);

  const toggleSong = (songId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(songs.map((song) => song.id)));
  };

  const run = async () => {
    if (running || selected.size === 0) return;

    const ids = [...selected];
    stopRef.current = false;
    setRunning(true);
    setStopping(false);
    setLog([]);
    setSummary("");
    setProgress({ done: 0, total: ids.length });

    let succeeded = 0;
    let failed = 0;
    let done = 0;

    try {
      for (let offset = 0; offset < ids.length; offset += CHUNK_SIZE) {
        if (stopRef.current) break;

        const chunk = ids.slice(offset, offset + CHUNK_SIZE);
        const response = await fetch("/api/admin/classify/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songIds: chunk }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          failed += chunk.length;
          setLog((current) => [
            ...current,
            {
              songId: chunk[0]!,
              title: `${chunk.length} song${chunk.length === 1 ? "" : "s"}`,
              ok: false,
              detail: payload.error ?? response.statusText,
            },
          ]);
          break;
        }

        const data = (await response.json()) as BatchResponse;
        const missing = Math.max(0, chunk.length - data.results.length);
        for (const result of data.results) {
          if (result.ok) succeeded += 1;
          else failed += 1;
          setLog((current) => [
            ...current,
            {
              songId: result.songId,
              title: result.title,
              ok: result.ok,
              detail: result.error ?? result.lyricsSource,
            },
          ]);
        }
        if (missing > 0) {
          failed += missing;
          setLog((current) => [
            ...current,
            {
              songId: chunk[0]!,
              title: `${missing} song${missing === 1 ? "" : "s"}`,
              ok: false,
              detail: "No result returned.",
            },
          ]);
        }

        done += chunk.length;
        setProgress({ done, total: ids.length });
      }

      const attempted = succeeded + failed;
      if (stopRef.current && attempted < ids.length) {
        setSummary(`Stopped after ${attempted} of ${ids.length} songs.`);
      } else if (failed > 0) {
        setSummary(`Re-classified ${succeeded} songs. ${failed} failed.`);
      } else {
        setSummary(`Re-classified ${succeeded} song${succeeded === 1 ? "" : "s"}.`);
      }

      setSelected(new Set());
      router.refresh();
    } finally {
      setRunning(false);
      setStopping(false);
    }
  };

  const requestStop = () => {
    stopRef.current = true;
    setStopping(true);
  };

  const pct =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
        <p className="text-sm text-slate-400">
          {selected.size === 0
            ? "Select songs to re-classify."
            : `${selected.size} selected. Existing tags and scores will be replaced.`}
        </p>
        <div className="flex items-center gap-2">
          {selected.size > 0 && !running && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              Clear
            </button>
          )}
          {running && (
            <button
              type="button"
              onClick={requestStop}
              disabled={stopping}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
            >
              {stopping ? "Stopping..." : "Stop"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || selected.size === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? (
              <SpinnerIcon className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshIcon className="h-4 w-4" />
            )}
            {running
              ? `Re-classifying ${progress.done}/${progress.total}`
              : "Re-classify selected"}
          </button>
        </div>
      </div>

      {running && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-violet-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={songs.length === 0 || running}
                  aria-label="Select all songs on this page"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-violet-600"
                />
              </th>
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Artist</th>
              <th className="px-4 py-2.5 font-medium">Year</th>
              <th className="px-4 py-2.5 font-medium">Emotions</th>
              <th className="px-4 py-2.5 font-medium">V / A</th>
              <th className="px-4 py-2.5 font-medium">YouTube</th>
              <th className="px-4 py-2.5 font-medium">Lyrics</th>
              <th className="px-4 py-2.5 font-medium">Analyzed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {songs.map((song, index) => {
              const isSelected = selected.has(song.id);
              const youtube = youTubeLink(song);
              return (
                <tr
                  key={song.id}
                  className={
                    isSelected ? "bg-violet-500/10" : "hover:bg-slate-900/40"
                  }
                >
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSong(song.id)}
                      disabled={running}
                      aria-label={`Select ${song.title} by ${song.artist}`}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-violet-600"
                    />
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-4 py-2 font-medium text-white">
                    {song.title}
                  </td>
                  <td className="px-4 py-2 text-slate-300">{song.artist}</td>
                  <td className="px-4 py-2 text-slate-400">
                    {song.year ?? "-"}
                  </td>
                  <td className="px-4 py-2">
                    {song.tags.length === 0 ? (
                      <span className="text-xs text-slate-600">
                        {song.analysis ? "-" : "not analyzed"}
                      </span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {song.tags.map((tag) => (
                          <span
                            key={tag.name}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              tag.is_primary
                                ? "bg-violet-600/25 text-violet-100"
                                : "bg-slate-800 text-slate-300"
                            }`}
                            title={`confidence ${tag.confidence.toFixed(2)}`}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {song.analysis?.needs_review && (
                          <span
                            className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-200"
                            title="Low confidence"
                          >
                            review
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-slate-400">
                    {song.analysis
                      ? `${song.analysis.valence?.toFixed(1) ?? "-"} / ${song.analysis.arousal?.toFixed(1) ?? "-"}`
                      : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <a
                      href={youtube.href}
                      target="_blank"
                      rel="noreferrer"
                      title={
                        youtube.direct
                          ? "Open YouTube video"
                          : "Search YouTube for this song"
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 transition hover:text-violet-200"
                    >
                      <PlayIcon className="h-3 w-3" />
                      {youtube.direct ? "Watch" : "Search"}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <LyricsPreview songId={song.id} />
                  </td>
                  <td className="px-4 py-2">
                    <AnalyzedAt
                      value={song.analysis?.analyzed_at ?? null}
                      model={song.analysis?.model ?? null}
                    />
                  </td>
                </tr>
              );
            })}
            {songs.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No songs match. Run the seed migration to load the catalog.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(summary || log.length > 0) && (
        <div
          aria-live="polite"
          className="rounded-xl border border-slate-800 bg-slate-950/60"
        >
          {summary && (
            <p className="border-b border-slate-800 px-3 py-2 text-sm text-slate-300">
              {summary}
            </p>
          )}
          {log.length > 0 && (
            <div className="max-h-48 overflow-y-auto p-3 font-mono text-xs">
              {log.map((entry, index) => (
                <div
                  key={`${entry.songId}-${index}`}
                  className="flex items-start gap-2 py-1"
                >
                  {entry.ok ? (
                    <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-slate-200">{entry.title}</p>
                    {!entry.ok && entry.detail && (
                      <p className="mt-0.5 break-words text-red-300">
                        {entry.detail}
                      </p>
                    )}
                  </div>
                  {entry.ok && entry.detail && (
                    <span className="shrink-0 text-slate-500">
                      {entry.detail}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

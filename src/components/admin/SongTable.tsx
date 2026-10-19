"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertIcon,
  CheckIcon,
  PencilIcon,
  PlayIcon,
  RefreshIcon,
  SparklesIcon,
  SpinnerIcon,
} from "@/components/Icons";
import { SongEditor } from "@/components/admin/SongEditor";
import { useAdminLabels } from "@/lib/admin-i18n";
import { useLanguage } from "@/lib/disguise";

export interface AdminSongRow {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  source: string | null;
  source_id: string | null;
  source_url: string | null;
  youtube_url: string | null;
  youtube_title: string | null;
  youtube_channel: string | null;
  lyrics_preview: string | null;
  lyrics_source: string | null;
  has_lyrics: boolean;
  tags: {
    id: string;
    name: string;
    name_vi: string | null;
    confidence: number;
    is_primary: boolean;
  }[];
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

interface EnrichResponse {
  processed: number;
  results: {
    songId: string;
    title: string;
    youtube?: {
      ok: boolean;
      skipped?: boolean;
      title?: string;
      channel?: string;
      score?: number;
      error?: string;
    };
    lyrics?: {
      ok: boolean;
      skipped?: boolean;
      provider?: string;
      chars?: number;
      error?: string;
    };
  }[];
  error?: string;
}

const CHUNK_SIZE = 5;
const ENRICH_CHUNK_SIZE = 3;
const DISPLAY_TIME_ZONE = "America/Anchorage";

function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? `{${key}}`),
  );
}

interface LyricsPreviewState {
  status: "idle" | "loading" | "ready" | "none" | "error";
  preview?: string;
  excerpt?: string;
  provider?: string;
  url?: string | null;
}

function LyricsPreview({
  songId,
  preview,
  source,
}: {
  songId: string;
  preview: string | null;
  source: string | null;
}) {
  const labels = useAdminLabels();
  const [state, setState] = useState<LyricsPreviewState>({ status: "idle" });
  const started = useRef(false);

  if (preview) {
    return (
      <div className="max-w-[210px]" title={preview}>
        <p className="line-clamp-2 text-xs text-slate-300">{preview}</p>
        <span className="mt-0.5 block text-[11px] text-slate-500">
          {source ?? labels.saved}
        </span>
      </div>
    );
  }

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
        title={labels.loadPreview}
      >
        {labels.hoverPreview}
      </button>
    );
  }

  if (state.status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <SpinnerIcon className="h-3 w-3 animate-spin" />
        {labels.loading}
      </span>
    );
  }

  if (state.status === "none") {
    return (
      <span className="text-xs text-slate-600" title="No lyrics found">
        {labels.notFound}
      </span>
    );
  }

  if (state.status === "error") {
    return (
      <span className="text-xs text-slate-600" title={labels.lyricsLookupFailed}>
        {labels.unavailable}
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
          {labels.fullLyrics}
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
  const labels = useAdminLabels();
  const { language } = useLanguage();
  if (!value) {
    return <span className="text-xs text-slate-600">{labels.notAnalyzed}</span>;
  }

  const label = new Date(value).toLocaleString(
    language === "vi" ? "vi-VN" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: DISPLAY_TIME_ZONE,
    },
  );

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
    song.youtube_url ??
    (song.source_url && /youtube\.com|youtu\.be/i.test(song.source_url)
      ? song.source_url
      : song.source === "youtube" && song.source_id
        ? `https://www.youtube.com/watch?v=${encodeURIComponent(song.source_id)}`
        : null);

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
  const labels = useAdminLabels();
  const { language } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState("");
  const [editing, setEditing] = useState<AdminSongRow | null>(null);
  const stopRef = useRef(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const busy = running || enriching;
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
    setEditing(null);
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
    if (busy || selected.size === 0) return;

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
              detail: labels.noResultReturned,
            },
          ]);
        }

        done += chunk.length;
        setProgress({ done, total: ids.length });
      }

      const attempted = succeeded + failed;
      if (stopRef.current && attempted < ids.length) {
        setSummary(
          fill(labels.stoppedSummary, {
            done: attempted,
            total: ids.length,
          }),
        );
      } else if (failed > 0) {
        setSummary(
          fill(labels.reclassifiedSummary, {
            count: succeeded,
            failed,
          }),
        );
      } else {
        setSummary(
          fill(labels.reclassifiedSummary, {
            count: succeeded,
            failed: 0,
          }),
        );
      }

      setSelected(new Set());
      router.refresh();
    } finally {
      setRunning(false);
      setStopping(false);
    }
  };

  const runEnrich = async () => {
    if (busy || selected.size === 0) return;

    const ids = [...selected];
    stopRef.current = false;
    setEnriching(true);
    setStopping(false);
    setLog([]);
    setSummary("");
    setProgress({ done: 0, total: ids.length });

    let updated = 0;
    let partial = 0;
    let skipped = 0;
    let failed = 0;
    let done = 0;

    try {
      for (let offset = 0; offset < ids.length; offset += ENRICH_CHUNK_SIZE) {
        if (stopRef.current) break;

        const chunk = ids.slice(offset, offset + ENRICH_CHUNK_SIZE);
        const response = await fetch("/api/admin/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songIds: chunk, kind: "both" }),
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

        const data = (await response.json()) as EnrichResponse;
        for (const result of data.results) {
          const parts: string[] = [];
          let songFailed = false;
          let changed = false;

          if (result.youtube) {
            if (result.youtube.skipped) {
              parts.push(labels.youtubeAlreadySet);
            } else if (result.youtube.ok) {
              changed = true;
              parts.push(
                `YouTube: ${result.youtube.title ?? "match"}${result.youtube.score ? ` (${result.youtube.score})` : ""}`,
              );
            } else {
              songFailed = true;
              parts.push(`YouTube: ${result.youtube.error ?? labels.autoFillFailed}`);
            }
          }

          if (result.lyrics) {
            if (result.lyrics.skipped) {
              parts.push(labels.lyricsAlreadySet);
            } else if (result.lyrics.ok) {
              changed = true;
              parts.push(
                `Lyrics: ${result.lyrics.provider ?? "found"} (${result.lyrics.chars ?? 0} chars)`,
              );
            } else {
              songFailed = true;
              parts.push(`Lyrics: ${result.lyrics.error ?? labels.autoFillFailed}`);
            }
          }

          if (changed) {
            updated += 1;
            if (songFailed) partial += 1;
          } else if (songFailed) {
            failed += 1;
          } else {
            skipped += 1;
          }

          setLog((current) => [
            ...current,
            {
              songId: result.songId,
              title: result.title,
              ok: changed || !songFailed,
              detail: parts.join("; "),
            },
          ]);
        }

        done += chunk.length;
        setProgress({ done, total: ids.length });
      }

      const attempted = updated + skipped + failed;
      if (stopRef.current && attempted < ids.length) {
        setSummary(
          fill(labels.stoppedSummary, {
            done: attempted,
            total: ids.length,
          }),
        );
      } else {
        setSummary(
          fill(labels.autoFilledSummary, {
            updated,
            partial,
            skipped,
            failed,
          }),
        );
      }

      setSelected(new Set());
      router.refresh();
    } finally {
      setEnriching(false);
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
            ? labels.selectSongs
            : fill(labels.selected, { count: selected.size })}
        </p>
        <div className="flex items-center gap-2">
          {selected.size > 0 && !busy && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              {labels.clear}
            </button>
          )}
          {busy && (
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
            onClick={() => void runEnrich()}
            disabled={busy || selected.size === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enriching ? (
              <SpinnerIcon className="h-4 w-4 animate-spin" />
            ) : (
              <SparklesIcon className="h-4 w-4" />
            )}
            {enriching
              ? fill(labels.autoFilling, {
                  done: progress.done,
                  total: progress.total,
                })
              : labels.autoFillSelected}
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy || selected.size === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? (
              <SpinnerIcon className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshIcon className="h-4 w-4" />
            )}
            {running
              ? fill(labels.reclassifying, {
                  done: progress.done,
                  total: progress.total,
                })
              : labels.reclassifySelected}
          </button>
        </div>
      </div>

      {busy && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-violet-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full min-w-[1260px] text-left text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={songs.length === 0 || busy}
                  aria-label={labels.selectAll}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-violet-600"
                />
              </th>
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">{labels.colTitle}</th>
              <th className="px-4 py-2.5 font-medium">{labels.colArtist}</th>
              <th className="px-4 py-2.5 font-medium">{labels.colYear}</th>
              <th className="px-4 py-2.5 font-medium">{labels.colEmotions}</th>
              <th className="px-4 py-2.5 font-medium">{labels.colVA}</th>
              <th className="px-4 py-2.5 font-medium">{labels.colYouTube}</th>
              <th className="px-4 py-2.5 font-medium">{labels.colLyrics}</th>
              <th className="px-4 py-2.5 font-medium">{labels.colAnalyzed}</th>
              <th className="px-4 py-2.5 font-medium">{labels.colEdit}</th>
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
                      disabled={busy}
                      aria-label={fill(labels.selectSong, {
                        title: song.title,
                        artist: song.artist,
                      })}
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
                        {song.analysis ? "-" : labels.notAnalyzed}
                      </span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {song.tags.map((tag) => {
                          const tagLabel =
                            language === "vi" && tag.name_vi
                              ? tag.name_vi
                              : tag.name;
                          return (
                          <span
                            key={tag.id}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              tag.is_primary
                                ? "bg-violet-600/25 text-violet-100"
                                : "bg-slate-800 text-slate-300"
                            }`}
                            title={`confidence ${tag.confidence.toFixed(2)}`}
                          >
                            {tagLabel}
                          </span>
                          );
                        })}
                        {song.analysis?.needs_review && (
                          <span
                            className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-200"
                            title={labels.lowConfidence}
                          >
                            {labels.review}
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
                        song.youtube_title
                          ? `${song.youtube_title}${song.youtube_channel ? ` - ${song.youtube_channel}` : ""}`
                          : youtube.direct
                            ? labels.openYouTube
                          : labels.searchYouTube
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 transition hover:text-violet-200"
                    >
                      <PlayIcon className="h-3 w-3" />
                      {youtube.direct ? labels.watch : labels.search}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <LyricsPreview
                      songId={song.id}
                      preview={song.lyrics_preview}
                      source={song.lyrics_source}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <AnalyzedAt
                      value={song.analysis?.analyzed_at ?? null}
                      model={song.analysis?.model ?? null}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setEditing(song)}
                      aria-label={fill(labels.editSong, { title: song.title })}
                      title={labels.editYoutubeLyrics}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {songs.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  {labels.noSongs}
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

      {editing && (
        <SongEditor
          song={editing}
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

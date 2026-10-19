"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AlertIcon,
  CloseIcon,
  RefreshIcon,
  SpinnerIcon,
} from "@/components/Icons";
import { useAdminLabels } from "@/lib/admin-i18n";

interface SongDetails {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
  youtube_title: string | null;
  youtube_channel: string | null;
  youtube_updated_at: string | null;
  lyrics_text: string | null;
  lyrics_source: string | null;
  lyrics_source_url: string | null;
  lyrics_updated_at: string | null;
}

interface EnrichResponse {
  results?: {
    youtube?: { ok: boolean; skipped?: boolean; title?: string; error?: string };
    lyrics?: { ok: boolean; skipped?: boolean; provider?: string; chars?: number; error?: string };
  }[];
  error?: string;
}

export function SongEditor({
  song,
  onClose,
}: {
  song: { id: string; title: string; artist: string; year: number | null };
  onClose: () => void;
}) {
  const labels = useAdminLabels();
  const [details, setDetails] = useState<SongDetails | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [lyricsText, setLyricsText] = useState("");
  const [lyricsSourceUrl, setLyricsSourceUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finding, setFinding] = useState<"youtube" | "lyrics" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/songs/${song.id}`);
      const data = (await response.json()) as {
        song?: SongDetails;
        error?: string;
      };
      if (!response.ok || !data.song) {
        setError(data.error ?? labels.couldNotLoad);
        return;
      }
      setDetails(data.song);
      setYoutubeUrl(data.song.youtube_url ?? "");
      setLyricsText(data.song.lyrics_text ?? "");
      setLyricsSourceUrl(data.song.lyrics_source_url ?? "");
    } catch {
      setError(labels.couldNotLoad);
    } finally {
      setLoading(false);
    }
  }, [song.id, labels]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload: Record<string, unknown> = {};
      if (youtubeUrl !== (details?.youtube_url ?? "")) {
        payload.youtubeUrl = youtubeUrl;
      }
      if (
        lyricsText !== (details?.lyrics_text ?? "") ||
        lyricsSourceUrl !== (details?.lyrics_source_url ?? "")
      ) {
        payload.lyricsText = lyricsText;
        payload.lyricsSourceUrl = lyricsSourceUrl;
        payload.lyricsSource =
          lyricsText === (details?.lyrics_text ?? "")
            ? details?.lyrics_source ?? "manual"
            : "manual";
      }

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      const response = await fetch(`/api/admin/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? labels.couldNotSave);
        return;
      }
      onClose();
    } catch {
      setError(labels.couldNotSave);
    } finally {
      setSaving(false);
    }
  };

  const autoFind = async (kind: "youtube" | "lyrics") => {
    setFinding(kind);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songIds: [song.id],
          kind,
          overwrite: true,
        }),
      });
      const data = (await response.json()) as EnrichResponse;
      if (!response.ok) {
        setError(data.error ?? labels.autoLookupFailed);
        return;
      }

      const item = data.results?.[0];
      const messages: string[] = [];
      if (item?.youtube) {
        if (item.youtube.ok && !item.youtube.skipped) {
          messages.push(`YouTube: ${item.youtube.title ?? "match found"}`);
        } else if (item.youtube.error) {
          messages.push(`YouTube: ${item.youtube.error}`);
        }
      }
      if (item?.lyrics) {
        if (item.lyrics.ok && !item.lyrics.skipped) {
          messages.push(
            `Lyrics: ${item.lyrics.provider ?? "found"} (${item.lyrics.chars ?? 0} chars)`,
          );
        } else if (item.lyrics.error) {
          messages.push(`Lyrics: ${item.lyrics.error}`);
        }
      }
      setNotice(messages.join("; ") || labels.noNewData);
      await load();
    } catch {
      setError(labels.autoLookupFailed);
    } finally {
      setFinding(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="song-editor-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {labels.editCatalogSong}
            </p>
            <h2
              id="song-editor-title"
              className="mt-1 text-lg font-semibold text-white"
            >
              {song.title}
            </h2>
            <p className="text-sm text-slate-400">
              {song.artist}
              {song.year ? ` - ${song.year}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.closeEditor}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <SpinnerIcon className="h-4 w-4 animate-spin" />
            {labels.loadingDetails}
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="song-youtube-url"
                  className="text-sm font-medium text-slate-200"
                >
                  {labels.youtubeUrl}
                </label>
                <button
                  type="button"
                  onClick={() => void autoFind("youtube")}
                  disabled={finding !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {finding === "youtube" ? (
                    <SpinnerIcon className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshIcon className="h-3 w-3" />
                  )}
                  {labels.findBestMatch}
                </button>
              </div>
              <input
                id="song-youtube-url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
              />
              {details?.youtube_title && (
                <p className="text-xs text-slate-500">
                  {labels.matched}: {details.youtube_title}
                  {details.youtube_channel
                    ? ` - ${details.youtube_channel}`
                    : ""}
                </p>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="song-lyrics"
                  className="text-sm font-medium text-slate-200"
                >
                  {labels.lyrics}
                </label>
                <button
                  type="button"
                  onClick={() => void autoFind("lyrics")}
                  disabled={finding !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {finding === "lyrics" ? (
                    <SpinnerIcon className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshIcon className="h-3 w-3" />
                  )}
                  {labels.findLyrics}
                </button>
              </div>
              <textarea
                id="song-lyrics"
                value={lyricsText}
                onChange={(event) => setLyricsText(event.target.value)}
                rows={14}
                placeholder={labels.lyricsPlaceholder}
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-sans text-sm leading-relaxed text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {details?.lyrics_source
                    ? `${labels.source}: ${details.lyrics_source}`
                    : labels.noSavedLyrics}
                </span>
                <span>
                  {labels.characters.replace(
                    "{count}",
                    String(lyricsText.trim().length),
                  )}
                </span>
              </div>
              <input
                value={lyricsSourceUrl}
                onChange={(event) => setLyricsSourceUrl(event.target.value)}
                placeholder={labels.lyricsSourceUrl}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
              />
            </section>

            {(error || notice) && (
              <div
                role={error ? "alert" : "status"}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  error
                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {error && <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{error || notice}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {saving && <SpinnerIcon className="h-4 w-4 animate-spin" />}
                {saving ? labels.saving : labels.saveChanges}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

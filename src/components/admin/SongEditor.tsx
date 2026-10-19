"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AlertIcon,
  CloseIcon,
  RefreshIcon,
  SpinnerIcon,
} from "@/components/Icons";
import { useAdminLabels } from "@/lib/admin-i18n";
import { useLanguage } from "@/lib/disguise";

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

interface AnalysisDetails {
  valence: number | null;
  arousal: number | null;
  quadrant: string | null;
  needs_review: boolean;
  rationale: string | null;
  model: string | null;
  analyzed_at: string;
}

interface TagDetails {
  id: string;
  name: string;
  name_vi: string | null;
  confidence: number;
  is_primary: boolean;
}

interface EmotionOption {
  id: string;
  name: string;
  name_vi: string | null;
}

interface EditorResponse {
  song?: SongDetails;
  analysis?: AnalysisDetails | null;
  tags?: TagDetails[];
  emotions?: EmotionOption[];
  error?: string;
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
  const { language } = useLanguage();
  const [details, setDetails] = useState<SongDetails | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisDetails | null>(null);
  const [emotions, setEmotions] = useState<EmotionOption[]>([]);
  const [tags, setTags] = useState<TagDetails[]>([]);
  const [valence, setValence] = useState("0");
  const [arousal, setArousal] = useState("0");
  const [needsReview, setNeedsReview] = useState(false);
  const [classificationTouched, setClassificationTouched] = useState(false);
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
      const data = (await response.json()) as EditorResponse;
      if (!response.ok || !data.song) {
        setError(data.error ?? labels.couldNotLoad);
        return;
      }
      setDetails(data.song);
      setYoutubeUrl(data.song.youtube_url ?? "");
      setLyricsText(data.song.lyrics_text ?? "");
      setLyricsSourceUrl(data.song.lyrics_source_url ?? "");
      setAnalysis(data.analysis ?? null);
      setEmotions(data.emotions ?? []);
      setTags(data.tags ?? []);
      setValence(String(data.analysis?.valence ?? 0));
      setArousal(String(data.analysis?.arousal ?? 0));
      setNeedsReview(data.analysis?.needs_review ?? false);
      setClassificationTouched(false);
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

  const toggleTag = (id: string) => {
    setClassificationTouched(true);
    setTags((current) => {
      const existing = current.find((tag) => tag.id === id);
      let next = existing
        ? current.filter((tag) => tag.id !== id)
        : [
            ...current,
            {
              id,
              name: emotions.find((emotion) => emotion.id === id)?.name ?? id,
              name_vi:
                emotions.find((emotion) => emotion.id === id)?.name_vi ?? null,
              confidence: 0.7,
              is_primary: current.length === 0,
            },
          ];
      if (next.length > 0 && !next.some((tag) => tag.is_primary)) {
        next = next.map((tag, index) => ({
          ...tag,
          is_primary: index === 0,
        }));
      }
      return next;
    });
  };

  const setPrimary = (id: string) => {
    setClassificationTouched(true);
    setTags((current) =>
      current.map((tag) => ({ ...tag, is_primary: tag.id === id })),
    );
  };

  const setConfidence = (id: string, value: number) => {
    setClassificationTouched(true);
    setTags((current) =>
      current.map((tag) =>
        tag.id === id
          ? {
              ...tag,
              confidence: Math.max(0, Math.min(1, value)),
            }
          : tag,
      ),
    );
  };

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
      if (classificationTouched) {
        const numericValence = Number(valence);
        const numericArousal = Number(arousal);
        if (
          !Number.isFinite(numericValence) ||
          !Number.isFinite(numericArousal) ||
          numericValence < -2 ||
          numericValence > 2 ||
          numericArousal < -2 ||
          numericArousal > 2
        ) {
          setError(labels.invalidClassification);
          return;
        }
        if (tags.length === 0) {
          setError(labels.classificationRequired);
          return;
        }
        payload.classification = {
          valence: numericValence,
          arousal: numericArousal,
          needs_review: needsReview,
          rationale: analysis?.rationale ?? "Manual edit",
          tags: tags.map((tag) => ({
            id: tag.id,
            confidence: tag.confidence,
            is_primary: tag.is_primary,
          })),
        };
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

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-slate-200">
                  {labels.classification}
                </h3>
                {analysis?.model && (
                  <span className="text-[11px] text-slate-500">
                    {analysis.model}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-slate-400">
                  {labels.valence}
                  <input
                    type="number"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={valence}
                    onChange={(event) => {
                      setClassificationTouched(true);
                      setValence(event.target.value);
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  {labels.arousal}
                  <input
                    type="number"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={arousal}
                    onChange={(event) => {
                      setClassificationTouched(true);
                      setArousal(event.target.value);
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={needsReview}
                  onChange={(event) => {
                    setClassificationTouched(true);
                    setNeedsReview(event.target.checked);
                  }}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-violet-600"
                />
                {labels.needsReview}
              </label>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950">
                {emotions.map((emotion) => {
                  const tag = tags.find((item) => item.id === emotion.id);
                  const name =
                    language === "vi"
                      ? emotion.name_vi ?? emotion.name
                      : emotion.name;
                  return (
                    <div
                      key={emotion.id}
                      className="flex items-center gap-2 border-b border-slate-800 px-2.5 py-1.5 text-xs last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(tag)}
                        onChange={() => toggleTag(emotion.id)}
                        disabled={!tag && tags.length >= 3}
                        title={!tag && tags.length >= 3 ? labels.maxTags : name}
                        className="h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 accent-violet-600 disabled:opacity-40"
                        aria-label={name}
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-300">
                        {name}
                      </span>
                      {tag && (
                        <>
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.05}
                            value={tag.confidence}
                            onChange={(event) =>
                              setConfidence(
                                emotion.id,
                                Number(event.target.value),
                              )
                            }
                            title={labels.confidence}
                            aria-label={`${labels.confidence}: ${name}`}
                            className="w-16 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-1 text-center text-xs text-white focus:border-violet-500 focus:outline-none"
                          />
                          <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
                            <input
                              type="radio"
                              name="primary-emotion"
                              checked={tag.is_primary}
                              onChange={() => setPrimary(emotion.id)}
                              className="accent-violet-600"
                            />
                            {labels.primaryTag}
                          </label>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
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

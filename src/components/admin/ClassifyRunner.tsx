"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Status {
  configured: boolean;
  total: number;
  analyzed: number;
  pending: number;
}

interface BatchResult {
  processed: number;
  remaining: number;
  results: {
    songId: string;
    title: string;
    ok: boolean;
    hadLyrics?: boolean;
    error?: string;
  }[];
}

/**
 * Bulk-classification runner. Drives /api/admin/classify/batch in a loop,
 * showing live progress. Lyrics are fetched transiently server-side and never
 * stored.
 */
export function ClassifyRunner() {
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const stopRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    const res = await fetch("/api/admin/classify");
    if (res.ok) setStatus((await res.json()) as Status);
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    stopRef.current = false;
    setLog([]);

    try {
      for (;;) {
        if (stopRef.current) {
          setLog((l) => [...l, "Stopped by user."]);
          break;
        }
        const res = await fetch("/api/admin/classify/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 5, onlyPending: true }),
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          setLog((l) => [...l, `Error: ${payload.error ?? res.statusText}`]);
          break;
        }
        const data = (await res.json()) as BatchResult;
        setStatus((s) =>
          s ? { ...s, analyzed: s.total - data.remaining, pending: data.remaining } : s,
        );
        for (const item of data.results) {
          setLog((l) => [
            ...l,
            `${item.ok ? "✓" : "✗"} ${item.title}${item.hadLyrics === false ? " (no lyrics)" : ""}${item.error ? ` — ${item.error}` : ""}`,
          ]);
        }
        if (data.processed === 0 || data.remaining === 0) break;
      }
    } finally {
      setRunning(false);
      void refreshStatus();
    }
  }, [running, refreshStatus]);

  const pct = status && status.total > 0
    ? Math.round((status.analyzed / status.total) * 100)
    : 0;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Classification pipeline
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {status
              ? `${status.analyzed} / ${status.total} analyzed · ${status.pending} pending`
              : "Loading status…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              stopRef.current = true;
            }}
            disabled={!running}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          >
            Stop
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || !status?.configured || status?.pending === 0}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "Classifying…" : "Classify pending songs"}
          </button>
        </div>
      </div>

      {status && !status.configured && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Set <code>OPENAI_API_KEY</code> (and optionally{" "}
          <code>CLASSIFIER_MODEL</code>) to enable classification.
        </p>
      )}

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full bg-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {log.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 font-mono text-xs text-slate-300">
          {log.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

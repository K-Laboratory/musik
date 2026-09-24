"use client";

import { useData } from "@/components/DataProvider";
import { AlertIcon, CheckIcon, CloseIcon } from "@/components/Icons";

export function Toasts() {
  const { toasts, dismissToast } = useData();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
            toast.kind === "error"
              ? "border-red-500/40 bg-red-950/80 text-red-100"
              : toast.kind === "success"
                ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-100"
                : "border-slate-700 bg-slate-900/90 text-slate-100"
          }`}
        >
          <span className="mt-0.5 shrink-0">
            {toast.kind === "error" ? (
              <AlertIcon className="h-4 w-4" />
            ) : (
              <CheckIcon className="h-4 w-4" />
            )}
          </span>
          <p className="flex-1 leading-snug">{toast.message}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

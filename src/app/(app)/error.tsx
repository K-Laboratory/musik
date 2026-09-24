"use client";

import { useEffect } from "react";

import { AlertIcon } from "@/components/Icons";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-12 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
        <AlertIcon className="h-6 w-6" />
      </span>
      <h1 className="text-lg font-semibold text-white">
        Something went wrong
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        We couldn&apos;t load this page. This is usually temporary.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
      >
        Try again
      </button>
    </div>
  );
}

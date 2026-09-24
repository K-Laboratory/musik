import { AlertIcon } from "@/components/Icons";

/**
 * Shown when the Supabase environment variables are missing, so a fresh clone
 * gives a helpful message instead of a blank error page.
 */
export function SetupNotice() {
  return (
    <div className="w-full max-w-xl rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
          <AlertIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-white">
            Almost there - configuration needed
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            This app needs a Supabase project before it can run. Create a{" "}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
              .env.local
            </code>{" "}
            file in the project root (copy{" "}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
              .env.local.example
            </code>
            ) and fill in:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_URL
              </code>
            </li>
            <li>
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>
            </li>
            <li>
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">
                YOUTUBE_API_KEY
              </code>
            </li>
          </ul>
          <p className="mt-4 text-sm text-slate-400">
            Then restart the dev server. The{" "}
            <span className="text-slate-200">README.md</span> walks through
            every step.
          </p>
        </div>
      </div>
    </div>
  );
}

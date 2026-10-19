"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { SpinnerIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";

export function PasswordLogin({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign-in failed. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-800" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Email and password
        </span>
        <span className="h-px flex-1 bg-slate-800" />
      </div>

      <label className="block text-sm font-medium text-slate-300">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
        />
      </label>

      <label className="block text-sm font-medium text-slate-300">
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !email.trim() || !password}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && <SpinnerIcon className="h-4 w-4 animate-spin" />}
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

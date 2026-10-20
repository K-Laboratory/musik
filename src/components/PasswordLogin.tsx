"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { SpinnerIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";
import { useLabels } from "@/lib/disguise";

export function PasswordLogin({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const labels = useLabels();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();
      if (mode === "sign-up") {
        if (password !== confirmPassword) {
          setError(labels.passwordMismatchError);
          return;
        }

        const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setNotice(labels.confirmEmailNotice);
        }
        return;
      }

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
          {labels.emailPasswordHeading}
        </span>
        <span className="h-px flex-1 bg-slate-800" />
      </div>

      <label className="block text-sm font-medium text-slate-300">
        {labels.emailLabel}
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
        {labels.passwordLabel}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          minLength={mode === "sign-up" ? 8 : undefined}
          required
          className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
        />
      </label>

      {mode === "sign-up" && (
        <label className="block text-sm font-medium text-slate-300">
          {labels.confirmPasswordLabel}
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
          />
        </label>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !email.trim() || !password || (mode === "sign-up" && !confirmPassword)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && <SpinnerIcon className="h-4 w-4 animate-spin" />}
        {pending
          ? mode === "sign-up"
            ? labels.creatingAccountAction
            : labels.signingInAction
          : mode === "sign-up"
            ? labels.createAccountAction
            : labels.signInAction}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError(null);
          setNotice(null);
        }}
        className="w-full py-1 text-sm font-medium text-violet-300 transition hover:text-violet-200 disabled:opacity-60"
      >
        {mode === "sign-in" ? labels.switchToSignUp : labels.switchToSignIn}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { OAUTH_PROVIDERS, type OAuthProviderConfig } from "@/lib/oauth";
import { FacebookIcon, GitHubIcon, GoogleIcon, SpinnerIcon } from "./Icons";

function ProviderIcon({
  icon,
  className,
}: {
  icon: OAuthProviderConfig["icon"];
  className?: string;
}) {
  if (icon === "google") return <GoogleIcon className={className} />;
  if (icon === "facebook") return <FacebookIcon className={className} />;
  return <GitHubIcon className={className} />;
}

export function OAuthButtons({ next = "/dashboard" }: { next?: string }) {
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(provider: OAuthProviderConfig) {
    setPendingProvider(provider.id);
    setError(null);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        next,
      )}`;
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: provider.id,
        options: { redirectTo },
      });
      if (signInError) throw signInError;
      // On success the browser is redirected to the provider.
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign-in failed. Please try again.",
      );
      setPendingProvider(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {OAUTH_PROVIDERS.map((provider) => {
        const isPending = pendingProvider === provider.id;
        const isDisabled = pendingProvider !== null;
        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => void handleSignIn(provider)}
            disabled={isDisabled}
            className={`flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${provider.className}`}
          >
            {isPending ? (
              <SpinnerIcon className="h-5 w-5 animate-spin" />
            ) : (
              <ProviderIcon icon={provider.icon} className="h-5 w-5" />
            )}
            <span>
              {isPending
                ? `Connecting to ${provider.label}...`
                : `Sign in with ${provider.label}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

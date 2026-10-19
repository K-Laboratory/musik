import { redirect } from "next/navigation";

import { LoginBrand, LoginFooter } from "@/components/LoginBrand";
import { LanguageToggle } from "@/components/LanguageToggle";
import { OAuthButtons } from "@/components/OAuthButtons";
import { PasswordLogin } from "@/components/PasswordLogin";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/url";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "We couldn't complete the sign-in. Please try again.",
  oauth:
    "The provider rejected the sign-in. Make sure the OAuth provider is enabled in Supabase.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <SetupNotice />
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const nextPath = safeRedirectPath(params.next ?? null);
  const errorMessage = params.error
    ? (ERROR_MESSAGES[params.error] ?? ERROR_MESSAGES.auth)
    : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute right-4 top-4 z-10">
        <LanguageToggle />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
      />

      <div className="relative w-full max-w-md animate-slide-up rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
        <LoginBrand />

        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {errorMessage}
          </p>
        )}

        <OAuthButtons next={nextPath} />

        <div className="mt-6">
          <PasswordLogin next={nextPath} />
        </div>

        <LoginFooter />
      </div>
    </main>
  );
}

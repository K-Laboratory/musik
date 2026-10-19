import Link from "next/link";

import { LanguageToggle } from "@/components/LanguageToggle";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AdminText } from "@/lib/admin-i18n";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const ADMIN_NAV = [
  { href: "/admin", key: "navOverview" as const },
  { href: "/admin/songs", key: "navSongs" as const },
  { href: "/admin/taxonomy", key: "navTaxonomy" as const },
  { href: "/admin/generations", key: "navGenerations" as const },
];

/**
 * Admin shell. Non-admins (and unauthenticated visitors) get a 403 notice
 * rather than a redirect loop; the middleware already forces login.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-slate-400">
          Configure Supabase to use the admin area.
        </p>
      </main>
    );
  }

  const admin = await isCurrentUserAdmin();
  if (!admin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-lg font-semibold text-white">
          <AdminText k="adminsOnly" />
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          <AdminText k="adminsOnlyHint" />
        </p>
        <Link
          href="/dashboard"
          className="mt-5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
        >
          <AdminText k="backToApp" />
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="text-sm font-semibold text-white">
            Emotion Admin
          </Link>
          <nav className="flex items-center gap-1">
            {ADMIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <AdminText k={item.key} />
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <LanguageToggle compact />
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            <AdminText k="exitAdmin" />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

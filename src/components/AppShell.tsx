"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { NowPlayingBar } from "@/components/NowPlayingBar";
import { useData } from "@/components/DataProvider";
import { Toasts } from "@/components/Toasts";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { usePlayer } from "@/lib/player";
import { CloseIcon, ListIcon, LogoutIcon, MenuIcon, MusicIcon } from "./Icons";

const NAV_ITEMS = [{ href: "/dashboard", label: "Dashboard", icon: ListIcon }];

function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Avatar image. OAuth providers serve avatars from domains we can't predict, so
 * we use a plain <img> instead of next/image to avoid runtime domain errors.
 */
function Avatar({
  src,
  name,
  size = 32,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full border border-slate-700 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-slate-800 font-semibold text-slate-200"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initialsFor(name)}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, user } = useData();
  const { currentSong } = usePlayer();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName =
    profile?.display_name || user.email?.split("@")[0] || "Music lover";
  const avatarUrl = profile?.avatar_url ?? null;

  const navLinks = (
    <nav className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-violet-600/20 text-violet-200"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300">
              <MusicIcon className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold tracking-tight text-white">
              Favorite Songs
            </span>
          </Link>

          <div className="hidden sm:block">{navLinks}</div>

          <div className="hidden items-center gap-3 sm:flex">
            <ViewModeToggle />
            <div className="flex items-center gap-2.5">
              <Avatar src={avatarUrl} name={displayName} size={32} />
              <span className="max-w-[10rem] truncate text-sm text-slate-300">
                {displayName}
              </span>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
              >
                <LogoutIcon className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 sm:hidden"
          >
            {menuOpen ? (
              <CloseIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="animate-fade-in border-t border-slate-800 bg-slate-950 px-4 py-4 sm:hidden">
            <div className="mb-3 flex items-center gap-3">
              <Avatar src={avatarUrl} name={displayName} size={36} />
              <span className="truncate text-sm text-slate-300">
                {displayName}
              </span>
            </div>
            {navLinks}
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                View mode
              </span>
              <ViewModeToggle />
            </div>
            <form action="/auth/signout" method="post" className="mt-3">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <LogoutIcon className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        )}
      </header>

      <main
        className={`mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 ${
          currentSong ? "pb-28 sm:pb-32" : ""
        }`}
      >
        {children}
      </main>

      <Toasts />
      <NowPlayingBar />
    </div>
  );
}

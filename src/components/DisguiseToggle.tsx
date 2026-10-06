"use client";

import { BriefcaseIcon, MusicIcon } from "@/components/Icons";
import { useDisguise } from "@/lib/disguise";

/**
 * Flips the app between the music theme and the classic "work" disguise.
 *
 * Also toggled with Ctrl/Cmd + Shift + X (Ctrl+Shift+W would close the tab).
 */
export function DisguiseToggle({ className = "" }: { className?: string }) {
  const { isWork, toggle } = useDisguise();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isWork}
      title={
        isWork
          ? "Switch back to music view (Ctrl+Shift+X)"
          : "Work view (Ctrl+Shift+X)"
      }
      className={`flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white ${className}`}
    >
      {isWork ? (
        <MusicIcon className="h-4 w-4" />
      ) : (
        <BriefcaseIcon className="h-4 w-4" />
      )}
      <span className="hidden xl:inline">{isWork ? "Music" : "Work"}</span>
    </button>
  );
}

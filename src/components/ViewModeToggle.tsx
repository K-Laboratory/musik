"use client";

import { GridIcon, RowsIcon } from "@/components/Icons";
import { useLabels } from "@/lib/disguise";
import { useViewMode, type ViewMode } from "@/lib/view-mode";

const OPTIONS: {
  value: ViewMode;
  icon: typeof GridIcon;
}[] = [
  { value: "normal", icon: GridIcon },
  { value: "compact", icon: RowsIcon },
];

/**
 * Segmented control to switch between the normal (thumbnail) view and the
 * compact (single-line, audio-only) view.
 */
export function ViewModeToggle({ className = "" }: { className?: string }) {
  const { mode, setMode } = useViewMode();
  const labels = useLabels();

  return (
    <div
      role="group"
      aria-label={labels.viewMode}
      className={`flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5 ${className}`}
    >
      {OPTIONS.map((option) => {
        const isActive = mode === option.value;
        const Icon = option.icon;
        const label =
          option.value === "normal" ? labels.normalView : labels.compactView;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            aria-pressed={isActive}
            title={label}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
              isActive
                ? "bg-violet-600/25 text-violet-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden xl:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

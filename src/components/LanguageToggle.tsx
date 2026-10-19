"use client";

import { useLanguage, useLabels } from "@/lib/disguise";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const labels = useLabels();

  const choose = (code: "en" | "vi") => {
    setLanguage(code);
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(
      `/api/language?language=${code}&next=${encodeURIComponent(next)}`,
    );
  };

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5 ${
        compact ? "text-[11px]" : "text-xs"
      }`}
      role="group"
      aria-label={labels.language}
    >
      {(["en", "vi"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-pressed={language === code}
          className={`rounded-md px-2 py-1 font-medium transition ${
            language === code
              ? "bg-violet-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

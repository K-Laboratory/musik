"use client";

import { useEffect, useState } from "react";

import type { Database } from "@/lib/database.types";
import { useLanguage } from "@/lib/disguise";

type Campaign = Database["public"]["Tables"]["seasonal_campaigns"]["Row"];

export function SeasonalBanner() {
  const { language } = useLanguage();
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/season", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ campaign?: Campaign | null }> : null)
      .then((payload) => { if (!cancelled) setCampaign(payload?.campaign ?? null); })
      .catch(() => { if (!cancelled) setCampaign(null); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (campaign) {
      root.dataset.season = campaign.id;
      root.style.setProperty("--season-accent", campaign.accent_color);
    } else {
      delete root.dataset.season;
      root.style.removeProperty("--season-accent");
    }
    return () => {
      delete root.dataset.season;
      root.style.removeProperty("--season-accent");
    };
  }, [campaign]);

  if (!campaign) return null;
  const english = language === "en";
  return <aside className="seasonal-banner mx-auto mb-5 flex w-full max-w-7xl items-center gap-3 rounded-xl border px-4 py-3 sm:px-5" style={{ borderColor: campaign.accent_color, "--season-accent": campaign.accent_color } as React.CSSProperties}>
    <span className="text-2xl" aria-hidden="true">{campaign.emoji}</span>
    <div className="min-w-0"><p className="text-sm font-semibold text-white">{english ? campaign.headline_en : campaign.headline_vi}</p>{(english ? campaign.message_en : campaign.message_vi) && <p className="mt-0.5 text-xs text-slate-300">{english ? campaign.message_en : campaign.message_vi}</p>}</div>
  </aside>;
}

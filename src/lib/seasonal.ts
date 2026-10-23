import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type SeasonalCampaign = Database["public"]["Tables"]["seasonal_campaigns"]["Row"];
export type SeasonalSettings = Database["public"]["Tables"]["seasonal_display_settings"]["Row"];

function dayOfYear(month: number, day: number): number {
  return Date.UTC(2024, month - 1, day) / 86_400_000;
}

export function campaignIsInSeason(campaign: SeasonalCampaign, now = new Date()): boolean {
  if (!campaign.start_month || !campaign.start_day || !campaign.end_month || !campaign.end_day) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const today = dayOfYear(month, day);
  const start = dayOfYear(campaign.start_month, campaign.start_day);
  const end = dayOfYear(campaign.end_month, campaign.end_day);
  return start <= end ? today >= start && today <= end : today >= start || today <= end;
}

export async function getActiveSeasonalCampaign() {
  const supabase = await createClient();
  const [{ data: settings }, { data: campaigns }] = await Promise.all([
    supabase.from("seasonal_display_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("seasonal_campaigns").select("*").eq("enabled", true).order("priority"),
  ]);
  if (!settings?.display_enabled) return null;
  if (settings.display_mode === "manual") {
    return campaigns?.find((campaign) => campaign.id === settings.selected_campaign_id) ?? null;
  }
  return campaigns?.find((campaign) => campaignIsInSeason(campaign)) ?? null;
}

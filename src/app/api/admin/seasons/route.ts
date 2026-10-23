import { NextResponse } from "next/server";

import { isCurrentUserAdmin } from "@/lib/admin";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient();
  const [{ data: campaigns, error: campaignsError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("seasonal_campaigns").select("*").order("priority"),
    supabase.from("seasonal_display_settings").select("*").eq("id", true).maybeSingle(),
  ]);
  if (campaignsError || settingsError) return NextResponse.json({ error: "Could not load seasonal settings." }, { status: 500 });
  return NextResponse.json({ campaigns: campaigns ?? [], settings });
}

export async function PATCH(request: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const supabase = await createClient();

  if (payload.kind === "settings") {
    const displayEnabled = payload.displayEnabled;
    const displayMode = payload.displayMode;
    const selectedCampaignId = payload.selectedCampaignId;
    if (typeof displayEnabled !== "boolean" || !["automatic", "manual"].includes(String(displayMode)) || (selectedCampaignId !== null && typeof selectedCampaignId !== "string")) {
      return NextResponse.json({ error: "Invalid display settings." }, { status: 400 });
    }
    const { error } = await supabase.from("seasonal_display_settings").update({
      display_enabled: displayEnabled,
      display_mode: displayMode as "automatic" | "manual",
      selected_campaign_id: selectedCampaignId as string | null,
      updated_at: new Date().toISOString(),
    }).eq("id", true);
    if (error) return NextResponse.json({ error: "Could not save display settings." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (payload.kind === "campaign" && typeof payload.id === "string") {
    const fields = ["name_en", "name_vi", "headline_en", "headline_vi", "message_en", "message_vi", "emoji", "accent_color"] as const;
    const update: Record<string, string | boolean | number | null> = {};
    for (const field of fields) {
      if (typeof payload[field] !== "string") return NextResponse.json({ error: `Invalid ${field}.` }, { status: 400 });
      update[field] = (payload[field] as string).trim();
    }
    if (typeof payload.enabled !== "boolean" || typeof payload.priority !== "number" || !Number.isInteger(payload.priority)) {
      return NextResponse.json({ error: "Invalid campaign settings." }, { status: 400 });
    }
    update.enabled = payload.enabled;
    update.priority = payload.priority;
    for (const field of ["start_month", "start_day", "end_month", "end_day"] as const) {
      const value = payload[field];
      if (value !== null && (typeof value !== "number" || !Number.isInteger(value))) return NextResponse.json({ error: `Invalid ${field}.` }, { status: 400 });
      update[field] = value as number | null;
    }
    const datePairValid = (month: unknown, day: unknown) => (month === null) === (day === null) && (month === null || (typeof month === "number" && month >= 1 && month <= 12 && typeof day === "number" && day >= 1 && day <= new Date(Date.UTC(2024, month, 0)).getUTCDate()));
    if (!datePairValid(update.start_month, update.start_day) || !datePairValid(update.end_month, update.end_day)) {
      return NextResponse.json({ error: "Use a valid month and day for both dates." }, { status: 400 });
    }
    if (typeof update.accent_color !== "string" || !/^#[0-9a-f]{6}$/i.test(update.accent_color)) return NextResponse.json({ error: "Accent color must be a six-digit hex color." }, { status: 400 });
    update.updated_at = new Date().toISOString();
    const { error } = await supabase.from("seasonal_campaigns").update(
      update as Database["public"]["Tables"]["seasonal_campaigns"]["Update"],
    ).eq("id", payload.id);
    if (error) return NextResponse.json({ error: "Could not save this seasonal campaign." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request." }, { status: 400 });
}

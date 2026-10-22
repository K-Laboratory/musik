import { NextResponse } from "next/server";

import { isMissingBehaviorTable } from "@/lib/behavior";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json({
    enabled: false,
    available: false,
    collectionEnabled: false,
    retentionDays: 90,
    summary: { events: 0, plays: 0, areas: [] },
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: policyRows, error: policyError } = await supabase.rpc("get_recommendation_collection_policy");
  if (policyError || !policyRows?.[0]) {
    return NextResponse.json({ error: "Could not load behavior collection settings." }, { status: 503 });
  }
  const policy = policyRows[0];

  const { data: preference, error: preferenceError } = await supabase
    .from("recommendation_preferences")
    .select("personalization_enabled,last_cleanup_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (preferenceError) {
    if (isMissingBehaviorTable(preferenceError, "recommendation_preferences")) return unavailable();
    return NextResponse.json({ error: "Could not load personalization settings." }, { status: 500 });
  }

  const cleanupDue = preference && (!preference.last_cleanup_at ||
    Date.parse(preference.last_cleanup_at) < Date.now() - 24 * 60 * 60 * 1000);
  if (cleanupDue) {
    const retentionCutoff = new Date(Date.now() - policy.retention_days * 24 * 60 * 60 * 1000).toISOString();
    const [eventsCleanup, summaryCleanup] = await Promise.all([
      supabase.from("user_behavior_events").delete().eq("user_id", user.id).lt("created_at", retentionCutoff),
      supabase.from("user_behavior_daily").delete().eq("user_id", user.id).lt("activity_date", retentionCutoff.slice(0, 10)),
    ]);
    if (eventsCleanup.error || summaryCleanup.error) {
      if (
        isMissingBehaviorTable(eventsCleanup.error, "user_behavior_events") ||
        isMissingBehaviorTable(summaryCleanup.error, "user_behavior_daily")
      ) return unavailable();
      return NextResponse.json({ error: "Could not apply activity retention." }, { status: 500 });
    }
    const { error: cleanupMarkError } = await supabase
      .from("recommendation_preferences")
      .update({ last_cleanup_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (cleanupMarkError) {
      return NextResponse.json({ error: "Could not update activity retention." }, { status: 500 });
    }
  }

  const cutoff = new Date(Date.now() - policy.retention_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: dailyRows, error: dailyError } = await supabase
    .from("user_behavior_daily")
    .select("area_key,event_count,click_count,play_count,view_count,dwell_ms,pointer_pause_count")
    .eq("user_id", user.id)
    .gte("activity_date", cutoff)
    .order("activity_date", { ascending: false })
    .limit(1200);
  if (dailyError) {
    if (isMissingBehaviorTable(dailyError, "user_behavior_daily")) return unavailable();
    return NextResponse.json({ error: "Could not load your activity summary." }, { status: 500 });
  }

  const byArea = new Map<string, { views: number; clicks: number; dwellMs: number; pointerPauses: number }>();
  let eventCount = 0;
  let plays = 0;
  for (const row of dailyRows ?? []) {
    const area = byArea.get(row.area_key) ?? { views: 0, clicks: 0, dwellMs: 0, pointerPauses: 0 };
    area.views += row.view_count;
    area.clicks += row.click_count;
    area.dwellMs += row.dwell_ms;
    area.pointerPauses += row.pointer_pause_count;
    byArea.set(row.area_key, area);
    eventCount += row.event_count;
    plays += row.play_count;
  }

  const areas = [...byArea.entries()]
    .map(([areaKey, area]) => ({ areaKey, ...area }))
    .sort((a, b) => b.views - a.views || b.clicks - a.clicks || b.dwellMs - a.dwellMs);

  return NextResponse.json({
    enabled: preference?.personalization_enabled === true,
    available: true,
    collectionEnabled: policy.collection_enabled,
    retentionDays: policy.retention_days,
    summary: {
      events: eventCount,
      plays,
      areas,
    },
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { enabled?: unknown };
  try {
    body = await request.json() as { enabled?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Choose whether personalization is enabled." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("recommendation_preferences").upsert({
    user_id: user.id,
    personalization_enabled: body.enabled,
    enabled_at: body.enabled ? now : null,
    updated_at: now,
  }, { onConflict: "user_id" });
  if (error) {
    if (isMissingBehaviorTable(error, "recommendation_preferences")) {
      return NextResponse.json({ error: "Personalization setup is pending." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not update personalization settings." }, { status: 500 });
  }
  return NextResponse.json({ enabled: body.enabled });
}

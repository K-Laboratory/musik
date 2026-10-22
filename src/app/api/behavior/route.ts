import { NextResponse } from "next/server";

import {
  BEHAVIOR_AREAS,
  BEHAVIOR_EVENTS,
  type BehaviorArea,
  type BehaviorEventType,
  type BehaviorItemType,
} from "@/lib/behavior";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ITEM_TYPES = ["song", "generation", "emotion", "mood", "playlist"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_ID = /^[a-zA-Z0-9_-]{1,100}$/;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: policyRows, error: policyError } = await supabase.rpc("get_recommendation_collection_policy");
  if (policyError || !policyRows?.[0]) {
    return NextResponse.json({ error: "Behavior collection settings are unavailable." }, { status: 503 });
  }
  if (!policyRows[0].collection_enabled) {
    return NextResponse.json({ saved: 0, paused: true });
  }

  const { data: preference, error: preferenceError } = await supabase
    .from("recommendation_preferences")
    .select("personalization_enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  if (preferenceError) return NextResponse.json({ error: "Could not verify your settings." }, { status: 500 });
  if (!preference?.personalization_enabled) {
    return NextResponse.json({ saved: 0, disabled: true });
  }

  let body: { events?: unknown };
  try {
    body = await request.json() as { events?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid event batch." }, { status: 400 });
  }
  if (!Array.isArray(body.events) || body.events.length > 30) {
    return NextResponse.json({ error: "Event batch must contain at most 30 events." }, { status: 400 });
  }

  const rows = [];
  for (const raw of body.events) {
    if (!raw || typeof raw !== "object") continue;
    const event = raw as Record<string, unknown>;
    const areaKey = event.areaKey;
    const eventType = event.eventType;
    const sessionId = event.sessionId;
    if (
      typeof areaKey !== "string" || !BEHAVIOR_AREAS.includes(areaKey as BehaviorArea) ||
      typeof eventType !== "string" || !BEHAVIOR_EVENTS.includes(eventType as BehaviorEventType) ||
      ["area_view", "item_view", "pointer_pause"].includes(eventType) &&
        (typeof event.durationMs !== "number" || !Number.isFinite(event.durationMs)) ||
      eventType === "item_view" && (
        event.itemType !== "song" || typeof event.itemId !== "string" || !SAFE_ID.test(event.itemId)
      ) ||
      typeof sessionId !== "string" || !UUID.test(sessionId)
    ) continue;

    const itemType = typeof event.itemType === "string" && ITEM_TYPES.includes(event.itemType as BehaviorItemType)
      ? event.itemType as BehaviorItemType
      : null;
    const itemId = typeof event.itemId === "string" && SAFE_ID.test(event.itemId)
      ? event.itemId
      : null;
    const durationMs = typeof event.durationMs === "number" && Number.isFinite(event.durationMs)
      ? Math.min(300_000, Math.max(0, Math.floor(event.durationMs)))
      : null;

    rows.push({
      user_id: user.id,
      session_id: sessionId,
      event_type: eventType as BehaviorEventType,
      area_key: areaKey as BehaviorArea,
      item_type: itemType,
      item_id: itemId,
      duration_ms: durationMs,
      is_click: event.isClick === true,
    });
  }

  if (rows.length === 0) return NextResponse.json({ saved: 0 });
  const { error } = await supabase.from("user_behavior_events").insert(rows);
  if (error) return NextResponse.json({ error: "Could not save activity signals." }, { status: 500 });

  return NextResponse.json({ saved: rows.length });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [eventsResult, summaryResult] = await Promise.all([
    supabase.from("user_behavior_events").delete().eq("user_id", user.id),
    supabase.from("user_behavior_daily").delete().eq("user_id", user.id),
  ]);
  if (eventsResult.error || summaryResult.error) {
    return NextResponse.json({ error: "Could not clear activity history." }, { status: 500 });
  }
  return NextResponse.json({ cleared: true });
}

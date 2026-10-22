import { NextResponse } from "next/server";

import { isCurrentUserAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RETENTION_OPTIONS = [30, 60, 90];

export async function GET() {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const [settingsResult, auditResult] = await Promise.all([
    supabase
      .from("recommendation_admin_settings")
      .select("id,collection_enabled,retention_days,updated_by,updated_at")
      .eq("id", true)
      .single(),
    supabase
      .from("recommendation_admin_settings_audit")
      .select("id,previous_collection_enabled,collection_enabled,previous_retention_days,retention_days,changed_at")
      .order("changed_at", { ascending: false })
      .limit(12),
  ]);

  if (settingsResult.error || auditResult.error) {
    return NextResponse.json({ error: "Could not load behavior settings." }, { status: 500 });
  }
  return NextResponse.json({ settings: settingsResult.data, audit: auditResult.data ?? [] });
}

export async function PATCH(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { collectionEnabled?: unknown; retentionDays?: unknown };
  try {
    body = await request.json() as { collectionEnabled?: unknown; retentionDays?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const updates: {
    collection_enabled?: boolean;
    retention_days?: number;
    updated_by: string;
    updated_at: string;
  } = { updated_at: new Date().toISOString(), updated_by: "" };
  if (body.collectionEnabled !== undefined) {
    if (typeof body.collectionEnabled !== "boolean") {
      return NextResponse.json({ error: "Collection status must be enabled or paused." }, { status: 400 });
    }
    updates.collection_enabled = body.collectionEnabled;
  }
  if (body.retentionDays !== undefined) {
    if (typeof body.retentionDays !== "number" || !RETENTION_OPTIONS.includes(body.retentionDays)) {
      return NextResponse.json({ error: "Retention must be 30, 60, or 90 days." }, { status: 400 });
    }
    updates.retention_days = body.retentionDays;
  }
  if (updates.collection_enabled === undefined && updates.retention_days === undefined) {
    return NextResponse.json({ error: "Choose a setting to update." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  updates.updated_by = user.id;

  const { data, error } = await supabase
    .from("recommendation_admin_settings")
    .update(updates)
    .eq("id", true)
    .select("id,collection_enabled,retention_days,updated_by,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save behavior settings." }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}

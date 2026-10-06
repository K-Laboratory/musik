import { NextResponse } from "next/server";

import { isCurrentUserAdmin } from "@/lib/admin";
import { isClassifierConfigured } from "@/lib/classification/classify";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/admin/classify
 * Returns pipeline status: how many songs are pending vs analyzed.
 */
export async function GET() {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const [{ count: songs }, { count: analyzed }] = await Promise.all([
    supabase.from("catalog_songs").select("*", { count: "exact", head: true }),
    supabase.from("song_analysis").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    configured: isClassifierConfigured(),
    total: songs ?? 0,
    analyzed: analyzed ?? 0,
    pending: Math.max(0, (songs ?? 0) - (analyzed ?? 0)),
  });
}

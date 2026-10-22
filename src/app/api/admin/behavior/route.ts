import { NextResponse } from "next/server";

import { isCurrentUserAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestedDays = Number(new URL(request.url).searchParams.get("days") ?? 30);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_behavior_analytics", { p_days: days });
  if (error) {
    return NextResponse.json({ error: "Could not load behavior insights." }, { status: 500 });
  }
  return NextResponse.json(data);
}

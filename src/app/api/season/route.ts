import { NextResponse } from "next/server";

import { getActiveSeasonalCampaign } from "@/lib/seasonal";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ campaign: null }, { status: 401 });
  return NextResponse.json({ campaign: await getActiveSeasonalCampaign() });
}

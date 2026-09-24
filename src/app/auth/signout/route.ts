import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/url";

/** Signs the user out and clears the auth cookies. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(`${getOrigin(request)}/login`, { status: 303 });
}

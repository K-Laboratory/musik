import { createClient } from "@/lib/supabase/server";

/**
 * Client-side mirror of the SQL `is_admin()` function. An admin is any
 * authenticated user whose email appears in the `admin_emails` table.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return false;

  const { data, error } = await supabase
    .from("admin_emails")
    .select("email")
    .ilike("email", user.email)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

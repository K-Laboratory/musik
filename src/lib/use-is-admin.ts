"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Client-side admin check for showing admin-only links. The real gate is the
 * SQL `is_admin()` used by RLS; this is only for UI visibility.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.email) return;

        const { data } = await supabase
          .from("admin_emails")
          .select("email")
          .ilike("email", user.email)
          .maybeSingle();
        if (active) setIsAdmin(Boolean(data));
      } catch {
        // Not configured or offline: stay hidden.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return isAdmin;
}

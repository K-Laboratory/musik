import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { DataProvider } from "@/components/DataProvider";
import { SetupNotice } from "@/components/SetupNotice";
import { PlayerProvider } from "@/lib/player";
import { ViewModeProvider } from "@/lib/view-mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <SetupNotice />
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DataProvider user={user}>
      <ViewModeProvider>
        <PlayerProvider>
          <AppShell>{children}</AppShell>
        </PlayerProvider>
      </ViewModeProvider>
    </DataProvider>
  );
}

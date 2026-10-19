import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";

import { DisguiseProvider } from "@/lib/disguise";

import "./globals.css";

export const metadata: Metadata = {
  title: "Favorite Songs",
  description:
    "Search YouTube, save your favourite songs, and organise them into playlists.",
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const storedLanguage = cookieStore.get("musik_lang")?.value;
  const language = storedLanguage === "vi" ? "vi" : "en";

  return (
    <html lang={language} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('favorite-songs:ui-mode')==='work'){document.documentElement.dataset.ui='work'}}catch(e){}",
          }}
        />
        <DisguiseProvider initialLanguage={language}>{children}</DisguiseProvider>
      </body>
    </html>
  );
}

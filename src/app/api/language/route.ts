import { NextResponse } from "next/server";

export const runtime = "nodejs";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

function setLanguageCookie(
  response: NextResponse,
  language: "en" | "vi",
) {
  response.cookies.set("musik_lang", language, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const language = url.searchParams.get("language") === "vi" ? "vi" : "en";
  const next = safeNext(url.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(next, request.url));
  return setLanguageCookie(response, language);
}

export async function POST(request: Request) {
  let body: { language?: unknown };
  try {
    body = (await request.json()) as { language?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const language = body.language;
  if (language !== "en" && language !== "vi") {
    return NextResponse.json({ error: "Invalid language." }, { status: 400 });
  }

  return setLanguageCookie(NextResponse.json({ ok: true, language }), language);
}

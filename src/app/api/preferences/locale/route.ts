import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { isLocale, localeCookie } from "@/i18n/config";
export async function POST(request: NextRequest) {
  // Only same-origin browser requests may mutate the authenticated preference.
  const expectedOrigin = `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`;
  if (request.headers.get("origin") !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Invalid content type" }, { status: 415 });
  if (Number(request.headers.get("content-length") ?? 0) > 256) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let locale: unknown;
  try { locale = (await request.json()).locale; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!isLocale(locale)) return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  let synced = true;
  try {
    const session = await getSession();
    if (session) await getDb().query("INSERT INTO user_locale_preferences (user_id, locale) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET locale = EXCLUDED.locale, updated_at = now()", [session.user.id, locale]);
  } catch { synced = false; }
  const response = NextResponse.json({ synced });
  response.cookies.set(localeCookie, locale, { path: "/", maxAge: 31536000, sameSite: "lax", secure: request.nextUrl.protocol === "https:" });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

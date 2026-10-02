import { defaultLocale, isLocale } from "@/i18n/config";
import { databaseConfigured, getDb } from "@/lib/db";
import { NewsletterStore } from "@/lib/newsletter-store";

export const dynamic = "force-dynamic";
// List-Unsubscribe target. Mail clients POST here for one-click unsubscribe (RFC 8058);
// a GET, such as a link scanner or a click, only opens the confirmation page.
export async function POST(request: Request) {
  if (!databaseConfigured()) return new Response(null, { status: 503 });
  try {
    const result = await new NewsletterStore(getDb()).unsubscribe(new URL(request.url).searchParams.get("token") ?? "");
    return new Response(null, { status: result === "unsubscribed" ? 200 : 404 });
  } catch { return new Response(null, { status: 500 }); }
}
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("locale");
  const token = searchParams.get("token");
  // A relative Location keeps the host the visitor used.
  const target = `/${isLocale(requested) ? requested : defaultLocale}/newsletter/cancelar${token ? `?${new URLSearchParams({ token })}` : ""}`;
  return new Response(null, { status: 303, headers: { Location: target } });
}

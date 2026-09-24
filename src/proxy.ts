import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isLocale, localeCookie } from "./i18n/config";
import { authConfigured, getAuth } from "./lib/auth";
import { getDb } from "./lib/db";
const internationalize = createMiddleware(routing);
export async function proxy(request: NextRequest) {
  const explicit = isLocale(request.nextUrl.pathname.split("/")[1]);
  if (!explicit && !isLocale(request.cookies.get(localeCookie)?.value) && authConfigured() && /(?:^|;\s*)(?:__Secure-)?emada\.session_token=/.test(request.headers.get("cookie") ?? "")) {
    try {
      const session = await getAuth().api.getSession({ headers: request.headers });
      if (session) {
        const result = await getDb().query("SELECT locale FROM user_locale_preferences WHERE user_id = $1", [session.user.id]);
        if (isLocale(result.rows[0]?.locale)) request.cookies.set(localeCookie, result.rows[0].locale);
      }
    } catch { /* Browser language remains available when preferences cannot be read. */ }
  }
  return internationalize(request);
}
export const config = { matcher: ["/", "/modelos", "/noticias", "/experimentos", "/vozes", "/(pt-BR|en)/:path*"] };

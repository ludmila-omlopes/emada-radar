import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale, localeCookie } from "./config";
export const routing = defineRouting({ locales, defaultLocale, localePrefix: "always", localeCookie: { name: localeCookie, maxAge: 31536000, sameSite: "lax" } });

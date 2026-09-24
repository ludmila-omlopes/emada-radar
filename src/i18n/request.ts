import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale } from "./config";
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // Academy and authentication retain their existing Portuguese routes.
  const locale = isLocale(requested) ? requested : defaultLocale;
  return { locale, timeZone: "UTC", messages: (await import(`./messages/${locale}.json`)).default };
});

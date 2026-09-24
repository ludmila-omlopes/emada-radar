export const locales = ["pt-BR", "en"] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = "pt-BR";
export const localeCookie = "EMADA_LOCALE";
export const portalPaths = ["/", "/modelos", "/noticias", "/experimentos", "/vozes"];
export function isLocale(value: unknown): value is Locale { return locales.includes(value as Locale); }
export function stripLocale(path: string) { return path.replace(/^\/(pt-BR|en)(?=\/|$)/, "") || "/"; }
export function portalHref(locale: string, path: string) {
  const bare = stripLocale(path);
  return portalPaths.includes(bare) ? `/${isLocale(locale) ? locale : defaultLocale}${bare === "/" ? "" : bare}` : path;
}

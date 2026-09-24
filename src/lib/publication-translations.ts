import catalog from "@/data/publication-translations.json";
import type { Locale } from "@/i18n/config";
import type { Collection, PortalArticle, SocialPost } from "./portal-types";

export type PublicationTranslationEntry = {
  kind: string;
  id: string;
  url: string;
  original: string;
  sourceLanguage: string;
  translations: Partial<Record<Locale, string>>;
};
const entries: PublicationTranslationEntry[] = catalog.entries;
const byPublication = new Map(entries.map(entry => [`${entry.kind}:${entry.id}`, entry]));

export function translatePublications<T extends PortalArticle | SocialPost>(collection: Collection<T>, locale: Locale): Collection<T> {
  return { ...collection, items: collection.items.map(item => {
    const kind = "text" in item ? "social" : "kind" in item ? "experiment" : "news";
    const original = "text" in item ? item.text : item.title;
    const entry = byPublication.get(`${kind}:${item.id}`);
    const translated = entry?.translations[locale];
    // A changed source must be translated again. Never show an outdated translation.
    if (!entry || entry.original !== original || entry.url !== item.url || !translated || translated === original) return item;
    return { ...item, translation: { text: translated, sourceLanguage: entry.sourceLanguage, locale } };
  }) };
}

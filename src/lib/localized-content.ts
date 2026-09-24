import "server-only";
import { getLocale } from "next-intl/server";
import { isLocale, defaultLocale } from "@/i18n/config";
import { translatePublications } from "./publication-translations";
import { after } from "next/server";
import { databaseConfigured, getDb } from "./db";
import { translationInput } from "./openrouter-translation";
import { OpenRouterTranslationStore } from "./openrouter-translation-store";
import type { Collection, PortalArticle, SocialPost } from "./portal-types";

export async function localizeContent<T extends PortalArticle | SocialPost>(collection: Collection<T>): Promise<Collection<T>> {
  const requested = await getLocale();
  const locale = isLocale(requested) ? requested : defaultLocale;
  const prepared = translatePublications(collection, locale);
  const key = process.env.OPENROUTER_API_KEY;
  if (locale !== "pt-BR" || process.env.OPENROUTER_TRANSLATIONS_ENABLED !== "true" || !key || !databaseConfigured()) return prepared;
  const candidates = prepared.items.flatMap(item => { const input = translationInput(item); return input ? [input] : []; });
  if (!candidates.length) return prepared;
  try {
    const store = new OpenRouterTranslationStore(getDb(), key);
    const saved = await store.read(candidates);
    const missing = candidates.filter(input => !saved.has(input.cacheKey));
    if (missing.length) after(async () => {
      try { await store.fill(missing); }
      catch { console.warn("OpenRouter translations deferred; originals remain available."); }
    });
    return { ...prepared, items: prepared.items.map(item => {
      const input = translationInput(item);
      const translation = input && saved.get(input.cacheKey);
      const original = "text" in item ? item.text : item.title;
      return translation && translation.text !== original ? { ...item, translation } : item;
    }) };
  } catch {
    console.warn("OpenRouter translation cache unavailable; originals remain available.");
    return prepared;
  }
}

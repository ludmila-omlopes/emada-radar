import "server-only";
import { locales, type Locale } from "@/i18n/config";
import { classifyNews } from "./classified-news";
import { databaseConfigured, getDb } from "./db";
import { selectDigest, type DigestContent } from "./newsletter";
import { translationInput } from "./openrouter-translation";
import { OpenRouterTranslationStore } from "./openrouter-translation-store";
import { getArtificialAnalysis, getExperiments, getLiveBench, getPortalNews, getSocialPosts } from "./portal-data";
import { translatePublications } from "./publication-translations";
import type { Collection, PortalArticle, SocialPost } from "./portal-types";

// The same translations the portal shows: the manual catalog plus cached automatic
// ones. Building a digest never requests new paid translations.
async function localizeFor<T extends PortalArticle | SocialPost>(collection: Collection<T>, locale: Locale): Promise<T[]> {
  const prepared = translatePublications(collection, locale);
  if (locale !== "pt-BR" || process.env.OPENROUTER_TRANSLATIONS_ENABLED !== "true" || !databaseConfigured()) return prepared.items;
  const candidates = prepared.items.flatMap(item => { const input = translationInput(item); return input ? [input] : []; });
  if (!candidates.length) return prepared.items;
  try {
    const saved = await new OpenRouterTranslationStore(getDb(), "").read(candidates);
    return prepared.items.map(item => {
      const input = translationInput(item);
      const translation = input && saved.get(input.cacheKey);
      const original = "text" in item ? item.text : item.title;
      return translation && translation.text !== original ? { ...item, translation } : item;
    });
  } catch { return prepared.items; }
}

export async function buildDigests(now = Date.now()): Promise<DigestContent> {
  const [news, experiments, social, livebench, artificialAnalysis] = await Promise.all([getPortalNews().then(classifyNews), getExperiments(), getSocialPosts(), getLiveBench(), getArtificialAnalysis()]);
  const entries = await Promise.all(locales.map(async locale => {
    const [localNews, localExperiments, localSocial] = await Promise.all([localizeFor(news, locale), localizeFor(experiments, locale), localizeFor(social, locale)]);
    return [locale, selectDigest({ news: localNews, experiments: localExperiments, social: localSocial, livebench, artificialAnalysis }, locale, now)] as const;
  }));
  return Object.fromEntries(entries) as DigestContent;
}

import "server-only";
import { after } from "next/server";
import { databaseConfigured, getDb } from "./db";
import { newsInput, isModelRelease } from "./news-classification";
import { NewsClassificationStore, NewsDuplicateStore } from "./news-classification-store";
import { duplicateInputs, isDuplicate, repeatedTitles, withoutDuplicates } from "./news-duplicates";
import type { Collection, PortalArticle } from "./portal-types";

export async function classifyNews(collection: Collection<PortalArticle>): Promise<Collection<PortalArticle>> {
  const key = process.env.OPENROUTER_API_KEY;
  // Identical titles are dropped even without Jev, so a story posted by two blogs shows once.
  const repeats = repeatedTitles(collection.items);
  if (process.env.OPENROUTER_NEWS_CLASSIFICATION_ENABLED !== "true" || !databaseConfigured()) return { ...collection, items: withoutDuplicates(collection.items, repeats) };
  try {
    const inputs = collection.items.map(newsInput);
    const store = new NewsClassificationStore(getDb(), key ?? "");
    const saved = await store.read(inputs);
    const missing = inputs.filter(input => !saved.has(input.cacheKey));
    const items = collection.items.map((item, index) => {
      const decision = saved.get(inputs[index].cacheKey);
      return decision ? { ...item, modelRelease: isModelRelease(decision) } : item;
    });
    const pairs = duplicateInputs(items.filter(item => !repeats.has(item.id)));
    const duplicateStore = new NewsDuplicateStore(getDb(), key ?? "");
    const matches = await duplicateStore.read(pairs);
    const present = new Set(items.map(item => item.id));
    const duplicates = new Map(repeats);
    for (const pair of pairs) {
      const decision = matches.get(pair.cacheKey);
      if (decision && isDuplicate(decision) && present.has(decision.duplicateOf!)) duplicates.set(pair.articleId, decision.duplicateOf!);
    }
    const unmatched = pairs.filter(pair => !matches.has(pair.cacheKey));
    // Both tasks share a one-minute cooldown, so each visit runs at most one batch: labels first.
    if (key && (missing.length || unmatched.length)) after(async () => {
      try { if (missing.length) await store.fill(missing); else await duplicateStore.fill(unmatched); }
      catch { console.warn("News classification deferred; news remains available."); }
    });
    return { ...collection, items: withoutDuplicates(items, duplicates) };
  } catch {
    console.warn("News classification unavailable; no automatic highlights applied.");
    return { ...collection, items: withoutDuplicates(collection.items, repeats) };
  }
}

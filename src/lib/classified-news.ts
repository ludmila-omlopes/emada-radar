import "server-only";
import { after } from "next/server";
import { databaseConfigured, getDb } from "./db";
import { newsInput, isModelRelease } from "./news-classification";
import { NewsClassificationStore } from "./news-classification-store";
import type { Collection, PortalArticle } from "./portal-types";

export async function classifyNews(collection: Collection<PortalArticle>): Promise<Collection<PortalArticle>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (process.env.OPENROUTER_NEWS_CLASSIFICATION_ENABLED !== "true" || !databaseConfigured()) return collection;
  try {
    const inputs = collection.items.map(newsInput);
    const store = new NewsClassificationStore(getDb(), key ?? "");
    const saved = await store.read(inputs);
    const missing = inputs.filter(input => !saved.has(input.cacheKey));
    if (key && missing.length) after(async () => {
      try { await store.fill(missing); }
      catch { console.warn("News classification deferred; news remains available."); }
    });
    return { ...collection, items: collection.items.map((item, index) => {
      const decision = saved.get(inputs[index].cacheKey);
      return decision ? { ...item, modelRelease: isModelRelease(decision) } : item;
    }) };
  } catch { console.warn("News classification unavailable; no automatic highlights applied."); return collection; }
}

import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { getPortalNews } from "../src/lib/portal-data";
import { NewsClassificationStore } from "../src/lib/news-classification-store";
import { newsInput, isModelRelease } from "../src/lib/news-classification";
loadEnvConfig(process.cwd());
async function main() {
  if (process.env.OPENROUTER_NEWS_SEED !== "true") return;
  if (process.env.OPENROUTER_NEWS_CLASSIFICATION_ENABLED !== "true" || !process.env.OPENROUTER_API_KEY) throw new Error("missing_configuration");
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("missing_database");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 15000 });
  try {
    const news = await getPortalNews();
    const inputs = news.items.map(newsInput);
    const store = new NewsClassificationStore(pool, process.env.OPENROUTER_API_KEY);
    for (let batch = 0; batch < 25; batch++) {
      const cached = await store.read(inputs);
      const missing = inputs.filter(input => !cached.has(input.cacheKey));
      if (!missing.length) break;
      const result = await store.fill(missing, { backfill: true });
      console.log(`News initial collection: ${result.classified} classifications saved in batch ${batch + 1}.`);
      if (!result.classified) break; // No retries, no loops against an unavailable provider or exhausted budget.
    }
    const cached = await store.read(inputs);
    const highlights = news.items.filter((_, index) => { const decision = cached.get(inputs[index].cacheKey); return decision && isModelRelease(decision); });
    console.log(JSON.stringify({ newsInitialCollection: { total: inputs.length, classified: cached.size, releases: highlights.map(item => item.title) } }));
  } finally { await pool.end(); }
}
main().catch(() => { console.error("News initial collection failed. Existing news remains available. No credential was logged."); process.exitCode = 1; });

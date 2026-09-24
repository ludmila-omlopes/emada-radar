import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { checkPracticeKey } from "../src/lib/openrouter";
import { NewsClassificationStore } from "../src/lib/news-classification-store";
import { newsInput, isModelRelease, NEWS_RULE_VERSION } from "../src/lib/news-classification";
import examples from "../tests/fixtures/news-classification.json";
loadEnvConfig(process.cwd());
async function main() {
  if (process.env.OPENROUTER_NEWS_CLASSIFICATION_ENABLED !== "true") return;
  const key = process.env.OPENROUTER_API_KEY;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!key || !connectionString) throw new Error("missing_configuration");
  await checkPracticeKey(key);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 15000 });
  try {
    await pool.query("SELECT id FROM news_classification_runs LIMIT 0");
    await pool.query("SELECT cache_key FROM news_classification_cache LIMIT 0");
    await pool.query("SELECT month FROM practice_budgets LIMIT 0");
    console.log("News classifier: OpenRouter credential, credit cap and schema verified.");
    if (process.env.OPENROUTER_NEWS_VERIFY === "true") {
      const inputs = examples.map(example => newsInput({ ...example, id: `eval-${NEWS_RULE_VERSION}-${example.id}`, url: `https://example.com/jev-evaluation/${example.id}`, source: "Synthetic evaluation fixture", category: "test", publishedAt: "2026-09-24T00:00:00Z" }));
      const store = new NewsClassificationStore(pool, key);
      const saved = await store.read(inputs);
      await store.fill(inputs.filter(input => !saved.has(input.cacheKey)));
      const decisions = await store.read(inputs);
      const results = examples.map((example, index) => { const decision = decisions.get(inputs[index].cacheKey); return { id: example.id, ...decision, passed: Boolean(decision && isModelRelease(decision) === example.highlight) }; });
      console.log(JSON.stringify({ newsClassifierEvaluation: results }));
      if (results.some(result => !result.passed)) throw new Error("evaluation_failed");
    }
  } finally { await pool.end(); }
}
main().catch(() => { console.error("News classifier verification failed. Check configuration, migration 006 and evaluation results. No credential or provider error body was logged."); process.exitCode = 1; });

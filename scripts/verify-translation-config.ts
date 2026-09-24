import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { checkPracticeKey } from "../src/lib/openrouter";
import { OpenRouterTranslationStore } from "../src/lib/openrouter-translation-store";
import { translationInput } from "../src/lib/openrouter-translation";
loadEnvConfig(process.cwd());
async function main() {
  if (process.env.OPENROUTER_TRANSLATIONS_ENABLED !== "true") return;
  const key = process.env.OPENROUTER_API_KEY;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!key || !connectionString) throw new Error("translation_configuration_missing");
  await checkPracticeKey(key);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 15000 });
  try {
    await pool.query("SELECT id FROM openrouter_translation_runs LIMIT 0");
    await pool.query("SELECT cache_key FROM openrouter_translation_cache LIMIT 0");
    await pool.query("SELECT month FROM practice_budgets LIMIT 0");
    console.log("OpenRouter translations: credential, credit cap and database schema verified.");
    // Explicit one-off activation test. Accounted by the same store and reused on repeat builds.
    if (process.env.OPENROUTER_TRANSLATION_VERIFY === "true") {
      const input = translationInput({ id: "integration-check-v1", title: "AI models can help developers write code.", url: "https://emada-academy.vercel.app/", source: "Integration check", category: "test", publishedAt: "2026-09-24T00:00:00Z" })!;
      const store = new OpenRouterTranslationStore(pool, key);
      if (!(await store.read([input])).has(input.cacheKey)) await store.fill([input]);
      const translated = (await store.read([input])).get(input.cacheKey);
      if (!translated || translated.text === input.original || translated.sourceLanguage !== "en") throw new Error("translation_live_check_failed");
      console.log(`OpenRouter translation activation verified: ${translated.text}`);
    }
  } finally { await pool.end(); }
}
main().catch(() => { console.error("OpenRouter translations configuration failed. Check the server credential, US$5 key cap, balance and migration 005. No secret was logged."); process.exitCode = 1; });

import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { checkPracticeKey } from "./openrouter";
import { PRACTICE_LIMITS } from "./practice-policy";
import { callTranslationModel, TRANSLATION_LIMITS as L, type TranslationInput, type TranslationResult } from "./openrouter-translation";

type CachedRow = { cache_key: string; translated_text: string | null; source_language: string | null };

export class OpenRouterTranslationStore {
  constructor(private pool: Pool, private key: string, private provider = { check: checkPracticeKey, call: callTranslationModel }) {}

  async read(inputs: TranslationInput[]) {
    if (!inputs.length) return new Map<string, { text: string; sourceLanguage: string; locale: "pt-BR"; automatic: true }>();
    const result = await this.pool.query<CachedRow>("SELECT cache_key, translated_text, source_language FROM openrouter_translation_cache WHERE cache_key = ANY($1::text[]) AND translated_text IS NOT NULL", [inputs.map(input => input.cacheKey)]);
    return new Map(result.rows.map(row => [row.cache_key, { text: row.translated_text!, sourceLanguage: row.source_language!, locale: "pt-BR" as const, automatic: true as const }]));
  }

  private async transaction<T>(work: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '10000ms'");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('emada-openrouter-translations', 0))");
      const result = await work(client);
      await client.query("COMMIT"); return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async fill(inputs: TranslationInput[]) {
    if (!this.key || !inputs.length) return { translated: 0 };
    const id = randomUUID();
    const claimed = await this.transaction(async client => {
      // At most one batch per minute per database, including after a cold start or timeout.
      const recent = await client.query("SELECT 1 FROM openrouter_translation_runs WHERE created_at > now() - interval '1 minute' LIMIT 1");
      if (recent.rowCount) return [];
      const usage = await client.query<{ used: string }>("SELECT COALESCE(sum(cost_charge_micro), 0) AS used FROM openrouter_translation_runs WHERE month = date_trunc('month', now() AT TIME ZONE 'UTC')::date");
      if (Number(usage.rows[0].used) + L.reservationMicro > L.monthlyMicro) return [];
      const batch: TranslationInput[] = [];
      let bytes = 0;
      for (const input of inputs) {
        const size = Buffer.byteLength(input.original);
        if (!input.original.trim() || size > L.itemBytes || bytes + size > L.batchBytes || batch.length >= L.batchItems) continue;
        const row = await client.query(`INSERT INTO openrouter_translation_cache (cache_key, lease_owner, retry_at, attempts)
          VALUES ($1, $2, now() + interval '1 day', 1)
          ON CONFLICT (cache_key) DO UPDATE SET lease_owner = $2, retry_at = now() + interval '1 day', attempts = openrouter_translation_cache.attempts + 1
          WHERE openrouter_translation_cache.translated_text IS NULL AND openrouter_translation_cache.retry_at <= now() AND openrouter_translation_cache.attempts < 3
          RETURNING cache_key`, [input.cacheKey, id]);
        if (row.rowCount) { batch.push(input); bytes += size; }
      }
      if (!batch.length) return [];
      await client.query("INSERT INTO practice_budgets (month) VALUES (date_trunc('month', now() AT TIME ZONE 'UTC')::date) ON CONFLICT DO NOTHING");
      const debit = await client.query("UPDATE practice_budgets SET charged_micro = charged_micro + $1 WHERE month = date_trunc('month', now() AT TIME ZONE 'UTC')::date AND charged_micro + $1 <= $2 RETURNING month", [L.reservationMicro, PRACTICE_LIMITS.monthlyBudgetMicro]);
      if (!debit.rowCount) throw new Error("translation_shared_budget_exhausted");
      await client.query("INSERT INTO openrouter_translation_runs (id, month, status, cost_charge_micro) VALUES ($1, date_trunc('month', now() AT TIME ZONE 'UTC')::date, 'pending', $2)", [id, L.reservationMicro]);
      return batch;
    });
    if (!claimed.length) return { translated: 0 };
    let called = false;
    let result: TranslationResult | undefined;
    try {
      await this.provider.check(this.key);
      called = true;
      result = await this.provider.call(this.key, claimed);
    } catch { /* Keep the original on any failure. No immediate automatic retry. */ }
    await this.transaction(async client => {
      const run = (await client.query<{ status: string; month: string }>("SELECT status, month::text FROM openrouter_translation_runs WHERE id = $1 FOR UPDATE", [id])).rows[0];
      if (run.status !== "pending") return;
      const cost = result?.costMicro ?? (called ? L.reservationMicro : 0);
      const overrun = cost > L.reservationMicro;
      await client.query("UPDATE practice_budgets SET charged_micro = GREATEST(charged_micro - $1 + $2, $3) WHERE month = $4::date", [L.reservationMicro, cost, overrun ? PRACTICE_LIMITS.monthlyBudgetMicro : 0, run.month]);
      await client.query("UPDATE openrouter_translation_runs SET status = $2, cost_charge_micro = $3, generation_id = $4 WHERE id = $1", [id, result ? "done" : "failed", overrun ? Math.max(cost, L.monthlyMicro) : cost, result?.generationId ?? null]);
      if (result) for (const item of result.items) {
        await client.query("UPDATE openrouter_translation_cache SET translated_text = $1, source_language = $2, lease_owner = NULL WHERE cache_key = $3 AND lease_owner = $4", [item.text, item.sourceLanguage, item.cacheKey, id]);
      }
      await client.query("UPDATE openrouter_translation_cache SET lease_owner = NULL WHERE lease_owner = $1", [id]);
    });
    return { translated: result?.items.length ?? 0 };
  }
}

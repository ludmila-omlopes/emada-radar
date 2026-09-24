import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { checkPracticeKey } from "./openrouter";
import { PRACTICE_LIMITS } from "./practice-policy";
import { callNewsClassifier, decisionSchema, NEWS_LIMITS as L, type NewsDecision, type NewsInput, type NewsResult } from "./news-classification";

export class NewsClassificationStore {
  constructor(private pool: Pool, private key: string, private provider = { check: checkPracticeKey, call: callNewsClassifier }) {}
  async read(inputs: NewsInput[]) {
    const found = new Map<string, NewsDecision>();
    if (!inputs.length) return found;
    const result = await this.pool.query<{ cache_key: string; decision: unknown }>("SELECT cache_key, decision FROM news_classification_cache WHERE cache_key = ANY($1::text[]) AND decision IS NOT NULL", [inputs.map(input => input.cacheKey)]);
    for (const row of result.rows) { const parsed = decisionSchema.safeParse(row.decision); if (parsed.success) found.set(row.cache_key, parsed.data); }
    return found;
  }
  private async transaction<T>(work: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '10000ms'");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('emada-news-classification', 0))");
      const result = await work(client); await client.query("COMMIT"); return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async fill(inputs: NewsInput[], options: { backfill?: boolean } = {}) {
    if (!this.key || !inputs.length) return { classified: 0 };
    const id = randomUUID();
    const claimed = await this.transaction(async client => {
      // Explicit server maintenance may drain a backlog; live visitors retain the one-minute cooldown.
      const recent = await client.query("SELECT 1 FROM news_classification_runs WHERE (status = 'pending' AND created_at > now() - interval '90 seconds') OR ($1 = false AND created_at > now() - interval '1 minute') LIMIT 1", [options.backfill === true]);
      if (recent.rowCount) return [];
      const usage = await client.query<{ used: string }>("SELECT COALESCE(sum(cost_charge_micro), 0) AS used FROM news_classification_runs WHERE month = date_trunc('month', now() AT TIME ZONE 'UTC')::date");
      if (Number(usage.rows[0].used) + L.reservationMicro > L.monthlyMicro) return [];
      const batch: NewsInput[] = [];
      for (const input of inputs) {
        if (batch.length >= L.batchItems || Buffer.byteLength(JSON.stringify([...batch, input])) > L.batchBytes) continue;
        const row = await client.query(`INSERT INTO news_classification_cache (cache_key, lease_owner, retry_at, attempts)
          VALUES ($1, $2, now() + interval '1 day', 1)
          ON CONFLICT (cache_key) DO UPDATE SET lease_owner = $2, retry_at = now() + interval '1 day', attempts = news_classification_cache.attempts + 1
          WHERE news_classification_cache.decision IS NULL AND news_classification_cache.retry_at <= now() AND news_classification_cache.attempts < 3 RETURNING cache_key`, [input.cacheKey, id]);
        if (row.rowCount) batch.push(input);
      }
      if (!batch.length) return [];
      await client.query("INSERT INTO practice_budgets (month) VALUES (date_trunc('month', now() AT TIME ZONE 'UTC')::date) ON CONFLICT DO NOTHING");
      const debit = await client.query("UPDATE practice_budgets SET charged_micro = charged_micro + $1 WHERE month = date_trunc('month', now() AT TIME ZONE 'UTC')::date AND charged_micro + $1 <= $2 RETURNING month", [L.reservationMicro, PRACTICE_LIMITS.monthlyBudgetMicro]);
      if (!debit.rowCount) throw new Error("news_shared_budget_exhausted");
      await client.query("INSERT INTO news_classification_runs (id, month, status, cost_charge_micro) VALUES ($1, date_trunc('month', now() AT TIME ZONE 'UTC')::date, 'pending', $2)", [id, L.reservationMicro]);
      return batch;
    });
    if (!claimed.length) return { classified: 0 };
    let called = false;
    let result: NewsResult | undefined;
    let errorCode: string | null = null;
    try { await this.provider.check(this.key); called = true; result = await this.provider.call(this.key, claimed); }
    catch (error) { errorCode = error instanceof Error && /^news_(?:provider_http_\d+|invalid_response|invalid_probabilities|input_limit)$/.test(error.message) ? error.message : called ? "news_unconfirmed" : "news_credential"; }
    await this.transaction(async client => {
      const run = (await client.query<{ status: string; month: string }>("SELECT status, month::text FROM news_classification_runs WHERE id = $1 FOR UPDATE", [id])).rows[0];
      if (run.status !== "pending") return;
      const cost = result?.costMicro ?? (called ? L.reservationMicro : 0);
      const overrun = cost > L.reservationMicro;
      await client.query("UPDATE practice_budgets SET charged_micro = GREATEST(charged_micro - $1 + $2, $3) WHERE month = $4::date", [L.reservationMicro, cost, overrun ? PRACTICE_LIMITS.monthlyBudgetMicro : 0, run.month]);
      await client.query("UPDATE news_classification_runs SET status = $2, cost_charge_micro = $3, generation_id = $4, error_code = $5 WHERE id = $1", [id, result ? "done" : "failed", overrun ? Math.max(cost, L.monthlyMicro) : cost, result?.generationId ?? null, errorCode]);
      if (result) for (const item of result.items) await client.query("UPDATE news_classification_cache SET decision = $1::jsonb, model = $2, lease_owner = NULL WHERE cache_key = $3 AND lease_owner = $4", [JSON.stringify(item.decision), result.model, item.cacheKey, id]);
      await client.query("UPDATE news_classification_cache SET lease_owner = NULL WHERE lease_owner = $1", [id]);
    });
    return { classified: result?.items.length ?? 0 };
  }
}

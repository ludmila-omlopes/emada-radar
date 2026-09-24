import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { NewsClassificationStore } from "../src/lib/news-classification-store";
import { NEWS_LIMITS as L, NEWS_MODEL, type NewsInput } from "../src/lib/news-classification";

const db = new PGlite();
let queue = Promise.resolve();
async function lock() { const previous = queue; let unlock!: () => void; queue = new Promise(resolve => { unlock = resolve; }); await previous; return unlock; }
async function query(sql: string, values?: unknown[]) { const result = await db.query(sql, values); return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 }; }
const pool = { query: async (sql: string, values?: unknown[]) => { const unlock = await lock(); try { return await query(sql, values); } finally { unlock(); } }, connect: async () => { const unlock = await lock(); return { query, release: unlock }; } } as unknown as Pool;
const inputs = [{ cacheKey: "one", title: "A new model", summary: "Released today", source: "Example" }];
let calls = 0;
const provider = { check: async () => {}, call: async (_key: string, batch: NewsInput[]) => { calls++; return { items: batch.map(input => ({ cacheKey: input.cacheKey, decision: { label: "release" as const, releaseProbability: 0.98, confidence: 0.9 } })), costMicro: 75, generationId: "test", model: NEWS_MODEL }; } };
const store = new NewsClassificationStore(pool, "fake", provider);
before(async () => {
  await db.exec("CREATE TABLE practice_budgets (month date PRIMARY KEY, charged_micro bigint NOT NULL DEFAULT 0 CHECK (charged_micro >= 0))");
  const migration = await readFile(new URL("../migrations/006-news-classification.sql", import.meta.url), "utf8");
  await db.exec(migration); await db.exec(migration);
});
beforeEach(async () => { calls = 0; await db.exec("TRUNCATE news_classification_cache, news_classification_runs, practice_budgets"); });
after(async () => { await db.close(); });
async function budget() { return Number((await db.query<{ charged_micro: string }>("SELECT charged_micro FROM practice_budgets")).rows[0]?.charged_micro ?? 0); }
async function age() { await db.exec("UPDATE news_classification_runs SET created_at = now() - interval '2 minutes'"); }

test("concurrent readers classify once and reuse cached positive and negative decisions", async () => {
  await Promise.all(Array.from({ length: 8 }, () => store.fill(inputs)));
  assert.equal(calls, 1); assert.equal(await budget(), 75);
  assert.equal((await store.read(inputs)).get("one")?.label, "release");
  await age(); await store.fill(inputs); assert.equal(calls, 1);
  await db.query("UPDATE news_classification_cache SET decision = $1::jsonb", [JSON.stringify({ label: "other", releaseProbability: 0, confidence: 1 })]);
  await store.fill(inputs); assert.equal(calls, 1); assert.equal((await store.read(inputs)).get("one")?.label, "other");
});
test("money is reserved before the provider runs and cannot be spent by a second reader", async () => {
  let finish!: () => void; const gate = new Promise<void>(resolve => { finish = resolve; });
  let started!: () => void; const waiting = new Promise<void>(resolve => { started = resolve; });
  const slow = new NewsClassificationStore(pool, "fake", { check: provider.check, call: async (key, batch) => { started(); await gate; return provider.call(key, batch); } });
  const first = slow.fill(inputs); await waiting;
  assert.equal(await budget(), L.reservationMicro);
  await store.fill(inputs); assert.equal(calls, 0);
  finish(); await first; assert.equal(calls, 1);
});
test("both the shared budget and classifier budget prevent paid calls", async () => {
  await db.exec("INSERT INTO practice_budgets (month, charged_micro) VALUES (date_trunc('month', now() AT TIME ZONE 'UTC')::date, 5000000)");
  await assert.rejects(store.fill(inputs), /shared_budget/); assert.equal(calls, 0);
  assert.equal((await db.query("SELECT * FROM news_classification_cache")).rows.length, 0);
  await db.exec("UPDATE practice_budgets SET charged_micro = 0; INSERT INTO news_classification_runs (id, month, status, cost_charge_micro, created_at) VALUES ('00000000-0000-0000-0000-000000000001', date_trunc('month', now() AT TIME ZONE 'UTC')::date, 'done', 500000, now() - interval '1 hour')");
  assert.equal((await store.fill(inputs)).classified, 0); assert.equal(calls, 0);
});
test("provider failure stays charged and unclassified; retries back off and never expose provider details", async () => {
  const broken = new NewsClassificationStore(pool, "fake", { check: provider.check, call: async () => { calls++; throw new Error("secret error body"); } });
  await broken.fill(inputs); assert.equal(await budget(), L.reservationMicro);
  await age(); await broken.fill(inputs); assert.equal(calls, 1);
  assert.equal((await store.read(inputs)).size, 0);
  assert.equal((await db.query<{ error_code: string }>("SELECT error_code FROM news_classification_runs")).rows[0].error_code, "news_unconfirmed");
  await db.exec("UPDATE news_classification_cache SET attempts = 3, retry_at = now() - interval '1 day'");
  await broken.fill(inputs); assert.equal(calls, 1);
});
test("unsafe keys refund reservations; unexpected cost pauses the shared monthly budget", async () => {
  const unsafe = new NewsClassificationStore(pool, "fake", { check: async () => { throw new Error("unsafe key"); }, call: provider.call });
  await unsafe.fill(inputs); assert.equal(calls, 0); assert.equal(await budget(), 0);
  await age();
  const overrun = new NewsClassificationStore(pool, "fake", { check: provider.check, call: async (key, batch) => ({ ...await provider.call(key, batch), costMicro: L.reservationMicro + 1 }) });
  await overrun.fill([{ ...inputs[0], cacheKey: "two" }]); assert.equal(await budget(), 5_000_000);
});

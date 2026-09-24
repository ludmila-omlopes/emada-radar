import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { OpenRouterTranslationStore } from "../src/lib/openrouter-translation-store";
import { TRANSLATION_LIMITS as L, type TranslationInput } from "../src/lib/openrouter-translation";

const db = new PGlite();
let queue = Promise.resolve();
async function lock() { const previous = queue; let unlock!: () => void; queue = new Promise(resolve => { unlock = resolve; }); await previous; return unlock; }
async function query(sql: string, values?: unknown[]) { const result = await db.query(sql, values); return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 }; }
const pool = { query: async (sql: string, values?: unknown[]) => { const unlock = await lock(); try { return await query(sql, values); } finally { unlock(); } }, connect: async () => { const unlock = await lock(); return { query, release: unlock }; } } as unknown as Pool;
const inputs = [{ cacheKey: "one", original: "A new model" }];
let calls = 0;
const provider = { check: async () => {}, call: async (_key: string, batch: TranslationInput[]) => { calls++; return { items: batch.map(input => ({ cacheKey: input.cacheKey, text: "Um novo modelo", sourceLanguage: "en" })), costMicro: 75, generationId: "test" }; } };
const store = new OpenRouterTranslationStore(pool, "fake", provider);
before(async () => {
  await db.exec("CREATE TABLE practice_budgets (month date PRIMARY KEY, charged_micro bigint NOT NULL DEFAULT 0 CHECK (charged_micro >= 0))");
  const migration = await readFile(new URL("../migrations/005-openrouter-translations.sql", import.meta.url), "utf8");
  await db.exec(migration); await db.exec(migration);
});
beforeEach(async () => { calls = 0; await db.exec("TRUNCATE openrouter_translation_cache, openrouter_translation_runs, practice_budgets"); });
after(async () => { await db.close(); });
async function budget() { return Number((await db.query<{ charged_micro: string }>("SELECT charged_micro FROM practice_budgets")).rows[0]?.charged_micro ?? 0); }
async function age() { await db.exec("UPDATE openrouter_translation_runs SET created_at = now() - interval '2 minutes'"); }

test("parallel visitors share one generation, durable cache, and reconciled shared budget", async () => {
  await Promise.all(Array.from({ length: 8 }, () => store.fill(inputs)));
  assert.equal(calls, 1); assert.equal(await budget(), 75);
  assert.equal((await store.read(inputs)).get("one")?.text, "Um novo modelo");
  await age(); await store.fill(inputs);
  assert.equal(calls, 1);
});

test("pending request reserves money before inference; another visitor cannot spend again", async () => {
  let finish!: () => void; const gate = new Promise<void>(resolve => { finish = resolve; });
  let started!: () => void; const waiting = new Promise<void>(resolve => { started = resolve; });
  const slow = new OpenRouterTranslationStore(pool, "fake", { check: provider.check, call: async (key, batch) => { started(); await gate; return provider.call(key, batch); } });
  const first = slow.fill(inputs); await waiting;
  assert.equal(await budget(), L.reservationMicro);
  await store.fill(inputs); assert.equal(calls, 0);
  finish(); await first; assert.equal(calls, 1);
});

test("a full chat budget or translation sub-budget prevents any generation and releases claims", async () => {
  await db.exec("INSERT INTO practice_budgets (month, charged_micro) VALUES (date_trunc('month', now() AT TIME ZONE 'UTC')::date, 5000000)");
  await assert.rejects(store.fill(inputs), /shared_budget/);
  assert.equal(calls, 0);
  assert.equal((await db.query("SELECT * FROM openrouter_translation_cache")).rows.length, 0);
  await db.exec("UPDATE practice_budgets SET charged_micro = 0; INSERT INTO openrouter_translation_runs (id, month, status, cost_charge_micro, created_at) VALUES ('00000000-0000-0000-0000-000000000001', date_trunc('month', now() AT TIME ZONE 'UTC')::date, 'done', 1000000, now() - interval '1 hour')");
  assert.equal((await store.fill(inputs)).translated, 0); assert.equal(calls, 0);
});

test("provider failure and missing cost stay charged, with a 24-hour retry delay", async () => {
  const broken = new OpenRouterTranslationStore(pool, "fake", { check: provider.check, call: async () => { calls++; throw new Error("timeout"); } });
  await broken.fill(inputs); assert.equal(await budget(), L.reservationMicro);
  await age(); await broken.fill(inputs); assert.equal(calls, 1);
  const unknown = new OpenRouterTranslationStore(pool, "fake", { check: provider.check, call: async (key, batch) => ({ ...await provider.call(key, batch), costMicro: undefined }) });
  await unknown.fill([{ cacheKey: "two", original: "A second model" }]);
  assert.equal(await budget(), L.reservationMicro * 2);
});

test("unsafe credential fails before paid call and refunds reservation", async () => {
  const unsafe = new OpenRouterTranslationStore(pool, "fake", { check: async () => { throw new Error("key"); }, call: provider.call });
  await unsafe.fill(inputs); assert.equal(calls, 0); assert.equal(await budget(), 0);
  assert.equal((await store.read(inputs)).size, 0);
});

test("batch size and byte caps bound each request; retries stop after three attempts", async () => {
  await store.fill(Array.from({ length: 12 }, (_, index) => ({ cacheKey: String(index), original: "A headline" })));
  assert.equal((await db.query("SELECT * FROM openrouter_translation_cache")).rows.length, 8);
  await age();
  await db.exec("INSERT INTO openrouter_translation_cache (cache_key, attempts, retry_at) VALUES ('one', 3, now() - interval '1 day')");
  await store.fill(inputs); assert.equal(calls, 1);
});

test("unexpected cost overrun pauses both budgets instead of silently overspending", async () => {
  const overrun = new OpenRouterTranslationStore(pool, "fake", { check: provider.check, call: async (key, batch) => ({ ...await provider.call(key, batch), costMicro: L.reservationMicro + 1 }) });
  await overrun.fill(inputs); assert.equal(await budget(), 5_000_000);
  await age(); await store.fill([{ cacheKey: "two", original: "More news" }]); assert.equal(calls, 1);
});

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { PracticeStore } from "../src/lib/practice-store";
import { allLessons } from "../src/lib/curriculum";
import { PRACTICE_LIMITS as L, PracticeError } from "../src/lib/practice-policy";

// Real PostgreSQL SQL in memory; no production credentials or provider calls.
// PGlite has one connection, so this adapter queues complete transactions.
const db = new PGlite();
let queue = Promise.resolve();
async function lock() { const previous = queue; let unlock!: () => void; queue = new Promise(resolve => { unlock = resolve; }); await previous; return unlock; }
async function query(sql: string, values?: unknown[]) { const result = await db.query(sql, values); return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 }; }
const pool = {
  query: async (sql: string, values?: unknown[]) => { const unlock = await lock(); try { return await query(sql, values); } finally { unlock(); } },
  connect: async () => { const unlock = await lock(); return { query, release: unlock }; },
} as unknown as Pool;
const slug = allLessons[0].slug;
let calls = 0;
const provider = { check: async () => {}, call: async () => { calls++; return { reply: "Resposta de teste", generationId: randomUUID(), promptTokens: 100, completionTokens: 50, costMicro: 30 }; } };
const store = new PracticeStore(pool, { enabled: true, key: "fake-key-for-local-tests" }, provider);
before(async () => {
  await db.exec('CREATE TABLE "user" (id text PRIMARY KEY);');
  const migration = await readFile(new URL("../migrations/002-practice-chat.sql", import.meta.url), "utf8");
  await db.exec(migration); await db.exec(migration); // The additive migration is rerunnable.
});
after(async () => { await db.close(); });
async function user() { const id = randomUUID(); await db.query('INSERT INTO "user" (id) VALUES ($1)', [id]); return id; }
async function conversation(id: string, service = store) { const result = await service.execute(id, { operation: "start", lessonSlug: slug, requestId: randomUUID() }); return result.conversationId; }
function send(conversationId: string) { return { operation: "send" as const, lessonSlug: slug, requestId: randomUUID(), conversationId, message: "Organize uma semana fictícia de estudos." }; }

test("stored chat is user-scoped, duplicate calls are idempotent, and actual usage settles the reservation", async () => {
  const id = await user(); const other = await user(); const cid = await conversation(id); const input = send(cid);
  const initialCalls = calls;
  await store.execute(id, input); await store.execute(id, input);
  assert.equal(calls - initialCalls, 1);
  const state = await store.state(id, slug);
  assert.equal(state.conversations[0].turns[0].reply, "Resposta de teste");
  assert.equal(state.remaining.tokensLesson, L.tokensPerLesson - 150);
  assert.equal((await store.state(other, slug)).conversations.length, 0);
  await assert.rejects(store.execute(other, send(cid)), error => error instanceof PracticeError && error.status === 404);
  await assert.rejects(store.execute(id, { ...input, message: "Outro texto" }), error => error instanceof PracticeError && error.code === "conflict");
});

test("conversations cannot be reset by parallel starts", async () => {
  const id = await user();
  const results = await Promise.allSettled([conversation(id), conversation(id), conversation(id)]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 2);
  assert.equal((await store.state(id, slug)).remaining.conversations, 0);
});

test("a pending paid request blocks a second tab and is not resent with the same ID", async () => {
  const id = await user(); let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  let started!: () => void; const waiting = new Promise<void>(resolve => { started = resolve; });
  let paidCalls = 0;
  const slow = new PracticeStore(pool, { enabled: true, key: "fake" }, { check: async () => {}, call: async () => { paidCalls++; started(); await gate; return provider.call(); } });
  const cid = await conversation(id, slow); const input = send(cid);
  const first = slow.execute(id, input); await waiting;
  await slow.execute(id, input);
  await assert.rejects(slow.execute(id, send(cid)), error => error instanceof PracticeError && error.code === "pending");
  finish(); await first;
  assert.equal(paidCalls, 1);
});

test("unknown provider failure stays charged; retries never spend twice", async () => {
  const id = await user(); let paidCalls = 0;
  const broken = new PracticeStore(pool, { enabled: true, key: "fake" }, { check: async () => {}, call: async () => { paidCalls++; throw new Error("timeout"); } });
  const cid = await conversation(id, broken); const input = send(cid);
  await assert.rejects(broken.execute(id, input));
  await broken.execute(id, input);
  assert.equal(paidCalls, 1);
  const state = await broken.state(id, slug);
  assert.equal(state.conversations[0].turns[0].status, "failed");
  assert.equal(state.remaining.tokensLesson, L.tokensPerLesson - L.requestTokenReservation);
});

test("unsafe key fails before generation and releases its financial/token reservation", async () => {
  const id = await user(); let paidCalls = 0;
  const unsafe = new PracticeStore(pool, { enabled: true, key: "fake" }, { check: async () => { throw new PracticeError("unsafe_key", "Key limit missing", 503); }, call: async () => { paidCalls++; return provider.call(); } });
  const cid = await conversation(id, unsafe);
  await assert.rejects(unsafe.execute(id, send(cid)));
  assert.equal(paidCalls, 0);
  assert.equal((await unsafe.state(id, slug)).remaining.tokensLesson, L.tokensPerLesson);
});

test("a full shared monthly budget stops generation regardless of personal quota", async () => {
  const id = await user(); const cid = await conversation(id); const initialCalls = calls;
  await db.query("UPDATE practice_budgets SET charged_micro = $1", [L.monthlyBudgetMicro]);
  await assert.rejects(store.execute(id, send(cid)), error => error instanceof PracticeError && error.code === "monthly_limit");
  assert.equal(calls, initialCalls);
  assert.equal((await store.state(id, slug)).available, false);
  assert.equal((await store.state(id, slug)).remaining.messagesLesson, 12);
});

test("the last budget reservation cannot be spent by two users while generation is in flight", async () => {
  const firstUser = await user(); const secondUser = await user();
  let finish!: () => void; const gate = new Promise<void>(resolve => { finish = resolve; });
  let started!: () => void; const waiting = new Promise<void>(resolve => { started = resolve; });
  let paidCalls = 0;
  const slow = new PracticeStore(pool, { enabled: true, key: "fake" }, { check: async () => {}, call: async () => { paidCalls++; started(); await gate; return provider.call(); } });
  const firstConversation = await conversation(firstUser, slow); const secondConversation = await conversation(secondUser, slow);
  await db.query("UPDATE practice_budgets SET charged_micro = $1", [L.monthlyBudgetMicro - L.requestCostMicro]);
  const first = slow.execute(firstUser, send(firstConversation)); await waiting;
  await assert.rejects(slow.execute(secondUser, send(secondConversation)), error => error instanceof PracticeError && error.code === "monthly_limit");
  finish(); await first;
  assert.equal(paidCalls, 1);
});

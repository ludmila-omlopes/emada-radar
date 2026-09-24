import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { SocialSearchStore } from "../src/lib/social-search-store";
import { SOCIAL_QUERY, SOCIAL_QUERY_KEY, prepareSearch, SocialApiError, type SearchCursor } from "../src/lib/social-search";
import { socialProfiles } from "../src/lib/portal-types";
import { GET } from "../src/app/api/cron/social/route";

const db = new PGlite();
let queue = Promise.resolve();
async function lock() { const previous = queue; let unlock!: () => void; queue = new Promise(resolve => { unlock = resolve; }); await previous; return unlock; }
async function query(sql: string, values?: unknown[]) { const result = await db.query(sql, values); return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 }; }
const pool = { query: async (sql: string, values?: unknown[]) => { const unlock = await lock(); try { return await query(sql, values); } finally { unlock(); } }, connect: async () => { const unlock = await lock(); return { query, release: unlock }; } } as unknown as Pool;
const first = new Date("2026-09-24T09:00:00Z");
const next = new Date("2026-09-24T21:00:00Z");
const third = new Date("2026-09-25T09:00:00Z");
const users = { data: socialProfiles.map((p, i) => ({ username: p.username, id: String(i + 1) })) };
const post = (id = "2000000000000000010") => ({ id, author_id: "1", text: "New AI model", created_at: "2026-09-24T08:30:00Z", note_tweet: { text: "Full text: new AI model" } });
let paths: string[] = [];
let page: unknown;
let failure = false;
const store = new SocialSearchStore(pool, async path => {
  paths.push(path);
  if (failure) throw new SocialApiError("x_http_429");
  return path.startsWith("users/") ? users : page;
});
before(async () => { const sql = await readFile(new URL("../migrations/007-social-search.sql", import.meta.url), "utf8"); await db.exec(sql); await db.exec(sql); });
beforeEach(async () => {
  paths = []; failure = false; page = { data: [post()], meta: { result_count: 1 } };
  await db.exec("TRUNCATE social_search_posts, social_search_runs; UPDATE social_search_state SET cursor='{}', accounts='{}', lease_id=NULL, lease_until=NULL, last_error=NULL, last_success_at=NULL");
});
after(async () => { await db.close(); });

test("API query excludes replies/reposts, includes all profiles and avoids paid expansions", async () => {
  assert.match(SOCIAL_QUERY, /-is:retweet -is:reply/);
  assert.match(SOCIAL_QUERY, /AI OR LLM/);
  for (const p of socialProfiles) assert.ok(SOCIAL_QUERY.includes(`from:${p.username}`));
  assert.ok((await store.collect("fake", first)).ok);
  const params = new URLSearchParams(paths[1].split("?")[1]);
  assert.equal(params.get("max_results"), "10");
  assert.equal(params.has("expansions"), false);
  assert.equal(params.get("start_time"), "2026-09-23T09:00:00.000Z");
  const result = await store.read(first);
  assert.equal(result.items[0].text, "Full text: new AI model");
  assert.equal(result.items[0].profile.username, "sama");
  assert.ok(result.sources.every(s => s.status === "ok"));
  await store.read(first); await store.read(first);
  assert.equal(paths.length, 2, "page reads must never call X");
});

test("simultaneous cron calls and same-slot retries collect only once", async () => {
  const results = await Promise.all(Array.from({ length: 6 }, () => store.collect("fake", first)));
  assert.equal(results.filter(r => !r.skipped).length, 1);
  assert.equal(paths.length, 2);
  assert.equal((await store.collect("fake", new Date("2026-09-24T20:59:59Z"))).skipped, true);
  await store.collect("fake", next);
  assert.equal(paths.filter(p => p.startsWith("users/")).length, 1);
  assert.equal(paths.filter(p => p.startsWith("tweets/")).length, 2);
  const params = new URLSearchParams(paths[2].split("?")[1]);
  assert.equal(params.get("since_id"), post().id);
  assert.equal(params.has("start_time"), false);
  assert.equal((await store.read(next)).items.length, 1, "duplicate IDs must be upserted");
});

test("pagination preserves its window and advances the highest ID only after completion", async () => {
  page = { data: [post()], meta: { result_count: 1, next_token: "page-two" } };
  await store.collect("fake", first);
  const initial = new URLSearchParams(paths[1].split("?")[1]);
  page = { data: [post("2000000000000000009")], meta: { result_count: 1 } };
  await store.collect("fake", next);
  const continuation = new URLSearchParams(paths[2].split("?")[1]);
  assert.equal(continuation.get("next_token"), "page-two");
  assert.equal(continuation.get("end_time"), initial.get("end_time"));
  assert.equal(continuation.get("start_time"), initial.get("start_time"));
  page = { meta: { result_count: 0 } };
  await store.collect("fake", third);
  const resumed = new URLSearchParams(paths[3].split("?")[1]);
  assert.equal(resumed.get("since_id"), "2000000000000000010");
  assert.equal(resumed.has("next_token"), false);
  assert.equal((await store.read(third)).items.length, 2);
});

test("failed collections retain saved posts and cursor without immediate paid retries", async () => {
  await store.collect("fake", first);
  failure = true;
  const failed = await store.collect("fake", next);
  assert.equal(failed.ok, false);
  assert.equal((await store.collect("fake", next)).skipped, true);
  assert.equal(paths.length, 3);
  const saved = await store.read(next);
  assert.equal(saved.items.length, 1);
  assert.ok(saved.sources.every(s => s.status === "unavailable"));
  const state = (await db.query<{ cursor: SearchCursor; last_error: string }>("SELECT cursor,last_error FROM social_search_state")).rows[0];
  assert.equal(state.cursor.sinceId, post().id);
  assert.equal(state.last_error, "x_http_429");
});

test("partial or unexpected-author responses cannot advance the cursor", async () => {
  page = { data: [post()], meta: { result_count: 1 }, errors: [{ detail: "private provider details" }] };
  assert.equal((await store.collect("fake", first)).ok, false);
  page = { data: [{ ...post(), author_id: "999" }], meta: { result_count: 1 } };
  assert.equal((await store.collect("fake", next)).ok, false);
  assert.equal((await store.read(next)).items.length, 0);
  const state = (await db.query<{ cursor: SearchCursor; last_error: string }>("SELECT cursor,last_error FROM social_search_state")).rows[0];
  assert.equal(state.cursor.sinceId, undefined);
  assert.equal(state.last_error, "x_collection_failed");
});

test("empty results advance time, stale windows restart, and changed filters reset coverage", async () => {
  page = { meta: { result_count: 0 } };
  await store.collect("fake", first); await store.collect("fake", next);
  const params = new URLSearchParams(paths[2].split("?")[1]);
  assert.equal(params.get("start_time"), "2026-09-24T08:59:00.000Z");
  const stale = prepareSearch({ queryKey: SOCIAL_QUERY_KEY, window: { end: "2026-09-10T09:00:00Z", nextToken: "expired" } }, first);
  assert.equal(stale.expired, true); assert.equal(stale.params.has("next_token"), false);
  const aging = prepareSearch({ queryKey: SOCIAL_QUERY_KEY, window: { start: "2026-09-17T09:30:00Z", end: "2026-09-23T09:00:00Z", nextToken: "aging" } }, first);
  assert.equal(aging.expired, true, "pagination must consider the oldest covered time, not just its end");
  const changed = prepareSearch({ queryKey: "old", sinceId: "123" }, first);
  assert.equal(changed.params.has("since_id"), false);
  const old = await store.read(new Date("2026-09-26T00:00:00Z"));
  assert.ok(old.sources.every(s => s.status === "unavailable"));
});

test("cron rejects unauthenticated requests before accessing storage or X", async () => {
  const old = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = "test-only-cron-secret";
    assert.equal((await GET(new Request("https://example.test/api/cron/social"))).status, 401);
    assert.equal((await GET(new Request("https://example.test/api/cron/social", { headers: { authorization: "Bearer wrong" } }))).status, 401);
  } finally { if (old === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = old; }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { allLessons } from "../src/lib/curriculum";
import { PRACTICE_LIMITS as L, PracticeError, assertQuota, buildPracticeMessages, keyHasSafeLimit, practiceInput } from "../src/lib/practice-policy";
import { callPracticeModel, checkPracticeKey } from "../src/lib/openrouter";
import { practiceHandlers } from "../src/lib/practice-http";
import type { PracticeStore } from "../src/lib/practice-store";

test("strict inputs reject injected model, messages, limits and oversized text", () => {
  const input = { operation: "send", lessonSlug: allLessons[0].slug, requestId: randomUUID(), conversationId: randomUUID(), message: "Oi" };
  assert.equal(practiceInput.safeParse(input).success, true);
  for (const extra of [{ model: "expensive" }, { max_tokens: 100000 }, { messages: [] }, { role: "system" }]) assert.equal(practiceInput.safeParse({ ...input, ...extra }).success, false);
  assert.equal(practiceInput.safeParse({ ...input, message: "a".repeat(1501) }).success, false);
});

test("context is bounded in UTF8 bytes, retains the system and newest request, and drops complete old pairs", () => {
  const history = Array.from({ length: 5 }, () => ({ prompt: "ideia".repeat(100), reply: "resposta".repeat(200), status: "done" }));
  for (const lesson of allLessons) {
    const result = buildPracticeMessages(lesson, history, "Quero revisar a minha ideia.");
    assert.equal(result.contextTrimmed, true);
    assert.ok(Buffer.byteLength(JSON.stringify(result.messages)) <= L.maxContextBytes);
    assert.equal(result.messages[0].role, "system");
    assert.equal(result.messages.at(-1)?.content, "Quero revisar a minha ideia.");
    assert.equal(result.messages.length % 2, 0);
  }
  assert.throws(() => buildPracticeMessages(allLessons[0], [], "🧠".repeat(3000)), PracticeError);
});

test("quotas fail closed before another paid request", () => {
  const empty = { lessonMessages: 0, dayMessages: 0, conversationMessages: 0, lessonTokens: 0, dayTokens: 0, pending: false, cooldown: false };
  assert.doesNotThrow(() => assertQuota(empty));
  for (const change of [{ lessonMessages: 12 }, { dayMessages: 24 }, { conversationMessages: 6 }, { lessonTokens: 30000 - L.requestTokenReservation + 1 }, { dayTokens: 60000 }, { pending: true }, { cooldown: true }]) assert.throws(() => assertQuota({ ...empty, ...change }), PracticeError);
});

test("key must be limited to five dollars or less, monthly or lifetime, and must not be management", () => {
  assert.equal(keyHasSafeLimit({ limit: 5, limit_reset: "monthly", is_management_key: false }), true);
  assert.equal(keyHasSafeLimit({ limit: 3, limit_reset: null, is_management_key: false }), true);
  for (const change of [{ limit: null }, { limit: 50 }, { limit: 0 }, { limit_reset: "daily" }, { is_management_key: true }, { limit: NaN }]) assert.equal(keyHasSafeLimit({ limit: 5, limit_reset: "monthly", is_management_key: false, ...change }), false);
});

test("provider request pins model, output cap, price guard, privacy and no tools/fallback", async () => {
  let payload: Record<string, unknown> = {};
  const fetcher = (async (_url, init) => {
    payload = JSON.parse(init!.body as string);
    return Response.json({ id: "test-generation", choices: [{ message: { content: "Resposta fictícia." } }], usage: { prompt_tokens: 100, completion_tokens: 20, cost: 0.000018 } });
  }) as typeof fetch;
  const result = await callPracticeModel("test-not-a-real-key", [{ role: "user", content: "Oi" }], fetcher);
  assert.equal(result.costMicro, 18);
  assert.equal(payload.max_tokens, 500);
  assert.equal(payload.model, "google/gemini-2.5-flash-lite");
  assert.equal(payload.stream, false);
  assert.deepEqual(payload.reasoning, { enabled: false });
  assert.deepEqual(payload.provider, { allow_fallbacks: false, require_parameters: true, data_collection: "deny", max_price: { prompt: 0.25, completion: 1, request: 0 } });
  assert.equal(payload.tools, undefined);
  assert.equal(payload.plugins, undefined);
});

test("provider errors never reveal its body and do not retry", async () => {
  let calls = 0;
  const fetcher = (async () => { calls++; return new Response("secret-provider-body", { status: 500 }); }) as typeof fetch;
  await assert.rejects(callPracticeModel("test-key", [], fetcher), error => error instanceof PracticeError && !error.message.includes("secret-provider-body"));
  assert.equal(calls, 1);
  const unsafe = (async () => Response.json({ data: { limit: null, limit_reset: null, limit_remaining: null, is_management_key: false } })) as typeof fetch;
  await assert.rejects(checkPracticeKey("test-key", unsafe), PracticeError);
});

test("HTTP rejects unauthenticated, cross-origin, malformed and oversized requests before the store", async () => {
  let invoked = 0;
  const store = () => { invoked++; return {} as PracticeStore; };
  const anon = practiceHandlers({ user: async () => null, store, siteUrl: "https://academy.example" });
  const authenticated = practiceHandlers({ user: async () => ({ id: "test" }), store, siteUrl: "https://academy.example" });
  assert.equal((await anon.GET(new Request("https://academy.example/api/practice-chat?lesson=x"))).status, 401);
  const post = (body: string, origin = "https://academy.example") => new Request("https://academy.example/api/practice-chat", { method: "POST", headers: { origin, "content-type": "application/json" }, body });
  assert.equal((await authenticated.POST(post("{}", "https://evil.example"))).status, 403);
  assert.equal((await authenticated.POST(post("invalid"))).status, 400);
  assert.equal((await authenticated.POST(post("x".repeat(12001)))).status, 413);
  assert.equal((await authenticated.POST(post(JSON.stringify({ operation: "send", role: "system" })))).status, 400);
  assert.equal(invoked, 0);
});

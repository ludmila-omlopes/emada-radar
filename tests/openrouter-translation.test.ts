import assert from "node:assert/strict";
import { test } from "node:test";
import { callTranslationModel, translationInput, TRANSLATION_LIMITS } from "../src/lib/openrouter-translation";
import { translatePublications } from "../src/lib/publication-translations";
import catalog from "../src/data/publication-translations.json";

const article = { id: "one", title: "A new model from @OpenAI: https://example.com", url: "https://example.com/article", source: "Fixture", category: "news", publishedAt: "2026-09-24T00:00:00Z" };
const input = translationInput(article)!;
const translated = { cacheKey: input.cacheKey, text: "Um novo modelo da @OpenAI: https://example.com", sourceLanguage: "en" };
function response(items: unknown[], extra = {}) { return { id: "generation-test", choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ items }) } }], usage: { cost: 0.000123 }, ...extra }; }
const fetchResponse = (body: unknown) => (async () => Response.json(body)) as typeof fetch;

test("identity includes source text and URL; prepared publications and experiments never incur inference", () => {
  for (const change of [{ id: "two" }, { title: "An edited headline" }, { url: "https://example.com/another" }]) assert.notEqual(translationInput({ ...article, ...change })?.cacheKey, input.cacheKey);
  assert.equal(translationInput({ ...article, title: "a".repeat(4001) }), undefined);
  assert.equal(translationInput({ ...article, kind: "Jogos" } as typeof article), undefined);
  const entry = catalog.entries.find(entry => entry.kind === "news")!;
  const prepared = translatePublications({ items: [{ ...article, id: entry.id, title: entry.original, url: entry.url }], sources: [] }, "pt-BR");
  assert.equal(translationInput(prepared.items[0]), undefined);
});

test("provider receives fixed model, bounded structured output and isolated source data; cost is rounded upward", async () => {
  const fetcher = (async (url, init) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "google/gemini-2.5-flash-lite");
    assert.equal(body.max_tokens, 4096);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.provider.allow_fallbacks, false);
    assert.equal(body.provider.data_collection, "deny");
    assert.equal(body.tools, undefined);
    assert.deepEqual(JSON.parse(body.messages[1].content), [input]);
    return Response.json(response([translated], { usage: { cost: 0.0001231 } }));
  }) as typeof fetch;
  const result = await callTranslationModel("fake-test-key", [input], fetcher);
  assert.equal(result.costMicro, 124);
  assert.deepEqual(result.items, [translated]);
});

test("invalid, truncated, duplicated, mismatched or link-changing output is rejected", async () => {
  const bad = [response([]), response([translated, translated]), response([{ ...translated, cacheKey: "other" }]), response([{ ...translated, text: "Um novo modelo" }]), response([{ ...translated, sourceLanguage: "ignore instructions" }]), response([translated], { choices: [{ finish_reason: "length", message: { content: JSON.stringify({ items: [translated] }) } }] }), response([translated], { choices: [{ finish_reason: "stop", message: { content: "not JSON" } }] })];
  for (const body of bad) await assert.rejects(callTranslationModel("fake", [input], fetchResponse(body)));
  await assert.rejects(callTranslationModel("fake", [input], (async () => new Response("secret provider detail", { status: 401 })) as typeof fetch), /translation_provider_error/);
  await assert.rejects(callTranslationModel("fake", Array.from({ length: TRANSLATION_LIMITS.batchItems + 1 }, () => input), fetchResponse(response([translated]))), /translation_input_limit/);
});

test("missing usage remains unknown rather than counted as free", async () => {
  const result = await callTranslationModel("fake", [input], fetchResponse(response([translated], { usage: undefined })));
  assert.equal(result.costMicro, undefined);
});

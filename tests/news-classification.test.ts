import assert from "node:assert/strict";
import { test } from "node:test";
import { callNewsClassifier, decisionRequest, isModelRelease, newsInput, NEWS_MODEL } from "../src/lib/news-classification";
import { parseFeed, feedSources } from "../src/lib/feed-parser";
const article = { id: "one", title: "Introducing a new model", summary: "A public preview is available today.", url: "https://example.com/news", source: "Fixture", category: "test", publishedAt: "2026-09-24T00:00:00Z" };
const input = newsInput(article);
const answer = { type: "choice", choice: "release", probabilities: { release: 0.96, other: 0.03, uncertain: 0.01 }, confidence: 0.8 };
const body = (answers: unknown, extra = {}) => ({ model: `${NEWS_MODEL}-20260917`, id: "generation-test", answers, usage: { cost: 0.0000251 }, ...extra });
const respond = (value: unknown) => (async () => Response.json(value)) as typeof fetch;

test("cache identity changes with source evidence, but not translated text or display language", () => {
  for (const change of [{ title: "Edited" }, { summary: "New evidence" }, { url: "https://example.com/other" }, { source: "Another source" }]) assert.notEqual(newsInput({ ...article, ...change }).cacheKey, input.cacheKey);
  assert.equal(newsInput({ ...article, translation: { text: "Título traduzido", sourceLanguage: "en", locale: "pt-BR" } }).cacheKey, input.cacheKey);
});
test("each batch question explicitly references its own article, with bounded input and fixed routing", () => {
  const request = decisionRequest([input, newsInput({ ...article, id: "two", title: "Tutorial" })]);
  assert.equal(request.model, NEWS_MODEL);
  assert.match(request.questions.article0.instructions, /state.articles.article0/);
  assert.match(request.questions.article1.instructions, /state.articles.article1/);
  assert.equal(request.state.articles.article1.title, "Tutorial");
  assert.equal(request.provider.max_price.prompt, 0.05);
  assert.throws(() => decisionRequest(Array.from({ length: 9 }, () => input)), /limit/);
});
test("valid Jev decisions use the release probability, not distribution confidence, for highlighting", async () => {
  const result = await callNewsClassifier("fake", [input], respond(body({ article0: answer })));
  assert.equal(result.costMicro, 26);
  assert.equal(isModelRelease(result.items[0].decision), true);
  assert.equal(isModelRelease({ label: "release", releaseProbability: 0.89, confidence: 1 }), false);
  assert.equal(isModelRelease({ label: "uncertain", releaseProbability: 0.1, confidence: 1 }), false);
  assert.equal(isModelRelease({ label: "other", releaseProbability: 0, confidence: 1 }), false);
});
test("missing, malformed, wrong-model and inconsistent API responses never label a release", async () => {
  for (const invalid of [body({}), body({ wrong: answer }), body({ article0: { ...answer, choice: "invented" } }), body({ article0: { ...answer, probabilities: { release: 1, other: 1, uncertain: 1 } } }), body({ article0: { ...answer, choice: "other" } }), body({ article0: answer }, { model: "typesafe/jev-2" })]) await assert.rejects(callNewsClassifier("fake", [input], respond(invalid)));
  await assert.rejects(callNewsClassifier("fake", [input], (async () => new Response("private provider details", { status: 502 })) as typeof fetch), /news_provider_http_502/);
});
test("RSS summary supplies bounded plain-text evidence without changing source links", async () => {
  const xml = `<rss version="2.0"><channel><title>Example</title><item><title>New model</title><link>https://openai.com/news/example</link><pubDate>Thu, 24 Sep 2026 12:00:00 GMT</pubDate><description><![CDATA[<p>A new <b>model</b> is available.</p>${" text".repeat(500)}]]></description></item></channel></rss>`;
  const [parsed] = await parseFeed(xml, feedSources[0], new Date("2026-09-24T13:00:00Z"));
  assert.ok(parsed.summary.startsWith("A new model is available."));
  assert.ok(parsed.summary.length <= 1200); assert.ok(!parsed.summary.includes("<b>"));
  assert.equal(parsed.url, "https://openai.com/news/example");
});

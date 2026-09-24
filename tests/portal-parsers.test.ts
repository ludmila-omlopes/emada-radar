import test from "node:test";
import assert from "node:assert/strict";
import { liveBenchMetadata, newestUnique, numericCsv, parseAnthropicNews, parseExperiments, parseLiveBench, publicUrl } from "../src/lib/portal-parsers";

test("LiveBench averages categories equally, retains zero, and never turns missing data into zero", () => {
  const metadata = { a: { name: "A", organization: "Lab", url: "https://example.com/" }, b: { name: "B", organization: "Lab", url: "https://example.com/" } };
  const board = parseLiveBench("model,math1,math2,code\na,100,100,0\nb,80,,", { Mathematics: ["math1", "math2"], Coding: ["code"] }, metadata);
  assert.equal(board.models[0].scores.overall, 50);
  assert.equal(board.models[0].scores.Coding, 0);
  assert.equal(board.models[1].scores.Mathematics, 80);
  assert.equal(board.models[1].scores.Coding, null);
  assert.equal(board.models[1].scores.overall, null);
  assert.equal(board.models[0].scores.cost, null);
});

test("LiveBench cost uses question weights, and partial cost data stays unavailable", () => {
  const metadata = { a: { name: "A", organization: "Lab", url: "https://example.com/" }, b: { name: "B", organization: "Lab", url: "https://example.com/" } };
  const board = parseLiveBench("model,x,y\na,50,50\nb,50,50", { Coding: ["x"], Mathematics: ["y"] }, metadata, "model,x,nq_x,y,nq_y\na,10,10,90,90\nb,10,10,,");
  assert.equal(board.models[0].scores.cost, 2);
  assert.equal(board.models[1].scores.cost, null);
});

test("model metadata reads variants as data and does not evaluate remote scripts", () => {
  const script = `export const modelLinks = {
    "base": { displayName: "Model", organization: "Lab", url: "https://example.com", variants: [{ rawName: "high", displayName: "Model High" }] },
};
throw new Error("must never execute");`;
  const parsed = liveBenchMetadata(script);
  assert.equal(parsed.high.name, "Model High");
  assert.equal(parsed.high.organization, "Lab");
  assert.throws(() => liveBenchMetadata("export const modelLinks = {}; process.exit(1)"));
  assert.throws(() => numericCsv("model,x\na,1,2"));
});

test("external links reject active schemes and strip tracking", () => {
  assert.equal(publicUrl("javascript:alert(1)"), null);
  assert.equal(publicUrl("https://user:password@example.com/"), null);
  assert.equal(publicUrl("https://example.com/test?utm_source=x#heading"), "https://example.com/test");
});

test("community discovery removes unrelated, old and future stories", () => {
  const now = new Date("2026-09-23T12:00:00Z");
  const hit = { objectID: "123", title: "Show HN: A chess game to test LLM models", url: "https://example.com/game", author: "builder", created_at: "2026-09-22T12:00:00Z", points: 12, num_comments: 3 };
  const items = parseExperiments({ hits: [hit, { ...hit, objectID: "124", title: "The latest AI startup launch" }, { ...hit, objectID: "125", title: "Benchmarking a database" }, { ...hit, objectID: "126", created_at: "2025-01-01T12:00:00Z" }, { ...hit, objectID: "127", created_at: "2026-09-24T12:00:00Z" }] }, now);
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "Jogos");
  assert.equal(items[0].discussionUrl, "https://news.ycombinator.com/item?id=123");
});

test("Anthropic news uses original title and UTC date and fails visibly on schema changes", () => {
  const html = '<a href="/news/new-model"><time>Sep 22, 2026</time><span class="PublicationList__title">A model &amp; its evaluation</span></a>';
  const [article] = parseAnthropicNews(html, new Date("2026-09-23T12:00:00Z"));
  assert.equal(article.title, "A model & its evaluation");
  assert.equal(article.publishedAt, "2026-09-22T00:00:00.000Z");
  assert.throws(() => parseAnthropicNews("<html>unavailable</html>"));
});

test("Anthropic featured launches outside /news are included, external hosts are excluded", () => {
  const html = '<a href="/claude-launch"><h2>Introducing Claude</h2><time>Sep 22, 2026</time></a><a href="https://www.anthropic.com/features/research"><time>Sep 21, 2026</time><h4>Research update</h4></a><a href="https://example.com/"><time>Sep 22, 2026</time><h2>Unrelated external link</h2></a>';
  const articles = parseAnthropicNews(html, new Date("2026-09-23T12:00:00Z"));
  assert.equal(articles.length, 2);
  assert.equal(articles[0].url, "https://www.anthropic.com/claude-launch");
  assert.equal(articles[1].title, "Research update");
});

test("cross-source deduplication preserves the newest entry", () => {
  const items = newestUnique([{ url: "https://example.com/", publishedAt: "2026-09-21T00:00:00Z", title: "Older" }, { url: "https://example.com/", publishedAt: "2026-09-22T00:00:00Z", title: "Newer" }]);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Newer");
});

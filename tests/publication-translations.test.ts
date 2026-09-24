import assert from "node:assert/strict";
import { test } from "node:test";
import { translatePublications } from "../src/lib/publication-translations";
import catalog from "../src/data/publication-translations.json";
import { socialProfiles, type Collection, type Experiment, type PortalArticle, type SocialPost } from "../src/lib/portal-types";

test("publication catalog retains URLs, mentions, numerical results and truncated endings", () => {
  const ids = new Set<string>();
  for (const entry of catalog.entries) {
    const key = `${entry.kind}:${entry.id}`;
    assert.ok(!ids.has(key), key); ids.add(key);
    assert.ok(entry.original.trim() && entry.translations["pt-BR"].trim(), key);
    assert.ok(URL.canParse(entry.url), key);
    for (const pattern of [/https?:\/\/[^\s]+|pic\.twitter\.com\/[^\s]+/g, /@[\w/]+/g, /\d+(?:[.,]\d+)*/g]) {
      assert.deepEqual((entry.translations["pt-BR"].match(pattern) ?? []).sort(), (entry.original.match(pattern) ?? []).sort(), key);
    }
    assert.equal(entry.translations["pt-BR"].includes("…"), entry.original.includes("…"), key);
  }
});

test("translation follows the current source identity and text, preserving originals and falling back for new content", () => {
  const entry = catalog.entries.find(entry => entry.kind === "news")!;
  const article: PortalArticle = { id: entry.id, url: entry.url, title: entry.original, source: "Fixture", category: "news", publishedAt: "2026-09-24T00:00:00Z" };
  const collection: Collection<PortalArticle> = { items: [article], sources: [] };
  const translated = translatePublications(collection, "pt-BR");
  assert.equal(translated.items[0].translation?.text, entry.translations["pt-BR"]);
  assert.equal(translated.items[0].title, entry.original);
  assert.equal(collection.items[0].translation, undefined);
  assert.equal(translatePublications(collection, "en").items[0].translation, undefined);
  for (const change of [{ title: entry.original + " updated" }, { id: "new-publication" }, { url: "https://example.com/another-source" }]) {
    assert.equal(translatePublications({ items: [{ ...article, ...change }], sources: [] }, "pt-BR").items[0].translation, undefined);
  }
});

test("social posts and experiments use their own catalog entries and retain original links", () => {
  const entry = catalog.entries.find(entry => entry.kind === "social")!;
  const post: SocialPost = { id: entry.id, url: entry.url, text: entry.original, publishedAt: "2026-09-23T00:00:00Z", profile: socialProfiles[0] };
  const result = translatePublications({ items: [post], sources: [] }, "pt-BR");
  assert.equal(result.items[0].translation?.text, entry.translations["pt-BR"]);
  assert.equal(result.items[0].url, entry.url);
  const experiment = catalog.entries.find(entry => entry.kind === "experiment")!;
  const item: Experiment = { id: experiment.id, url: experiment.url, title: experiment.original, source: "HN", category: "experiment", publishedAt: "2026-09-24T00:00:00Z", kind: "Jogos", author: "fixture", discussionUrl: experiment.url, points: 1, comments: 0 };
  assert.equal(translatePublications({ items: [item], sources: [] }, "pt-BR").items[0].translation?.text, experiment.translations["pt-BR"]);
});

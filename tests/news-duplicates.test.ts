import test from "node:test";
import assert from "node:assert/strict";
import { callNewsDuplicates, duplicateInputs, duplicateRequest, isDuplicate, repeatedTitles, withoutDuplicates } from "../src/lib/news-duplicates";
import type { PortalArticle } from "../src/lib/portal-types";

const article = (id: string, title: string, source: string, publishedAt: string, extra: Partial<PortalArticle> = {}): PortalArticle => ({ id, url: `https://example.com/${id}`, title, source, category: "news", publishedAt, ...extra });
const deepmind = article("deepmind", "Gemini 4 Argon: built for your hardest problems", "Google DeepMind", "2026-10-13T15:00:00Z");
const blog = article("blog", "Gemini 4 Argon: Built for Your Hardest Problems!", "Google AI", "2026-10-13T16:00:00Z");
const outlet = article("outlet", "Google ships Argon, its new Gemini 4 model", "The Verge", "2026-10-14T09:00:00Z");
const meta = article("meta", "Introducing Muse Wonder and Muse Wonder Full", "Meta", "2026-10-12T10:00:00Z");
const old = article("old", "Gemini 4 Argon preview notes", "Example", "2026-10-01T10:00:00Z");

test("identical titles are repeats of the earliest copy, ignoring case, accents and punctuation", () => {
  assert.deepEqual([...repeatedTitles([blog, deepmind, meta])], [["blog", "deepmind"]]);
  assert.deepEqual([...repeatedTitles([article("a", "Modelo é lançado", "A", "2026-10-01T00:00:00Z"), article("b", "MODELO E LANCADO", "B", "2026-10-02T00:00:00Z")])], [["b", "a"]]);
});

test("each article is only compared with earlier, recent articles from other sources that share a distinctive word", () => {
  const inputs = duplicateInputs([outlet, deepmind, meta, old, article("same", "Gemini 4 Argon tips", "The Verge", "2026-10-14T10:00:00Z")]);
  const outletInput = inputs.find(input => input.articleId === "outlet")!;
  assert.deepEqual(outletInput.candidates.map(candidate => candidate.id), ["deepmind"]);
  assert.equal(inputs.some(input => input.articleId === "meta"), false);
  assert.equal(inputs.some(input => input.articleId === "deepmind"), false, "the copy published first has nothing earlier to match");
  assert.equal(inputs.find(input => input.articleId === "same")!.candidates.some(candidate => candidate.id === "outlet"), false, "same source is never a candidate");
  assert.notEqual(duplicateInputs([deepmind, outlet])[0].cacheKey, duplicateInputs([deepmind, { ...outlet, title: "Changed" }, article("x", "Argon", "X", "2026-10-13T00:00:00Z")]).find(input => input.articleId === "outlet")?.cacheKey);
  const request = duplicateRequest([outletInput]);
  assert.deepEqual(Object.keys(request.questions.article0.criteria), ["candidate0", "none"]);
  assert.equal(request.state.articles.article0.candidates.candidate0.title, deepmind.title);
});

const answer = (choice: string, probabilities: Record<string, number>) => ({ type: "choice", choice, confidence: 0.9, probabilities });
const respond = (body: unknown) => (async () => Response.json(body)) as unknown as typeof fetch;

test("Jev answers map to the matched article id, and malformed answers are rejected", async () => {
  const [input] = duplicateInputs([deepmind, outlet]);
  const matched = await callNewsDuplicates("fake", [input], respond({ id: "g", model: "typesafe/jev-1.13", answers: { article0: answer("candidate0", { candidate0: 0.93, none: 0.07 }) }, usage: { cost: 0.00002 } }));
  assert.deepEqual(matched.items[0].decision, { duplicateOf: "deepmind", probability: 0.93 });
  assert.equal(isDuplicate(matched.items[0].decision), true);
  assert.equal(matched.costMicro, 20);
  const unsure = await callNewsDuplicates("fake", [input], respond({ model: "typesafe/jev-1.13", answers: { article0: answer("candidate0", { candidate0: 0.6, none: 0.4 }) } }));
  assert.equal(isDuplicate(unsure.items[0].decision), false);
  const different = await callNewsDuplicates("fake", [input], respond({ model: "typesafe/jev-1.13", answers: { article0: answer("none", { candidate0: 0.1, none: 0.9 }) } }));
  assert.deepEqual(different.items[0].decision, { duplicateOf: null, probability: 0.9 });
  for (const invalid of [
    { model: "typesafe/jev-1.13", answers: { article0: answer("candidate1", { candidate0: 0.1, candidate1: 0.9 }) } },
    { model: "typesafe/jev-1.13", answers: { article0: answer("none", { candidate0: 0.9, none: 0.1 }) } },
    { model: "typesafe/jev-1.13", answers: { article0: answer("none", { candidate0: 0.5, none: 0.9 }) } },
    { model: "typesafe/jev-2", answers: { article0: answer("none", { candidate0: 0.1, none: 0.9 }) } },
    { model: "typesafe/jev-1.13", answers: {} },
  ]) await assert.rejects(callNewsDuplicates("fake", [input], respond(invalid)));
});

test("hidden copies give their release badge to the copy that stays", () => {
  const items = [{ ...blog, modelRelease: true }, deepmind, outlet, meta];
  const kept = withoutDuplicates(items, new Map([["blog", "deepmind"], ["outlet", "blog"]]));
  assert.deepEqual(kept.map(item => item.id), ["deepmind", "meta"]);
  assert.equal(kept[0].modelRelease, true);
  assert.equal(kept[1].modelRelease, undefined);
});

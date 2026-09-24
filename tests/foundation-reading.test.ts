import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FoundationReading } from "../src/components/foundation-reading";
import { foundationContent } from "../src/lib/foundation-content";

test("all 35 foundation pages render semantic diagrams and initially closed reflections", () => {
  const pages = foundationContent.flatMap(lesson => lesson.sections);
  assert.equal(pages.length, 35);
  for (const section of pages) {
    const html = renderToStaticMarkup(createElement(FoundationReading, { body: section.body, reading: section.reading, prompt: section.prompt }));
    assert.match(html, /role="list"/);
    assert.equal((html.match(/<li>/g) ?? []).length, section.reading.diagram.nodes.length);
    assert.match(html, /<details><summary>/);
    assert.doesNotMatch(html, /<details open/);
    assert.match(html, /aria-labelledby="learning-example-title"/);
    assert.match(html, /aria-labelledby="learning-reflection-title"/);
    assert.doesNotMatch(html, /Jeremy|Utley|AI Learning Series/);
    assert.equal(html.includes("Copiar pedido"), Boolean(section.prompt));
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size);
  }
});

test("authored examples render as text rather than executable HTML", () => {
  const section = foundationContent[0].sections[0];
  const reading = { ...section.reading, reflection: { question: "Uma pergunta com caracteres especiais?", answer: '<script>alert("example")</script>' } };
  const html = renderToStaticMarkup(createElement(FoundationReading, { body: section.body, reading }));
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script/);
});

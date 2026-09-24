import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatMarkdown } from "../src/components/chat-markdown";

const render = (text: string) => renderToStaticMarkup(createElement(ChatMarkdown, { text }));

test("chat renders lists, emphasis and code instead of raw Markdown", () => {
  const html = render("## Um plano\n\n- **Tempo:** duas horas\n- *Objetivo:* revisar\n\nUse `rascunho`.");
  assert.match(html, /<h4>Um plano<\/h4>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<li><strong>Tempo:<\/strong>/);
  assert.match(html, /<em>Objetivo:<\/em>/);
  assert.match(html, /<code>rascunho<\/code>/);
  assert.doesNotMatch(html, /<h[12]>|\*\*Tempo/);
});

test("untrusted chat output cannot inject HTML, trackers, scripts or clickable URLs", () => {
  const html = render('<script>alert(1)</script>\n\n<img src="https://example.invalid/track" onerror="alert(1)">\n\n![track](https://example.invalid/pixel)\n\n[texto visível](javascript:alert%281%29) e [site](https://example.invalid).\n\n**Conteúdo seguro**');
  assert.doesNotMatch(html, /<script|<img|<a\s|onerror|src=|href=|example\.invalid/);
  assert.match(html, /texto visível/);
  assert.match(html, /<strong>Conteúdo seguro<\/strong>/);
});

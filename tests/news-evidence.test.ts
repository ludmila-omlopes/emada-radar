import assert from "node:assert/strict";
import { test } from "node:test";
import { pageDescription, readNewsDescription } from "../src/lib/news-evidence";
test("extracts the official description with either attribute order and ignores body/script metadata", () => {
  assert.equal(pageDescription(`<head><meta name='description' content='General'><meta content="A new &quot;model&quot; &amp; API" property="og:description"></head><body><meta property="og:description" content="Ignore this"></body>`), 'A new "model" & API');
  assert.equal(pageDescription(`<head><script>const x = '<meta property="og:description" content="Injected">'</script></head>`), "");
  assert.ok(Buffer.byteLength(pageDescription(`<meta property="og:description" content="${"á".repeat(1000)}">`)) <= 600);
});
test("only source hosts are fetched and redirects to private or unrelated hosts are never followed", async () => {
  let calls = 0;
  const fetcher = (async () => { calls++; return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }); }) as typeof fetch;
  for (const url of ["http://openai.com/", "https://openai.com.evil.test/", "https://localhost/", "https://user:pass@openai.com/"]) assert.equal(await readNewsDescription(url, fetcher), "");
  assert.equal(calls, 0);
  assert.equal(await readNewsDescription("https://openai.com/index/example", fetcher), ""); assert.equal(calls, 1);
});
test("metadata failures fall back to RSS evidence; HTML is bounded and never executed", async () => {
  const html = `<head><meta name="description" content="New model released"></head><body>Long story</body>`;
  assert.equal(await readNewsDescription("https://openai.com/index/example", (async () => new Response(html, { headers: { "content-type": "text/html" } })) as typeof fetch), "New model released");
  assert.equal(await readNewsDescription("https://openai.com/index/example", (async () => { throw new Error("Timeout"); }) as typeof fetch), "");
  assert.equal(await readNewsDescription("https://openai.com/index/example", (async () => new Response("x".repeat(500001), { headers: { "content-type": "text/html" } })) as typeof fetch), "");
});

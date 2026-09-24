import test from "node:test";
import assert from "node:assert/strict";
import { parseSocialEmbed, selectedSocialPosts } from "../src/lib/social-posts";
import { socialProfiles } from "../src/lib/portal-types";
import selection from "../src/data/social-post-selection.json";

const profile = socialProfiles[0];
const now = new Date("2026-09-23T23:45:00Z");
const reference = selectedSocialPosts(selection, profile, now)[0];
const payload = {
  url: reference.url,
  author_url: "https://x.com/sama",
  type: "rich",
  html: '<blockquote class="twitter-tweet"><p>One &amp; two<br>Code: &lt;div&gt; &#x1F680; <a href="https://example.com">link</a><script>alert(1)</script></p>&mdash; Author <a href="https://x.com/sama">date</a></blockquote><script src="https://example.com/tracker.js"></script>',
};

test("oEmbed returns plain text, preserves breaks and emoji, and excludes attribution/scripts", () => {
  const post = parseSocialEmbed(payload, reference, profile);
  assert.equal(post.text, "One & two\nCode: <div> 🚀 link");
  assert.equal(post.url, reference.url);
  assert.equal(post.publishedAt, reference.publishedAt);
  assert.equal(post.collectedAt, selection.collectedAt);
  assert.equal(parseSocialEmbed({ ...payload, html: '<blockquote><p>Watch<a href="https://example.com">https://example.com</a></p></blockquote>' }, reference, profile).text, "Watch https://example.com");
});

test("oEmbed rejects mismatched authors, post IDs, untrusted hosts and malformed responses", () => {
  for (const changes of [
    { author_url: "https://x.com/other" },
    { author_url: "https://x.com.attacker.test/sama" },
    { author_url: "https://secret@x.com/sama" },
    { url: "https://x.com/sama/status/999" },
    { html: '<blockquote><script>code()</script></blockquote>' },
    { type: "photo" },
  ]) assert.throws(() => parseSocialEmbed({ ...payload, ...changes }, reference, profile));
  assert.equal(parseSocialEmbed({ ...payload, url: reference.url.replace("x.com", "twitter.com") + "?ref_src=embed", author_url: "https://twitter.com/SAMA" }, reference, profile).id, reference.id);
});

test("one-time collection expires and rejects future selections instead of posing as live data", () => {
  assert.equal(selectedSocialPosts(selection, profile, new Date("2026-09-22T00:00:00Z")).length, 0);
  assert.equal(selectedSocialPosts(selection, profile, new Date("2026-10-01T00:00:00Z")).length, 0);
  for (const person of socialProfiles) {
    const references = selectedSocialPosts(selection, person, now);
    assert.ok(references.length >= 3 && references.length <= 5);
    assert.ok(references.every(ref => ref.url.startsWith(`https://x.com/${person.username}/status/`)));
    assert.deepEqual(references.map(ref => ref.publishedAt), references.map(ref => ref.publishedAt).sort().reverse());
  }
});

test("selection deduplicates and excludes other profiles, old posts and future posts", () => {
  const post = { username: "sama", id: "123", publishedAt: "2026-09-22T00:00:00Z" };
  const raw = { collectedAt: selection.collectedAt, posts: [post, post, { ...post, id: "124", username: "other" }, { ...post, id: "125", publishedAt: "2026-07-01T00:00:00Z" }, { ...post, id: "126", publishedAt: "2026-09-24T00:00:00Z" }] };
  assert.deepEqual(selectedSocialPosts(raw, profile, now).map(ref => ref.id), ["123"]);
  assert.throws(() => selectedSocialPosts({ ...raw, posts: [{ ...post, id: "../other" }] }, profile, now));
});

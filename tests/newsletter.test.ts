import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { canOpenIssue, isEmptyDigest, issueKey, newsletterEmail, newToken, selectDigest, unsubscribeUrls, type Digest, type DigestContent, type DigestSources } from "../src/lib/newsletter";
import { confirmationEmail, digestEmail, type OutgoingEmail } from "../src/lib/newsletter-email";
import { resendSender, type SendResult, type Sender } from "../src/lib/newsletter-sender";
import { NewsletterStore } from "../src/lib/newsletter-store";
import type { Experiment, Leaderboard, PortalArticle, SocialPost } from "../src/lib/portal-types";

const db = new PGlite();
let queue = Promise.resolve();
async function lock() { const previous = queue; let unlock!: () => void; queue = new Promise(resolve => { unlock = resolve; }); await previous; return unlock; }
async function query(sql: string, values?: unknown[]) { const result = await db.query(sql, values); return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 }; }
const pool = { query: async (sql: string, values?: unknown[]) => { const unlock = await lock(); try { return await query(sql, values); } finally { unlock(); } }, connect: async () => { const unlock = await lock(); return { query, release: unlock }; } } as unknown as Pool;

before(async () => {
  const migration = await readFile(new URL("../migrations/008-newsletter.sql", import.meta.url), "utf8");
  await db.exec(migration); await db.exec(migration);
});
beforeEach(async () => { await db.exec("TRUNCATE newsletter_deliveries, newsletter_issues, newsletter_subscribers"); });
after(async () => { await db.close(); });

const MINUTE = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const start = new Date("2026-09-28T11:00:00Z");
const later = (ms: number) => new Date(start.getTime() + ms);
function recorder(outcome?: (emails: OutgoingEmail[]) => SendResult) {
  const calls: { emails: OutgoingEmail[]; key: string }[] = [];
  const send: Sender = async (emails, key) => {
    calls.push({ emails, key });
    await new Promise(resolve => setTimeout(resolve, 1));
    return outcome?.(emails) ?? { ok: true, ids: emails.map((_, index) => `id-${calls.length}-${index}`) };
  };
  return { calls, send };
}
const compose = (email: string) => (token: string): OutgoingEmail => ({ to: email, subject: "confirm", html: token, text: token });
const subscriber = async (email: string) => (await db.query<{ status: string; confirmed_at: Date | null; unsubscribed_at: Date | null; unsubscribe_token: string; confirmation_sent_at: Date | null }>("SELECT * FROM newsletter_subscribers WHERE email = $1", [email])).rows[0];

test("issue keys follow ISO weeks in UTC and issues open from Monday to Wednesday", () => {
  assert.equal(issueKey(new Date("2026-09-28T00:00:00Z")), "2026-W40");
  assert.equal(issueKey(new Date("2026-10-04T23:59:59Z")), "2026-W40");
  assert.equal(issueKey(new Date("2026-10-05T00:00:00Z")), "2026-W41");
  assert.equal(issueKey(new Date("2025-12-29T12:00:00Z")), "2026-W01");
  assert.equal(issueKey(new Date("2027-01-01T12:00:00Z")), "2026-W53");
  assert.deepEqual(["2026-09-28", "2026-09-30", "2026-10-01", "2026-10-04"].map(day => canOpenIssue(new Date(`${day}T11:00:00Z`))), [true, true, false, false]);
});

test("addresses are trimmed, lower-cased and validated", () => {
  assert.equal(newsletterEmail.parse("  Ana.Souza@Example.COM "), "ana.souza@example.com");
  for (const value of ["ana@", "ana@example", "not an email", `${"a".repeat(250)}@example.com`]) assert.equal(newsletterEmail.safeParse(value).success, false);
});

const now = start.getTime();
const at = (days: number) => new Date(now - days * DAY).toISOString();
const article = (id: string, source: string, days: number, extra: Partial<PortalArticle> = {}): PortalArticle => ({ id, title: `Title ${id}`, url: `https://example.com/${id}`, source, category: "News", publishedAt: at(days), ...extra });
const board = (id: string, status: Leaderboard["status"], models: [string, number][]): Leaderboard => ({ id, name: id === "livebench" ? "LiveBench" : "Artificial Analysis", url: `https://${id}.example`, release: "2026-09-01", fetchedAt: null, status, metrics: [{ key: "overall", label: "Overall", description: "", unit: "score" }], models: models.map(([name, score]) => ({ id: name, name, organization: "Lab", url: `https://example.com/${name}`, scores: { overall: score } })) });
const experiment = (id: string, points: number, days: number): Experiment => ({ ...article(id, "Hacker News", days), author: "someone", discussionUrl: `https://news.ycombinator.com/item?id=${id}`, points, comments: 3, kind: "Avaliações" });
const sources = (): DigestSources => ({
  news: [
    ...Array.from({ length: 6 }, (_, index) => article(`g${index}`, "Google AI", index * 0.1)),
    article("o1", "OpenAI", 2, { translation: { text: "Título traduzido", sourceLanguage: "en", locale: "pt-BR" } }),
    article("a1", "Anthropic", 1, { modelRelease: true, title: "  Introducing\n Model   X\t" }),
    article("old", "OpenAI", 10),
    article("bad", "OpenAI", 1, { url: "javascript:alert(1)" }),
    article("future", "OpenAI", -1),
  ],
  experiments: [experiment("e1", 10, 1), experiment("e2", 300, 2), experiment("e3", 50, 3), experiment("e4", 90, 4), experiment("e5", 999, 12)],
  social: [{ id: "1", text: "x".repeat(400), url: "https://x.com/sama/status/1", publishedAt: at(1), profile: { name: "Sam Altman", username: "sama", role: "OpenAI", initials: "SA" } } satisfies SocialPost],
  livebench: board("livebench", "ok", [["A", 70], ["B", 80], ["C", 60], ["D", 50], ["E", 40], ["F", 30]]),
  artificialAnalysis: board("aa", "unavailable", []),
});

test("the digest keeps the last seven days, separates releases and balances sources", () => {
  const digest = selectDigest(sources(), "pt-BR", now);
  assert.equal(digest.issueKey, "2026-W40");
  assert.deepEqual(digest.releases.map(item => item.url), ["https://example.com/a1"]);
  assert.equal(digest.releases[0].title, "Introducing Model X");
  assert.equal(digest.news.length, 6);
  assert.ok(digest.news.some(item => item.source === "OpenAI" && item.title === "Título traduzido" && item.translated));
  assert.ok(digest.news.every(item => !["old", "bad", "future"].some(id => item.url.endsWith(id))));
  assert.deepEqual(digest.ranking?.models.map(model => [model.rank, model.name]), [[1, "B"], [2, "A"], [3, "C"], [4, "D"], [5, "E"]]);
  assert.equal(digest.bestValue, null);
  assert.deepEqual(digest.experiments.map(item => item.points), [300, 90, 50]);
  assert.equal(Array.from(digest.voices[0].text).length, 280);
  assert.ok(digest.voices[0].text.endsWith("…"));
  assert.equal(isEmptyDigest(digest), false);
  assert.equal(isEmptyDigest(selectDigest({ ...sources(), news: [], experiments: [] }, "en", now)), true);
});

test("emails escape source text, link back with campaign tags and carry one-click unsubscribe", () => {
  const digest: Digest = { ...selectDigest(sources(), "pt-BR", now), releases: [{ title: `<script>alert(1)</script> & "quotes"`, url: "https://example.com/a?b=1&c=2", source: "Anthropic", publishedAt: at(1) }] };
  const urls = unsubscribeUrls("https://radar.example", "pt-BR", "t".repeat(43));
  const email = digestEmail("ana@example.com", digest, { baseUrl: "https://radar.example", unsubscribePage: urls.page, oneClick: urls.oneClick });
  assert.ok(!email.html.includes("<script>"));
  assert.ok(email.html.includes("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;"));
  assert.ok(email.html.includes('href="https://example.com/a?b=1&amp;c=2"'));
  assert.ok(email.html.includes("utm_campaign=2026-W40"));
  assert.ok(email.subject.startsWith("Radar da semana: <script>"));
  assert.deepEqual(email.headers, { "List-Unsubscribe": `<https://radar.example/api/newsletter/unsubscribe?token=${"t".repeat(43)}&locale=pt-BR>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
  assert.ok(email.text.includes(`Cancelar inscrição: ${urls.page}`));
  assert.ok(email.text.includes("Alguns títulos foram traduzidos"));
  const untranslated = digestEmail("ana@example.com", { ...digest, news: digest.news.map(item => ({ ...item, translated: undefined })) }, { baseUrl: "https://radar.example", unsubscribePage: urls.page, oneClick: urls.oneClick });
  assert.ok(untranslated.text.includes("Os títulos aparecem como publicados pelas fontes"));
  const english = digestEmail("ana@example.com", { ...digest, locale: "en" }, { baseUrl: "https://radar.example", unsubscribePage: urls.page, oneClick: urls.oneClick }, { test: true });
  assert.ok(english.subject.startsWith("[Test] This week's Radar:"));
  const confirm = confirmationEmail("ana@example.com", "en", "https://radar.example/en/newsletter/confirmar?token=abc&x=1");
  assert.equal(confirm.subject, "Confirm your Emada Radar subscription");
  assert.ok(confirm.html.includes('href="https://radar.example/en/newsletter/confirmar?token=abc&amp;x=1"'));
  assert.ok(confirm.text.includes("https://radar.example/en/newsletter/confirmar?token=abc&x=1"));
});

test("the Resend client uses the batch endpoint, idempotency keys and conservative failure states", async () => {
  const requests: { url: string; headers: Record<string, string>; body: unknown }[] = [];
  const respond = (status: number, body: unknown) => (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  const settings = { apiKey: "re_test", from: "Radar <radar@example.com>", baseUrl: "https://radar.example" };
  const one: OutgoingEmail = { to: "a@example.com", subject: "s", html: "<p>h</p>", text: "h", headers: { "List-Unsubscribe": "<https://radar.example/u>" } };
  assert.deepEqual(await resendSender(settings, respond(200, { id: "e1" }))([one], "key-1"), { ok: true, ids: ["e1"] });
  assert.equal(requests[0].url, "https://api.resend.com/emails");
  assert.equal(requests[0].headers["Idempotency-Key"], "key-1");
  assert.deepEqual(requests[0].body, { from: settings.from, to: ["a@example.com"], subject: "s", html: "<p>h</p>", text: "h", headers: one.headers });
  assert.deepEqual(await resendSender(settings, respond(200, { data: [{ id: "e1" }, { id: "e2" }] }))([one, one], "key-2"), { ok: true, ids: ["e1", "e2"] });
  assert.equal(requests[1].url, "https://api.resend.com/emails/batch");
  assert.equal((requests[1].body as unknown[]).length, 2);
  assert.deepEqual(await resendSender(settings, respond(429, { name: "daily_quota_exceeded", message: "secret detail" }))([one], "k"), { ok: false, delivered: "no", code: "resend_daily_quota_exceeded" });
  assert.deepEqual(await resendSender(settings, respond(500, { message: "boom" }))([one], "k"), { ok: false, delivered: "unknown", code: "resend_http_500" });
  assert.deepEqual(await resendSender(settings, respond(422, { name: "validation_error" }))([one], "k"), { ok: false, delivered: "no", code: "resend_validation_error", rejected: true });
  assert.deepEqual(await resendSender(settings, respond(403, { name: "validation_error" }))([one], "k"), { ok: false, delivered: "no", code: "resend_validation_error" });
  assert.deepEqual(await resendSender(settings, respond(409, { name: "invalid_idempotent_request" }))([one], "k"), { ok: false, delivered: "unknown", code: "resend_invalid_idempotent_request" });
  assert.deepEqual(await resendSender(settings, respond(200, { data: [{ id: "e1" }] }))([one, one], "k"), { ok: false, delivered: "unknown", code: "resend_unexpected_response" });
  assert.deepEqual(await resendSender(settings, (async () => { throw new Error("offline"); }) as typeof fetch)([one], "k"), { ok: false, delivered: "unknown", code: "resend_network" });
});

test("double opt-in sends one confirmation, throttles repeats and never reveals confirmed addresses", async () => {
  const { calls, send } = recorder();
  const store = new NewsletterStore(pool, send);
  assert.equal(await store.subscribe({ email: "ana@example.com", locale: "pt-BR", source: "radar" }, compose("ana@example.com"), start), "sent");
  assert.equal(calls.length, 1);
  assert.match(calls[0].key, /^confirm-[0-9a-f]{48}$/);
  const token = calls[0].emails[0].html;
  assert.equal(await store.subscribe({ email: "ana@example.com", locale: "pt-BR", source: "radar" }, compose("ana@example.com"), later(5 * MINUTE)), "skipped");
  assert.equal(calls.length, 1);
  assert.equal(await store.confirm(token, later(HOUR)), "confirmed");
  const confirmedAt = (await subscriber("ana@example.com")).confirmed_at?.getTime();
  assert.equal(await store.confirm(token, later(2 * HOUR)), "confirmed");
  assert.equal((await subscriber("ana@example.com")).confirmed_at?.getTime(), confirmedAt);
  assert.equal(await store.subscribe({ email: "ana@example.com", locale: "en", source: "footer" }, compose("ana@example.com"), later(DAY)), "skipped");
  assert.equal(calls.length, 1);
  assert.equal((await subscriber("ana@example.com")).status, "confirmed");
});

test("expired links fail and unsubscribing is idempotent and blocks the old confirmation link", async () => {
  const { calls, send } = recorder();
  const store = new NewsletterStore(pool, send);
  await store.subscribe({ email: "bia@example.com", locale: "en", source: "radar" }, compose("bia@example.com"), start);
  const token = calls[0].emails[0].html;
  assert.equal(await store.confirm(token, later(73 * HOUR)), "invalid");
  assert.equal(await store.confirm("short", start), "invalid");
  assert.equal(await store.confirm(newToken(), start), "invalid");
  assert.equal(await store.confirm(token, later(HOUR)), "confirmed");
  const { unsubscribe_token } = await subscriber("bia@example.com");
  assert.equal(await store.unsubscribe(unsubscribe_token, later(2 * HOUR)), "unsubscribed");
  assert.equal(await store.unsubscribe(unsubscribe_token, later(3 * HOUR)), "unsubscribed");
  assert.equal((await subscriber("bia@example.com")).unsubscribed_at?.getTime(), later(2 * HOUR).getTime());
  assert.equal(await store.unsubscribe(newToken(), start), "invalid");
  assert.equal(await store.confirm(token, later(4 * HOUR)), "invalid");
  assert.equal((await subscriber("bia@example.com")).status, "unsubscribed");
  // Subscribing again requires a fresh confirmation.
  assert.equal(await store.subscribe({ email: "bia@example.com", locale: "en", source: "radar" }, compose("bia@example.com"), later(5 * HOUR)), "sent");
  assert.equal((await subscriber("bia@example.com")).status, "pending");
  assert.equal(await store.confirm(calls[1].emails[0].html, later(6 * HOUR)), "confirmed");
});

test("rejected confirmations can be retried, uncertain ones stay throttled and the hourly cap reports busy", async () => {
  const rejected = new NewsletterStore(pool, recorder(() => ({ ok: false, delivered: "no", code: "resend_validation_error" })).send);
  assert.equal(await rejected.subscribe({ email: "caio@example.com", locale: "pt-BR", source: "radar" }, compose("caio@example.com"), start), "failed");
  assert.equal((await subscriber("caio@example.com")).confirmation_sent_at, null);
  const uncertain = recorder(() => ({ ok: false, delivered: "unknown", code: "resend_network" }));
  assert.equal(await new NewsletterStore(pool, uncertain.send).subscribe({ email: "caio@example.com", locale: "pt-BR", source: "radar" }, compose("caio@example.com"), later(MINUTE)), "failed");
  assert.equal(await new NewsletterStore(pool, uncertain.send).subscribe({ email: "caio@example.com", locale: "pt-BR", source: "radar" }, compose("caio@example.com"), later(2 * MINUTE)), "skipped");
  assert.equal(uncertain.calls.length, 1);
  await db.query("INSERT INTO newsletter_subscribers (id, email, locale, status, source, consent_version, consented_at, confirmation_sent_at, unsubscribe_token, created_at) SELECT gen_random_uuid(), 'cap' || n || '@example.com', 'en', 'pending', 'radar', 'v', $1, $1, md5(n::text) || md5(n::text), $1 FROM generate_series(1, 60) AS n", [later(30 * MINUTE)]);
  const { calls, send } = recorder();
  assert.equal(await new NewsletterStore(pool, send).subscribe({ email: "dani@example.com", locale: "en", source: "radar" }, compose("dani@example.com"), later(40 * MINUTE)), "busy");
  assert.equal(calls.length, 0);
});

async function addSubscribers(count: number, confirmedAt: Date, status = "confirmed", prefix = "reader") {
  await db.query("INSERT INTO newsletter_subscribers (id, email, locale, status, source, consent_version, consented_at, confirmed_at, unsubscribe_token, created_at) SELECT gen_random_uuid(), $4::text || n || '@example.com', CASE WHEN n % 2 = 0 THEN 'en' ELSE 'pt-BR' END, $3, 'radar', 'v', $1, $2, md5($4::text || n) || md5(n::text), $1 FROM generate_series(1, $5::int) AS n", [start, status === "pending" ? null : confirmedAt, status, prefix, count]);
}
const content = { "pt-BR": selectDigest(sources(), "pt-BR", now), en: selectDigest(sources(), "en", now) } satisfies DigestContent;
const toEmail = (_: DigestContent, reader: { email: string; locale: string }): OutgoingEmail => ({ to: reader.email, subject: reader.locale, html: "", text: "" });

test("each confirmed subscriber receives an issue once, even with concurrent runs", async () => {
  await addSubscribers(250, start);
  await addSubscribers(1, start, "pending", "pending");
  await addSubscribers(1, start, "unsubscribed", "gone");
  await addSubscribers(1, later(2 * HOUR), "confirmed", "late");
  const store = new NewsletterStore(pool, recorder().send);
  assert.equal(await store.openIssue("2026-W40", content, later(HOUR)), true);
  assert.equal(await store.openIssue("2026-W40", content, later(HOUR)), false);
  const { calls, send } = recorder();
  const sender = new NewsletterStore(pool, send);
  const results = await Promise.all([sender.sendIssue("2026-W40", toEmail, Date.now() + 30_000), sender.sendIssue("2026-W40", toEmail, Date.now() + 30_000)]);
  const recipients = calls.flatMap(call => call.emails.map(email => email.to));
  assert.equal(recipients.length, 250);
  assert.equal(new Set(recipients).size, 250);
  assert.ok(recipients.every(email => email.startsWith("reader")));
  assert.ok(calls.every(call => call.emails.length <= 100 && /^2026-W40-[0-9a-f]{48}$/.test(call.key)));
  assert.equal(results[0].sent + results[1].sent, 250);
  const batches = calls.length;
  assert.deepEqual(await sender.sendIssue("2026-W40", toEmail, Date.now() + 30_000), { sent: 0, pending: false });
  assert.equal(calls.length, batches);
  const stats = await sender.stats();
  assert.deepEqual([stats.confirmed, stats.pending, stats.unsubscribed], [251, 1, 1]);
  assert.equal(stats.issues[0].sent, 250);
  assert.ok(stats.issues[0].finishedAt);
});

test("rejected batches are released for the next run; possibly sent batches are never resent", async () => {
  await addSubscribers(150, start);
  const store = new NewsletterStore(pool, recorder().send);
  await store.openIssue("2026-W40", content, later(HOUR));
  const quota = new NewsletterStore(pool, recorder(() => ({ ok: false, delivered: "no", code: "resend_daily_quota_exceeded" })).send);
  assert.deepEqual(await quota.sendIssue("2026-W40", toEmail, Date.now() + 30_000), { sent: 0, pending: true, error: "resend_daily_quota_exceeded" });
  assert.equal((await db.query("SELECT 1 FROM newsletter_deliveries")).rows.length, 0);
  const timeout = new NewsletterStore(pool, recorder(() => ({ ok: false, delivered: "unknown", code: "resend_network" })).send);
  assert.deepEqual(await timeout.sendIssue("2026-W40", toEmail, Date.now() + 30_000), { sent: 0, pending: true, error: "resend_network" });
  const { calls, send } = recorder();
  assert.deepEqual(await new NewsletterStore(pool, send).sendIssue("2026-W40", toEmail, Date.now() + 30_000), { sent: 50, pending: false });
  assert.equal(calls.flatMap(call => call.emails).length, 50);
  const stats = await store.stats();
  assert.deepEqual([stats.issues[0].sent, stats.issues[0].unconfirmed, stats.issues[0].sending], [50, 100, 0]);
  assert.deepEqual(await store.sendIssue("2026-W41", toEmail, Date.now() + 30_000), { sent: 0, pending: false, error: "issue_missing" });
});

test("one refused address cannot block the issue; refusing every message is treated as configuration", async () => {
  await addSubscribers(5, start);
  await db.query("UPDATE newsletter_subscribers SET email = 'refused@example.com' WHERE email = 'reader3@example.com'");
  const store = new NewsletterStore(pool, recorder().send);
  await store.openIssue("2026-W40", content, later(HOUR));
  const picky = recorder(emails => emails.some(email => email.to === "refused@example.com") ? { ok: false, delivered: "no", code: "resend_validation_error", rejected: true } : { ok: true, ids: emails.map((_, index) => `id-${index}`) });
  assert.deepEqual(await new NewsletterStore(pool, picky.send).sendIssue("2026-W40", toEmail, Date.now() + 30_000), { sent: 4, pending: false });
  assert.deepEqual(picky.calls.map(call => call.emails.length), [5, 1, 1, 1, 1, 1]);
  assert.ok(picky.calls.slice(1).every(call => /^2026-W40-[0-9a-f-]{36}$/.test(call.key)));
  assert.deepEqual((await store.stats()).issues[0].rejected, 1);
  assert.deepEqual(await new NewsletterStore(pool, picky.send).sendIssue("2026-W40", toEmail, Date.now() + 30_000), { sent: 0, pending: false });
  await store.openIssue("2026-W41", content, later(HOUR));
  const misconfigured = recorder(() => ({ ok: false, delivered: "no", code: "resend_invalid_from_address", rejected: true }));
  assert.deepEqual(await new NewsletterStore(pool, misconfigured.send).sendIssue("2026-W41", toEmail, Date.now() + 30_000), { sent: 0, pending: true, error: "resend_invalid_from_address" });
  assert.equal((await db.query("SELECT 1 FROM newsletter_deliveries WHERE issue_key = '2026-W41'")).rows.length, 0);
});

test("unconfirmed requests are deleted after 30 days; confirmed and cancelled records stay", async () => {
  await addSubscribers(2, start, "pending", "pending");
  await addSubscribers(1, start, "confirmed", "reader");
  await addSubscribers(1, start, "unsubscribed", "gone");
  const store = new NewsletterStore(pool);
  assert.equal(await store.purgePending(later(29 * DAY)), 0);
  assert.equal(await store.purgePending(later(31 * DAY)), 2);
  assert.deepEqual((await db.query<{ status: string }>("SELECT status FROM newsletter_subscribers ORDER BY status")).rows.map(row => row.status), ["confirmed", "unsubscribed"]);
});

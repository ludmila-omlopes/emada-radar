import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { Locale } from "@/i18n/config";
import { CONSENT_VERSION, hashToken, isToken, NEWSLETTER_LIMITS as L, newToken, type DigestContent } from "./newsletter";
import type { OutgoingEmail } from "./newsletter-email";
import type { Sender } from "./newsletter-sender";

export type Subscriber = { id: string; email: string; locale: Locale; unsubscribe_token: string };
export type SendIssueResult = { sent: number; pending: boolean; error?: string };
const MINUTE = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const unconfigured: Sender = async () => ({ ok: false, delivered: "no", code: "sender_unconfigured" });

export class NewsletterStore {
  constructor(private readonly db: Pool, private readonly send: Sender = unconfigured) {}

  // Double opt-in. Returns the same outcome to the form for new, pending and confirmed
  // addresses; only capacity and provider failures are reported.
  async subscribe(input: { email: string; locale: Locale; source: string }, compose: (token: string) => OutgoingEmail, now = new Date()): Promise<"sent" | "skipped" | "busy" | "failed"> {
    const token = newToken();
    const hash = hashToken(token);
    let id: string;
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      // Serialized so the hourly cap and the per-address throttle hold across instances.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('emada-newsletter-subscribe', 0))");
      const existing = await client.query<{ id: string; status: string; confirmation_sent_at: Date | null }>("SELECT id, status, confirmation_sent_at FROM newsletter_subscribers WHERE email = $1 FOR UPDATE", [input.email]);
      const row = existing.rows[0];
      if (row?.status === "confirmed" || (row?.confirmation_sent_at && now.getTime() - row.confirmation_sent_at.getTime() < L.resendMinutes * MINUTE)) { await client.query("COMMIT"); return "skipped"; }
      const recent = await client.query<{ count: string }>("SELECT count(*) AS count FROM newsletter_subscribers WHERE confirmation_sent_at > $1", [new Date(now.getTime() - HOUR)]);
      if (Number(recent.rows[0].count) >= L.confirmationsPerHour) { await client.query("COMMIT"); return "busy"; }
      id = row?.id ?? randomUUID();
      const expires = new Date(now.getTime() + L.confirmHours * HOUR);
      if (row) await client.query("UPDATE newsletter_subscribers SET status = 'pending', locale = $2, source = $3, consent_version = $4, consented_at = $5, confirm_token_hash = $6, confirm_expires_at = $7, confirmation_sent_at = $5, confirmed_at = NULL WHERE id = $1", [id, input.locale, input.source, CONSENT_VERSION, now, hash, expires]);
      else await client.query("INSERT INTO newsletter_subscribers (id, email, locale, status, source, consent_version, consented_at, confirm_token_hash, confirm_expires_at, confirmation_sent_at, unsubscribe_token, created_at) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $6, $9, $6)", [id, input.email, input.locale, input.source, CONSENT_VERSION, now, hash, expires, newToken()]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
    const result = await this.send([compose(token)], `confirm-${hash.slice(0, 48)}`);
    if (result.ok) return "sent";
    // Nothing left the provider, so an immediate retry is allowed. Otherwise the throttle stays.
    if (result.delivered === "no") await this.db.query("UPDATE newsletter_subscribers SET confirmation_sent_at = NULL WHERE id = $1 AND confirm_token_hash = $2", [id, hash]);
    return "failed";
  }

  async confirm(token: string, now = new Date()): Promise<"confirmed" | "invalid"> {
    if (!isToken(token)) return "invalid";
    // A second click on the same link keeps the original confirmation date.
    const result = await this.db.query("UPDATE newsletter_subscribers SET status = 'confirmed', confirmed_at = COALESCE(confirmed_at, $2) WHERE confirm_token_hash = $1 AND (status = 'confirmed' OR (status = 'pending' AND confirm_expires_at > $2)) RETURNING id", [hashToken(token), now]);
    return result.rowCount ? "confirmed" : "invalid";
  }

  async unsubscribe(token: string, now = new Date()): Promise<"unsubscribed" | "invalid"> {
    if (!isToken(token)) return "invalid";
    // Clearing the confirmation hash stops an old confirmation link from subscribing again.
    const result = await this.db.query("UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = CASE WHEN status = 'unsubscribed' THEN unsubscribed_at ELSE $2 END, confirm_token_hash = NULL, confirm_expires_at = NULL WHERE unsubscribe_token = $1 RETURNING id", [token, now]);
    return result.rowCount ? "unsubscribed" : "invalid";
  }

  // Unconfirmed addresses are kept only while the request can still matter.
  async purgePending(now = new Date()) {
    const result = await this.db.query("DELETE FROM newsletter_subscribers WHERE status = 'pending' AND consented_at < $1", [new Date(now.getTime() - L.pendingDays * DAY)]);
    return result.rowCount ?? 0;
  }

  async hasIssue(key: string) {
    return Boolean((await this.db.query("SELECT 1 FROM newsletter_issues WHERE issue_key = $1", [key])).rowCount);
  }

  async openIssue(key: string, content: DigestContent, now = new Date()) {
    const result = await this.db.query("INSERT INTO newsletter_issues (issue_key, created_at, content) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING issue_key", [key, now, JSON.stringify(content)]);
    return result.rowCount === 1;
  }

  // Each confirmed subscriber is claimed at most once per issue, including across
  // concurrent runs. Subscribers confirmed after the issue opened wait for the next one.
  async sendIssue(key: string, compose: (content: DigestContent, subscriber: Subscriber) => OutgoingEmail, deadline: number, clock = () => new Date()): Promise<SendIssueResult> {
    const issue = await this.db.query<{ content: DigestContent }>("SELECT content FROM newsletter_issues WHERE issue_key = $1", [key]);
    if (!issue.rows[0]) return { sent: 0, pending: false, error: "issue_missing" };
    let sent = 0;
    while (Date.now() < deadline) {
      const claimed = await this.db.query<Subscriber>(`WITH claimed AS (
          INSERT INTO newsletter_deliveries (issue_key, subscriber_id, status, claimed_at)
          SELECT $1, s.id, 'sending', $2 FROM newsletter_subscribers s JOIN newsletter_issues i ON i.issue_key = $1
          WHERE s.status = 'confirmed' AND s.confirmed_at <= i.created_at
            AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.issue_key = $1 AND d.subscriber_id = s.id)
          ORDER BY s.confirmed_at, s.id LIMIT $3
          ON CONFLICT DO NOTHING RETURNING subscriber_id)
        SELECT s.id, s.email, s.locale, s.unsubscribe_token FROM newsletter_subscribers s JOIN claimed c ON c.subscriber_id = s.id`, [key, clock(), L.batchSize]);
      if (!claimed.rowCount) {
        await this.db.query("UPDATE newsletter_issues SET finished_at = COALESCE(finished_at, $2) WHERE issue_key = $1", [key, clock()]);
        return { sent, pending: false };
      }
      const ids = claimed.rows.map(row => row.id);
      const emails = claimed.rows.map(row => compose(issue.rows[0].content, row));
      const result = await this.send(emails, `${key}-${createHash("sha256").update([...ids].sort().join(",")).digest("hex").slice(0, 48)}`);
      if (result.ok) { await this.mark(key, ids, "sent", clock(), result.ids); sent += ids.length; continue; }
      // Possibly sent (timeout, 5xx): never resend automatically to avoid duplicates.
      if (result.delivered === "unknown") { await this.mark(key, ids, "unconfirmed", clock()); return { sent, pending: true, error: result.code }; }
      // Not sent (quota, credentials): release the claims for the next run.
      if (!result.rejected) { await this.release(key, ids); return { sent, pending: true, error: result.code }; }
      // The provider refuses a whole batch over one bad message. Retry one by one so a
      // single address cannot block every later subscriber on every run.
      const handled = new Set<string>();
      const refused: string[] = [];
      let stop: string | undefined;
      for (const [index, id] of ids.entries()) {
        if (Date.now() >= deadline) break;
        const single = ids.length === 1 ? result : await this.send([emails[index]], `${key}-${id}`);
        if (single.ok) { await this.mark(key, [id], "sent", clock(), single.ids); sent++; handled.add(id); continue; }
        if (single.rejected) { refused.push(id); handled.add(id); continue; }
        if (single.delivered === "unknown") { await this.mark(key, [id], "unconfirmed", clock()); handled.add(id); }
        stop = single.code;
        break;
      }
      // Every message refused points to configuration (such as the sender), not to addresses.
      if (refused.length === ids.length) { await this.release(key, ids); return { sent, pending: true, error: result.code }; }
      await this.mark(key, refused, "rejected", clock());
      const unhandled = ids.filter(id => !handled.has(id));
      await this.release(key, unhandled);
      if (unhandled.length) return { sent, pending: true, ...(stop ? { error: stop } : {}) };
    }
    return { sent, pending: true };
  }

  private async mark(key: string, ids: string[], status: "sent" | "unconfirmed" | "rejected", now: Date, providerIds: (string | null)[] = ids.map(() => null)) {
    if (ids.length) await this.db.query("UPDATE newsletter_deliveries d SET status = $2, sent_at = CASE WHEN $2::text = 'sent' THEN $3::timestamptz END, provider_id = v.provider_id FROM unnest($4::uuid[], $5::text[]) AS v(subscriber_id, provider_id) WHERE d.issue_key = $1 AND d.subscriber_id = v.subscriber_id", [key, status, now, ids, providerIds]);
  }

  private async release(key: string, ids: string[]) {
    if (ids.length) await this.db.query("DELETE FROM newsletter_deliveries WHERE issue_key = $1 AND subscriber_id = ANY($2::uuid[]) AND status = 'sending'", [key, ids]);
  }

  async stats() {
    const [subscribers, issues] = await Promise.all([
      this.db.query<{ status: string; count: string }>("SELECT status, count(*) AS count FROM newsletter_subscribers GROUP BY status"),
      this.db.query<{ issue_key: string; created_at: Date; finished_at: Date | null; sent: string; sending: string; unconfirmed: string; rejected: string }>("SELECT i.issue_key, i.created_at, i.finished_at, count(*) FILTER (WHERE d.status = 'sent') AS sent, count(*) FILTER (WHERE d.status = 'sending') AS sending, count(*) FILTER (WHERE d.status = 'unconfirmed') AS unconfirmed, count(*) FILTER (WHERE d.status = 'rejected') AS rejected FROM newsletter_issues i LEFT JOIN newsletter_deliveries d ON d.issue_key = i.issue_key GROUP BY i.issue_key ORDER BY i.created_at DESC LIMIT 8"),
    ]);
    const count = (status: string) => Number(subscribers.rows.find(row => row.status === status)?.count ?? 0);
    return {
      confirmed: count("confirmed"), pending: count("pending"), unsubscribed: count("unsubscribed"),
      issues: issues.rows.map(row => ({ key: row.issue_key, createdAt: row.created_at, finishedAt: row.finished_at, sent: Number(row.sent), sending: Number(row.sending), unconfirmed: Number(row.unconfirmed), rejected: Number(row.rejected) })),
    };
  }
}

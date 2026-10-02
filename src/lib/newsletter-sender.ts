import { databaseConfigured } from "./db";
import type { OutgoingEmail } from "./newsletter-email";

export type NewsletterSettings = { apiKey: string; from: string; replyTo?: string; baseUrl: string };
// "no": the provider refused the request before sending. "unknown": it may have sent.
// "rejected": the content itself was refused (400/422), so resending it unchanged fails again.
export type SendResult = { ok: true; ids: string[] } | { ok: false; delivered: "no" | "unknown"; code: string; rejected?: boolean };
export type Sender = (emails: OutgoingEmail[], idempotencyKey: string) => Promise<SendResult>;

// Server-only credentials. Never expose these through props or NEXT_PUBLIC_ variables.
export function newsletterSettings(): NewsletterSettings | null {
  const { NEWSLETTER_ENABLED, RESEND_API_KEY, NEWSLETTER_FROM, NEWSLETTER_REPLY_TO, BETTER_AUTH_URL } = process.env;
  if (NEWSLETTER_ENABLED !== "true" || !RESEND_API_KEY || !NEWSLETTER_FROM || !databaseConfigured()) return null;
  try { return { apiKey: RESEND_API_KEY, from: NEWSLETTER_FROM, replyTo: NEWSLETTER_REPLY_TO || undefined, baseUrl: new URL(BETTER_AUTH_URL ?? "").origin }; }
  catch { return null; }
}

// Resend REST API: /emails for one message, /emails/batch for up to 100.
// https://resend.com/docs/api-reference/emails/send-batch-emails
export function resendSender(settings: NewsletterSettings, fetcher: typeof fetch = fetch): Sender {
  return async (emails, idempotencyKey) => {
    const payload = emails.map(email => ({ from: settings.from, to: [email.to], subject: email.subject, html: email.html, text: email.text, ...(settings.replyTo ? { reply_to: settings.replyTo } : {}), ...(email.headers ? { headers: email.headers } : {}) }));
    let response: Response;
    try {
      response = await fetcher(`https://api.resend.com/emails${emails.length > 1 ? "/batch" : ""}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(emails.length > 1 ? payload : payload[0]),
        signal: AbortSignal.timeout(20_000),
      });
    } catch { return { ok: false, delivered: "unknown", code: "resend_network" }; }
    const body = await response.json().catch(() => null) as { id?: unknown; data?: { id?: unknown }[]; name?: unknown } | null;
    if (response.ok) {
      const ids = emails.length > 1 ? body?.data?.map(entry => entry.id) : [body?.id];
      return ids?.length === emails.length && ids.every(id => typeof id === "string") ? { ok: true, ids: ids as string[] } : { ok: false, delivered: "unknown", code: "resend_unexpected_response" };
    }
    // Provider messages are not logged or shown; only a sanitized error name is kept.
    const code = typeof body?.name === "string" && /^[a-z_]{1,60}$/.test(body.name) ? `resend_${body.name}` : `resend_http_${response.status}`;
    // 409 means the idempotency key was already used, so an earlier request may have sent.
    if (response.status >= 500 || response.status === 409) return { ok: false, delivered: "unknown", code };
    return { ok: false, delivered: "no", code, ...(response.status === 400 || response.status === 422 ? { rejected: true } : {}) };
  };
}

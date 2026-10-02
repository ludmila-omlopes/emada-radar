import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { canOpenIssue, isEmptyDigest, issueKey, unsubscribeUrls } from "@/lib/newsletter";
import { buildDigests } from "@/lib/newsletter-digest";
import { digestEmail } from "@/lib/newsletter-email";
import { newsletterSettings, resendSender } from "@/lib/newsletter-sender";
import { NewsletterStore } from "@/lib/newsletter-store";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
// Daily at 11h UTC. Monday opens the ISO week's issue (Tuesday/Wednesday retry if it
// could not open); every run continues deliveries interrupted by quota or time limits.
export async function GET(request: Request) {
  const started = Date.now();
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const settings = newsletterSettings();
  if (!settings) return Response.json({ error: "Newsletter não configurada." }, { status: 503 });
  try {
    const now = new Date();
    const key = issueKey(now);
    const store = new NewsletterStore(getDb(), resendSender(settings));
    const purged = await store.purgePending(now);
    let opened = false;
    if (!await store.hasIssue(key)) {
      if (!canOpenIssue(now)) return Response.json({ ok: true, issue: key, skipped: "outside_window", purged });
      const content = await buildDigests(now.getTime());
      if (isEmptyDigest(content["pt-BR"])) return Response.json({ ok: true, issue: key, skipped: "empty_digest", purged });
      opened = await store.openIssue(key, content, now);
    }
    const result = await store.sendIssue(key, (content, subscriber) => {
      const urls = unsubscribeUrls(settings.baseUrl, subscriber.locale, subscriber.unsubscribe_token);
      return digestEmail(subscriber.email, content[subscriber.locale], { baseUrl: settings.baseUrl, unsubscribePage: urls.page, oneClick: urls.oneClick });
    }, started + 45_000);
    return Response.json({ ok: !result.error, issue: key, opened, purged, ...result }, { status: result.error ? 502 : 200 });
  } catch { return Response.json({ error: "Falha no envio. Consulte os registros da execução." }, { status: 500 }); }
}

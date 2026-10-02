"use server";
import { randomUUID } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { databaseConfigured, getDb } from "@/lib/db";
import { confirmUrl, isToken, newsletterEmail, unsubscribeUrls } from "@/lib/newsletter";
import { buildDigests } from "@/lib/newsletter-digest";
import { confirmationEmail, digestEmail } from "@/lib/newsletter-email";
import { newsletterSettings, resendSender } from "@/lib/newsletter-sender";
import { NewsletterStore } from "@/lib/newsletter-store";
import { getSession, isAdmin } from "@/lib/session";

export type NewsletterFormState = { status: "idle" | "ok" | "error"; message: string; email?: string };
export type NewsletterTokenState = { status: "idle" | "ok" | "error"; message: string };
const signupSources = ["radar", "footer"];
const localeOf = (value: unknown): Locale => isLocale(value) ? value : defaultLocale;

export async function subscribeNewsletter(_: NewsletterFormState, formData: FormData): Promise<NewsletterFormState> {
  const locale = localeOf(formData.get("locale"));
  const t = await getTranslations({ locale, namespace: "Newsletter" });
  const typed = String(formData.get("email") ?? "").slice(0, 254);
  // Bots fill the hidden field: answer as if it worked and send nothing.
  if (formData.get("website")) return { status: "ok", message: t("success") };
  const settings = newsletterSettings();
  if (!settings) return { status: "error", message: t("unavailable"), email: typed };
  const email = newsletterEmail.safeParse(typed);
  if (!email.success) return { status: "error", message: t("invalid"), email: typed };
  const source = signupSources.find(value => value === formData.get("source")) ?? "radar";
  try {
    const result = await new NewsletterStore(getDb(), resendSender(settings)).subscribe({ email: email.data, locale, source }, token => confirmationEmail(email.data, locale, confirmUrl(settings.baseUrl, locale, token)));
    if (result === "busy") return { status: "error", message: t("busy"), email: typed };
    if (result === "failed") return { status: "error", message: t("failed"), email: typed };
    // Same answer for new, pending and confirmed addresses: the form never reveals who subscribed.
    return { status: "ok", message: t("success") };
  } catch { return { status: "error", message: t("failed"), email: typed }; }
}

async function tokenAction(kind: "confirm" | "unsubscribe", requestedLocale: string, token: string): Promise<NewsletterTokenState> {
  const t = await getTranslations({ locale: localeOf(requestedLocale), namespace: "Newsletter" });
  if (!isToken(token)) return { status: "error", message: t("missingToken") };
  if (!databaseConfigured()) return { status: "error", message: t("actionFailed") };
  try {
    const store = new NewsletterStore(getDb());
    if (kind === "confirm") return await store.confirm(token) === "confirmed" ? { status: "ok", message: t("confirmed") } : { status: "error", message: t("confirmInvalid") };
    return await store.unsubscribe(token) === "unsubscribed" ? { status: "ok", message: t("unsubscribed") } : { status: "error", message: t("unsubscribeInvalid") };
  } catch { return { status: "error", message: t("actionFailed") }; }
}
export async function confirmNewsletter(locale: string, token: string) { return tokenAction("confirm", locale, token); }
export async function unsubscribeNewsletter(locale: string, token: string) { return tokenAction("unsubscribe", locale, token); }

// Sends this week's preview in both languages to the signed-in administrator only.
export async function sendNewsletterTest() {
  const session = await getSession();
  if (!session || !await isAdmin()) return { ok: false, message: "Acesso restrito à administração." };
  const settings = newsletterSettings();
  if (!settings) return { ok: false, message: "Configure NEWSLETTER_ENABLED, RESEND_API_KEY e NEWSLETTER_FROM antes do teste." };
  try {
    const content = await buildDigests();
    const emails = locales.map(locale => {
      const urls = unsubscribeUrls(settings.baseUrl, locale, "teste");
      return digestEmail(session.user.email, content[locale], { baseUrl: settings.baseUrl, unsubscribePage: urls.page, oneClick: urls.oneClick }, { test: true });
    });
    const result = await resendSender(settings)(emails, `test-${randomUUID()}`);
    return result.ok ? { ok: true, message: `Enviamos ${emails.length} e-mails de teste (pt-BR e en) para ${session.user.email}.` } : { ok: false, message: `O envio falhou (${result.code}). Confira o domínio e a chave no Resend.` };
  } catch { return { ok: false, message: "Não foi possível montar ou enviar o teste." }; }
}

"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalLink as Link } from "@/components/portal-link";
import { confirmNewsletter, unsubscribeNewsletter, type NewsletterTokenState } from "@/app/actions/newsletter";

const initial: NewsletterTokenState = { status: "idle", message: "" };
// Link scanners open email links automatically, so the change only happens on an explicit click.
export function NewsletterTokenAction({ kind, locale, token }: { kind: "confirm" | "unsubscribe"; locale: string; token: string }) {
  const t = useTranslations("Newsletter");
  const run = kind === "confirm" ? confirmNewsletter : unsubscribeNewsletter;
  const [state, action, pending] = useActionState(async (): Promise<NewsletterTokenState> => run(locale, token), initial);
  const done = state.status === "ok";
  return <form action={action} className="newsletter-token-form">
    {!done && <Button type="submit" size="lg" variant={kind === "confirm" ? "default" : "outline"} disabled={pending}>{pending && <LoaderCircle size={16} className="animate-spin" aria-hidden="true"/>}{t(kind === "confirm" ? "confirmButton" : "unsubscribeButton")}</Button>}
    <p role="status" aria-live="polite" className={state.status === "error" ? "error-text" : "success-text"}>{done && <Check size={17} aria-hidden="true"/>}{state.message}</p>
    {done && <Link href="/" className="text-link">{t("backToRadar")}</Link>}
  </form>;
}

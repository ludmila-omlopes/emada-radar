"use client";
import { useActionState, useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeNewsletter, type NewsletterFormState } from "@/app/actions/newsletter";

const initial: NewsletterFormState = { status: "idle", message: "" };
export function NewsletterSignup({ variant = "block" }: { variant?: "block" | "compact" }) {
  const t = useTranslations("Newsletter");
  const locale = useLocale();
  const id = useId();
  const [state, action, pending] = useActionState(subscribeNewsletter, initial);
  const block = variant === "block";
  return <section className={`newsletter-signup ${variant}`} aria-labelledby={`${id}-title`}>
    <div className="newsletter-copy">
      {block && <p className="newsletter-eyebrow"><Mail size={14} aria-hidden="true"/>{t("eyebrow")}</p>}
      <h2 id={`${id}-title`}>{t(block ? "title" : "compactTitle")}</h2>
      {block && <p>{t("description")}</p>}
    </div>
    <form action={action} className="newsletter-form" aria-describedby={`${id}-note`}>
      <div className="newsletter-fields">
        <label htmlFor={`${id}-email`} className="sr-only">{t("emailLabel")}</label>
        <Input id={`${id}-email`} type="email" name="email" required maxLength={254} autoComplete="email" inputMode="email" placeholder={t("placeholder")} defaultValue={state.email} aria-invalid={state.status === "error" || undefined}/>
        {/* Hidden from people and assistive technology; bots that fill it are ignored. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="newsletter-trap" aria-hidden="true"/>
        <input type="hidden" name="locale" value={locale}/>
        <input type="hidden" name="source" value={block ? "radar" : "footer"}/>
        <Button type="submit" disabled={pending}>{pending ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true"/> : null}{pending ? t("sending") : t("submit")}{!pending && <ArrowRight size={16} aria-hidden="true"/>}</Button>
      </div>
      <p id={`${id}-note`} className="newsletter-note">{t("note")}</p>
      <p role="status" aria-live="polite" className={state.status === "error" ? "error-text newsletter-message" : "success-text newsletter-message"}>{state.message}</p>
    </form>
  </section>;
}

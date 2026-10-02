"use client";
import { useActionState, useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinAcademyWaitlist, type WaitlistFormState } from "@/app/actions/academy-waitlist";

const initial: WaitlistFormState = { status: "idle", message: "" };
export function AcademyWaitlistForm({ source, email }: { source: string; email?: string }) {
  const t = useTranslations("Waitlist");
  const locale = useLocale();
  const id = useId();
  const [state, action, pending] = useActionState(joinAcademyWaitlist, initial);
  return <form action={action} className="newsletter-form waitlist-form" aria-describedby={`${id}-note`}>
    <div className="newsletter-fields">
      <label htmlFor={`${id}-email`} className="sr-only">{t("emailLabel")}</label>
      <Input id={`${id}-email`} type="email" name="email" required maxLength={254} autoComplete="email" inputMode="email" placeholder={t("placeholder")} defaultValue={state.email ?? email} aria-invalid={state.status === "error" || undefined}/>
      {/* Hidden from people and assistive technology; bots that fill it are ignored. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="newsletter-trap" aria-hidden="true"/>
      <input type="hidden" name="locale" value={locale}/>
      <input type="hidden" name="source" value={source}/>
      <Button type="submit" disabled={pending || state.status === "ok"}>{pending ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true"/> : null}{pending ? t("sending") : t("submit")}{!pending && <ArrowRight size={16} aria-hidden="true"/>}</Button>
    </div>
    <p id={`${id}-note`} className="newsletter-note">{t("note")}</p>
    <p role="status" aria-live="polite" className={state.status === "error" ? "error-text newsletter-message" : "success-text newsletter-message"}>{state.message}</p>
  </form>;
}

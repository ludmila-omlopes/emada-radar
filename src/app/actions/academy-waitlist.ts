"use server";
import { getTranslations } from "next-intl/server";
import { defaultLocale, isLocale } from "@/i18n/config";
import { WAITLIST_SOURCES, AcademyWaitlist } from "@/lib/academy-waitlist";
import { databaseConfigured, getDb } from "@/lib/db";
import { newsletterEmail } from "@/lib/newsletter";
import { getSession } from "@/lib/session";

export type WaitlistFormState = { status: "idle" | "ok" | "error"; message: string; email?: string };

export async function joinAcademyWaitlist(_: WaitlistFormState, formData: FormData): Promise<WaitlistFormState> {
  const value = formData.get("locale");
  const locale = isLocale(value) ? value : defaultLocale;
  const t = await getTranslations({ locale, namespace: "Waitlist" });
  const typed = String(formData.get("email") ?? "").slice(0, 254);
  // Bots fill the hidden field: answer as if it worked and store nothing.
  if (formData.get("website")) return { status: "ok", message: t("success") };
  if (!databaseConfigured()) return { status: "error", message: t("unavailable"), email: typed };
  const email = newsletterEmail.safeParse(typed);
  if (!email.success) return { status: "error", message: t("invalid"), email: typed };
  const source = WAITLIST_SOURCES.find(item => item === formData.get("source")) ?? "modulos";
  try {
    const session = await getSession().catch(() => null);
    const result = await new AcademyWaitlist(getDb()).join({ email: email.data, locale, source, userId: session?.user.id });
    if (result === "busy") return { status: "error", message: t("busy"), email: typed };
    // Same answer for new and repeated addresses: the form never reveals who is on the list.
    return { status: "ok", message: t("success") };
  } catch { return { status: "error", message: t("failed"), email: typed }; }
}

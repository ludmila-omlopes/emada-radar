"use client";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { localeCookie, portalHref, stripLocale, type Locale } from "@/i18n/config";
export function LanguageSelector({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("Portal");
  const path = usePathname();
  const [pending, setPending] = useState(false);
  async function change(next: Locale) {
    if (next === locale) return;
    setPending(true);
    document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    sessionStorage.removeItem("localeSyncFailed");
    try {
      const response = await fetch("/api/preferences/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: next }), signal: AbortSignal.timeout(4000) });
      if (!response.ok || !(await response.json()).synced) sessionStorage.setItem("localeSyncFailed", "1");
    } catch { sessionStorage.setItem("localeSyncFailed", "1"); }
    // A full navigation updates the document language and server-rendered content together.
    const target = portalHref(next, stripLocale(path));
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- The root layout's html lang and messages must change together.
    location.assign(`${target === path && !/^\/(pt-BR|en)(\/|$)/.test(path) ? portalHref(next, "/") : target}${location.search}${location.hash}`);
  }
  return <label className={`language-selector ${className}`}><span className="sr-only">{t("language")}</span><select value={locale} disabled={pending} onChange={event => change(event.target.value as Locale)} aria-label={t("language")}><option value="pt-BR" lang="pt-BR">Português</option><option value="en" lang="en">English</option></select></label>;
}

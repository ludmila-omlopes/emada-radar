"use client";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import type { ContentTranslation } from "@/lib/portal-types";
export function TranslatedContent({ original, translation, href }: { original: string; translation?: ContentTranslation; href?: string }) {
  const t = useTranslations("Portal");
  const [showOriginal, setShowOriginal] = useState(false);
  const id = useId();
  const text = translation && !showOriginal ? translation.text : original;
  const lang = translation ? showOriginal ? translation.sourceLanguage.toLowerCase() : translation.locale : undefined;
  return <>{href ? <h3 id={id} lang={lang}><a href={href} target="_blank" rel="noreferrer">{text}<ArrowUpRight size={18} aria-hidden="true"/></a></h3> : <p id={id} lang={lang}>{text}</p>}{translation && <div className="translation-controls"><span>{t(translation.automatic ? "automaticTranslation" : "preparedTranslation")}</span><button type="button" aria-controls={id} aria-pressed={showOriginal} onClick={() => setShowOriginal(value => !value)}>{t(showOriginal ? "viewTranslation" : "viewOriginal")}</button></div>}</>;
}

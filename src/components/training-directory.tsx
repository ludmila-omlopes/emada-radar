"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, ChevronDown, Search } from "lucide-react";
import { aiTraining, trainingReviewedAt } from "@/data/ai-training";

export function TrainingDirectory() {
  const t = useTranslations("Training");
  const locale = useLocale() === "en" ? "en" : "pt-BR";
  const [query, setQuery] = useState("");
  const [certificatesOnly, setCertificatesOnly] = useState(false);
  const normalize = (value: string) => value.toLocaleLowerCase(locale).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const items = aiTraining.filter(item => (!certificatesOnly || item.credential !== "unconfirmed") && normalize(`${item.name} ${item.provider} ${item.copy[locale].description} ${item.copy[locale].audience}`).includes(normalize(query.trim())));
  return <>
    <div className="training-controls">
      <label className="portal-search"><Search size={17} aria-hidden="true"/><span className="sr-only">{t("search")}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("search")}/></label>
      <label className="training-toggle"><input type="checkbox" checked={certificatesOnly} onChange={event => setCertificatesOnly(event.target.checked)}/>{t("onlyCredentials")}</label>
    </div>
    <p className="training-count" role="status">{t("count", { count: items.length })}</p>
    <div className="training-list">
      {items.map(item => { const copy = item.copy[locale]; return <article key={item.id} className="training-row" aria-labelledby={`training-${item.id}`}>
        <div className="training-course">
          <p className="training-provider">{item.provider}</p>
          <h2 id={`training-${item.id}`}><a href={item.url} target="_blank" rel="noreferrer">{item.name}<ArrowUpRight size={20} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a></h2>
          <p className="training-description">{copy.description}</p>
          <ul className="training-meta" aria-label={t("courseDetails")}><li>{copy.audience}</li><li>{copy.duration}</li><li>{copy.languages}</li></ul>
        </div>
        <div className="training-credential">
          <p className={item.credential === "unconfirmed" ? "training-credential-neutral" : "training-credential-title"}>{t(item.credential)}</p>
          {item.credential !== "unconfirmed" && <p className="training-issuer">{t("issuedBy", { provider: item.provider })}</p>}
          <details><summary>{t("requirements")}<ChevronDown size={14} aria-hidden="true"/></summary><p>{copy.requirements}</p><a href={item.source} target="_blank" rel="noreferrer">{t("officialSource")}<ArrowUpRight size={14} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a></details>
        </div>
      </article>; })}
    </div>
    {!items.length && <div className="training-empty"><p>{t("empty")}</p><button onClick={() => { setQuery(""); setCertificatesOnly(false); }}>{t("reset")}</button></div>}
    <aside className="training-note"><h2>{t("credentialTitle")}</h2><p>{t("credentialNote")}</p><p>{t("reviewed")} <time dateTime={trainingReviewedAt}>{new Date(`${trainingReviewedAt}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>. {t("reviewNote")}</p></aside>
  </>;
}

"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Award, ChevronDown, Search } from "lucide-react";
import { aiTraining, trainingReviewedAt } from "@/data/ai-training";
import { delay } from "./radar";

export function TrainingDirectory() {
  const t = useTranslations("Training");
  const locale = useLocale() === "en" ? "en" : "pt-BR";
  const [query, setQuery] = useState("");
  const [certificatesOnly, setCertificatesOnly] = useState(false);
  const normalize = (value: string) => value.toLocaleLowerCase(locale).normalize("NFD").replace(/[̀-ͯ]/g, "");
  const items = aiTraining.filter(item => (!certificatesOnly || item.credential !== "unconfirmed") && normalize(`${item.name} ${item.provider} ${item.copy[locale].description} ${item.copy[locale].audience}`).includes(normalize(query.trim())));
  return <>
    <div className="training-controls radar-block">
      <label className="portal-search"><Search size={17} aria-hidden="true"/><span className="sr-only">{t("search")}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("search")}/></label>
      <div className="portal-filters" role="group" aria-label={t("onlyCredentials")}>
        <button type="button" aria-pressed={!certificatesOnly} className={!certificatesOnly ? "selected" : ""} onClick={() => setCertificatesOnly(false)}>{t("filterAll")}</button>
        <button type="button" aria-pressed={certificatesOnly} className={certificatesOnly ? "selected" : ""} onClick={() => setCertificatesOnly(true)}><Award size={14} aria-hidden="true"/>{t("onlyCredentials")}</button>
      </div>
    </div>
    <p className="training-count" role="status">{t("count", { count: items.length })}</p>
    <div className="training-grid">
      {items.map((item, index) => { const copy = item.copy[locale]; const credential = item.credential !== "unconfirmed"; return <article key={item.id} className="training-card rc-rise" style={delay(120 + index * 70)} aria-labelledby={`training-${item.id}`}>
        <div className="training-card-top">
          <span className="training-avatar" aria-hidden="true">{item.provider.slice(0, 1)}</span>
          <p className="training-provider">{item.provider}</p>
          <span className={credential ? "training-pill" : "training-pill neutral"}>{credential && <Award size={13} aria-hidden="true"/>}{t(item.credential)}</span>
        </div>
        <h2 id={`training-${item.id}`}><a href={item.url} target="_blank" rel="noreferrer">{item.name}<ArrowUpRight size={18} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a></h2>
        <p className="training-description">{copy.description}</p>
        <ul className="training-meta" aria-label={t("courseDetails")}><li>{copy.audience}</li><li>{copy.duration}</li><li>{copy.languages}</li></ul>
        <details className="training-requirements">
          <summary>{t("requirements")}<ChevronDown size={14} aria-hidden="true"/></summary>
          {credential && <p className="training-issuer">{t("issuedBy", { provider: item.provider })}</p>}
          <p>{copy.requirements}</p>
          <a href={item.source} target="_blank" rel="noreferrer">{t("officialSource")}<ArrowUpRight size={14} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a>
        </details>
      </article>; })}
    </div>
    {!items.length && <div className="training-empty"><p>{t("empty")}</p><button onClick={() => { setQuery(""); setCertificatesOnly(false); }}>{t("reset")}</button></div>}
    <aside className="training-note"><h2>{t("credentialTitle")}</h2><p>{t("credentialNote")}</p><p>{t("reviewed")} <time dateTime={trainingReviewedAt}>{new Date(`${trainingReviewedAt}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>. {t("reviewNote")}</p></aside>
  </>;
}

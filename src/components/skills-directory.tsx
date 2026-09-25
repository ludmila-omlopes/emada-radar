"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownToLine, ArrowUpRight, Check, ChevronDown, Copy, Search, Star } from "lucide-react";
import { agentSkills, repositoryFor, skillCategories, skillInstallCommand, skillLeaderboard, skillRepositories, skillSource, type AgentSkill, type SkillCategory } from "@/data/agent-skills";

function InstallSkill({ skill }: { skill: AgentSkill }) {
  const t = useTranslations("Skills");
  const locale = useLocale() === "en" ? "en" : "pt-BR";
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const command = skillInstallCommand(skill);
  return <details className="skill-install">
    <summary>{t("install")}<ChevronDown size={15} aria-hidden="true"/></summary>
    <p>{t("installHelp")}</p>
    {skill.note && <p>{skill.note[locale]}</p>}
    <code>{command}</code>
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(command); setStatus("copied"); }
      catch { setStatus("error"); }
    }}>{status === "copied" ? <Check size={15} aria-hidden="true"/> : <Copy size={15} aria-hidden="true"/>}{t("copy")}</button>
    <span role="status">{status === "copied" ? t("copied") : status === "error" ? t("copyError") : ""}</span>
    <a href={`https://github.com/${repositoryFor(skill).repo}#readme`} target="_blank" rel="noreferrer">{t("requirements")}<ArrowUpRight size={14} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a>
  </details>;
}

export function SkillsDirectory() {
  const t = useTranslations("Skills");
  const locale = useLocale() === "en" ? "en" : "pt-BR";
  const [view, setView] = useState<"skills" | "repositories">("skills");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SkillCategory | "all">("all");
  const [officialOnly, setOfficialOnly] = useState(false);
  const [sort, setSort] = useState<"adoption" | "name">("adoption");
  const normalize = (value: string) => value.toLocaleLowerCase(locale).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const matches = (value: string) => terms.every(term => normalize(value).includes(term));
  const skills = agentSkills.filter(skill => {
    const repo = repositoryFor(skill);
    return (category === "all" || skill.category === category) && (!officialOnly || repo.official) && matches(`${skill.id} ${repo.name} ${repo.repo} ${skill.description[locale]} ${t(`categories.${skill.category}`)}`);
  }).sort((a, b) => sort === "name" ? a.id.localeCompare(b.id, locale) : b.installs - a.installs);
  const repositories = skillRepositories.filter(repo => (category === "all" || repo.categories.includes(category)) && (!officialOnly || repo.official) && matches(`${repo.name} ${repo.repo} ${repo.description[locale]} ${repo.categories.map(value => t(`categories.${value}`)).join(" ")}`))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, locale) : b.stars - a.stars);
  const count = view === "skills" ? skills.length : repositories.length;
  const number = (value: number) => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);

  return <section className="skills-directory" aria-label={t("directory")}>
    <div className="skills-views" role="group" aria-label={t("view")}>
      <button type="button" aria-pressed={view === "skills"} onClick={() => setView("skills")}>{t("skills")}<span>{agentSkills.length}</span></button>
      <button type="button" aria-pressed={view === "repositories"} onClick={() => setView("repositories")}>{t("repositories")}<span>{skillRepositories.length}</span></button>
    </div>
    <div className="skills-controls">
      <label className="portal-search"><Search size={18} aria-hidden="true"/><span className="sr-only">{t("search")}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("search")}/></label>
      <label className="skills-sort"><span>{t("sort")}</span><select value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="adoption">{t(view === "skills" ? "mostInstalled" : "mostStarred")}</option><option value="name">{t("alphabetical")}</option></select></label>
      <label className="training-toggle"><input type="checkbox" checked={officialOnly} onChange={event => setOfficialOnly(event.target.checked)}/>{t("officialOnly")}</label>
    </div>
    <div className="portal-filters skills-filters" role="group" aria-label={t("filterCategory")}>
      {(["all", ...skillCategories] as const).map(value => <button key={value} type="button" className={category === value ? "selected" : ""} aria-pressed={category === value} onClick={() => setCategory(value)}>{t(`categories.${value}`)}</button>)}
    </div>
    <div className="skills-results-heading"><p role="status">{t(view === "skills" ? "skillCount" : "repoCount", { count })}</p><span>{t(view === "skills" ? "installsSource" : "starsSource")}</span></div>
    {view === "skills" ? <div className="skills-grid">{skills.map(skill => {
      const repo = repositoryFor(skill);
      return <article className="skill-card" key={skill.id} aria-labelledby={`skill-${skill.id}`}>
        <div className="skill-card-meta"><span>{t(`categories.${skill.category}`)}</span>{repo.official && <span className="skill-official">{t("official")}</span>}</div>
        <h2 id={`skill-${skill.id}`}><a href={skillSource(skill)} target="_blank" rel="noreferrer">{skill.id}<ArrowUpRight size={18} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a></h2>
        <a className="skill-author" href={`https://github.com/${repo.repo}`} target="_blank" rel="noreferrer">{repo.repo}<span className="sr-only"> {t("newTab")}</span></a>
        <p className="skill-description">{skill.description[locale]}</p>
        <div className="skill-card-links">
          <a className="skill-metric" href={skillLeaderboard(skill)} target="_blank" rel="noreferrer" aria-label={t("installMetric", { count: number(skill.installs) })}><ArrowDownToLine size={15} aria-hidden="true"/><strong>≈ {number(skill.installs)}</strong><span>{t("installs")}</span><span className="sr-only"> {t("newTab")}</span></a>
          <a href={skillSource(skill)} target="_blank" rel="noreferrer">{t("readSkill")}<ArrowUpRight size={15} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a>
        </div>
        <InstallSkill skill={skill}/>
      </article>;
    })}</div> : <div className="skill-repositories">{repositories.map(repo => <article className="skill-repository" key={repo.id} aria-labelledby={`repo-${repo.id}`}>
      <div><div className="skill-card-meta"><span>{t(`kinds.${repo.kind}`)}</span>{repo.official && <span className="skill-official">{t("official")}</span>}</div>
        <h2 id={`repo-${repo.id}`}><a href={`https://github.com/${repo.repo}`} target="_blank" rel="noreferrer">{repo.name}<ArrowUpRight size={20} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a></h2>
        <p className="skill-author">{repo.repo}</p><p className="skill-description">{repo.description[locale]}</p>
        <ul className="skill-repo-categories" aria-label={t("filterCategory")}>{repo.categories.map(value => <li key={value}>{t(`categories.${value}`)}</li>)}</ul>
      </div>
      <a className="skill-repo-stars" href={`https://github.com/${repo.repo}/stargazers`} target="_blank" rel="noreferrer" aria-label={t("starMetric", { count: repo.stars.toLocaleString(locale) })}><Star size={19} aria-hidden="true"/><strong>{number(repo.stars)}</strong><span>{t("stars")}</span><span className="sr-only"> {t("newTab")}</span></a>
    </article>)}</div>}
    {count === 0 && <div className="training-empty"><p>{t("empty")}</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); setOfficialOnly(false); }}>{t("reset")}</button></div>}
  </section>;
}

import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { SkillsDirectory } from "@/components/skills-directory";
import { skillsReviewedAt } from "@/data/agent-skills";
import "./skills.css";

export async function generateMetadata() {
  const t = await getTranslations("Skills");
  return { title: t("title"), description: t("description") };
}

export default async function SkillsPage() {
  const t = await getTranslations("Skills");
  const locale = await getLocale();
  return <div className="page-container portal-page skills-page">
    <header className="portal-heading"><div><h1>{t("title")}</h1><p>{t("description")}</p></div></header>
    <div className="skills-intro">
      <div><BookOpen size={21} aria-hidden="true"/><div><h2>{t("introTitle")}</h2><p>{t("intro")}</p><a href="https://agentskills.io/home" target="_blank" rel="noreferrer">{t("standard")}<ArrowUpRight size={15} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a></div></div>
      <p className="skills-reviewed">{t("reviewed")}<time dateTime={skillsReviewedAt}>{new Date(`${skillsReviewedAt}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time><a href="#criteria">{t("criteriaLink")}</a></p>
    </div>
    <SkillsDirectory/>
    <aside className="skills-methodology" id="criteria" aria-labelledby="criteria-title">
      <h2 id="criteria-title">{t("criteriaTitle")}</h2>
      <p>{t("criteria")}</p><p>{t("metricsNote")}</p><p>{t("officialNote")}</p>
      <details><summary>{t("gettingStarted")}</summary><ol><li>{t("stepOne")}</li><li>{t("stepTwo")}</li><li>{t("stepThree")}</li></ol><a href="https://github.com/vercel-labs/skills#readme" target="_blank" rel="noreferrer">{t("cliDocs")}<ArrowUpRight size={15} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a></details>
      <div className="skills-source-links"><span>{t("sources")}</span><a href="https://skills.sh" target="_blank" rel="noreferrer">Skills.sh<ArrowUpRight size={14} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a><a href="https://github.com/VoltAgent/awesome-agent-skills" target="_blank" rel="noreferrer">Awesome Agent Skills<ArrowUpRight size={14} aria-hidden="true"/><span className="sr-only"> {t("newTab")}</span></a></div>
    </aside>
  </div>;
}

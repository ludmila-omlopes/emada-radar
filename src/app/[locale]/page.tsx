import { localizeContent } from "@/lib/localized-content";
import { classifyNews } from "@/lib/classified-news";
import { getTranslations } from "next-intl/server";
import { PortalLink as Link } from "@/components/portal-link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { ModelLeaderboard } from "@/components/model-leaderboard";
import { ArticleList, ExperimentCards, PortalHeading, SectionTitle, SocialFeed, SourceHealth } from "@/components/portal-sections";
import { getArtificialAnalysis, getExperiments, getLiveBench, getPortalNews, getSocialPosts } from "@/lib/portal-data";
export default async function HomePage() {
    const t = await getTranslations("Portal");
    const [news, leaderboard, artificialAnalysis, experiments, social] = await Promise.all([getPortalNews().then(classifyNews).then(localizeContent), getLiveBench(), getArtificialAnalysis(), getExperiments().then(localizeContent), getSocialPosts().then(localizeContent)]);
    const boards = [leaderboard, artificialAnalysis];
    return <div className="page-container portal-page">
    <PortalHeading title={t("homeTitle")} description={t("homeDescription")}/>
    <div className="portal-main-grid">
      <section id="noticias" className="portal-news-section"><SectionTitle title={t("news")} href="/noticias" link={t("allNews")}/><ArticleList items={news.items.slice(0, 5)} featured/><SourceHealth sources={news.sources}/></section>
      <aside className="portal-sidebar"><section id="modelos" className="portal-ranking-section"><SectionTitle title={t("models")} href="/modelos" link={t("compare")}/><ModelLeaderboard boards={boards} compact/></section><Link className="portal-academy-link" href="/modulos"><BookOpen size={23} aria-hidden="true"/><div><h3>{t("academyTitle")}</h3><p>{t("academyDescription")}</p></div><ArrowUpRight size={20} aria-hidden="true"/></Link></aside>
    </div>
    <section id="experimentos" className="portal-section"><SectionTitle title={t("experiments")} href="/experimentos" link={t("allItems")}/><p className="portal-section-intro">{t("experimentsIntro")}</p><ExperimentCards items={experiments.items.slice(0, 3)}/><SourceHealth sources={experiments.sources} noun="buscas"/></section>
    <section id="vozes" className="portal-section"><SectionTitle title={t("voicesTitle")} href="/vozes" link={t("allPosts")}/><SocialFeed data={social} limit={3}/></section>
    <p className="portal-footnote">{t("originalsNotice")} </p><p className="portal-footnote">{t("homeNote")}</p>
  </div>;
}

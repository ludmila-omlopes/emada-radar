import { localizeContent } from "@/lib/localized-content";
import { classifyNews } from "@/lib/classified-news";
import { getLocale, getTranslations } from "next-intl/server";
import { PortalLink as Link } from "@/components/portal-link";
import { ArrowUpRight } from "lucide-react";
import { ArticleList, SectionTitle, SocialFeed, SourceHealth } from "@/components/portal-sections";
import { PortalRefresh } from "@/components/portal-refresh";
import { Reveal } from "@/components/reveal";
import { CategoryLeaders, CostScatter, ExperimentHighlights, RankingSnapshot, ReleaseCards, SourceBars, SummaryTiles } from "@/components/radar";
import { currentTime, experimentSummary, featuredReleases, newsSummary, topExperiments } from "@/lib/radar-insights";
import { getArtificialAnalysis, getExperiments, getLiveBench, getPortalNews, getSocialPosts } from "@/lib/portal-data";

export default async function HomePage() {
    const t = await getTranslations("Portal");
    const training = await getTranslations("Training");
    const skills = await getTranslations("Skills");
    const locale = await getLocale();
    const [news, leaderboard, artificialAnalysis, experiments, social] = await Promise.all([getPortalNews().then(classifyNews).then(localizeContent), getLiveBench(), getArtificialAnalysis(), getExperiments().then(localizeContent), getSocialPosts().then(localizeContent)]);
    const now = currentTime();
    const summary = newsSummary(news.items, now);
    const releases = featuredReleases(news.items, now);
    const available = news.sources.filter(source => source.status === "ok").length;
    const today = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(now);
    return <div className="page-container portal-page radar-page">
    <header className="radar-hero">
      <div>
        <p className="radar-eyebrow rc-rise">{today}</p>
        <h1 className="rc-rise" style={{ animationDelay: "80ms" }}>{t("homeTitle")}</h1>
        <p className="radar-lede rc-rise" style={{ animationDelay: "160ms" }}>{t("homeDescription")}</p>
      </div>
      <div className="radar-status rc-fade" style={{ animationDelay: "240ms" }}>
        <span><span className={`radar-live ${available === news.sources.length ? "rc-pulse" : "partial"}`} aria-hidden="true"/>{t("sourcesLive", { available, total: news.sources.length })}</span>
        <PortalRefresh/>
      </div>
    </header>

    <SummaryTiles news={summary} livebench={leaderboard} experiments={experimentSummary(experiments.items)}/>

    {releases.items.length > 0 && <Reveal as="section" className="radar-block" label={t(releases.thisWeek ? "weekReleases" : "recentReleases")}>
      <SectionTitle title={t(releases.thisWeek ? "weekReleases" : "recentReleases")} href="/noticias" link={t("allReleases")}/>
      <ReleaseCards items={releases.items}/>
    </Reveal>}

    <div className="radar-split">
      <Reveal as="section" className="radar-news" id="noticias">
        <SectionTitle title={t("news")} href="/noticias" link={t("allNews")}/>
        <ArticleList items={news.items.slice(0, 6)} featured/>
        <SourceBars items={news.items}/>
        <SourceHealth sources={news.sources}/>
      </Reveal>
      <Reveal as="aside" className="radar-side" id="modelos">
        <SectionTitle title={t("rankingTitle")} href="/modelos" link={t("compareModels")}/>
        <RankingSnapshot boards={[leaderboard, artificialAnalysis]}/>
        <CategoryLeaders board={leaderboard}/>
      </Reveal>
    </div>

    <Reveal as="section" className="radar-block"><CostScatter board={artificialAnalysis}/></Reveal>

    <div className="radar-split even">
      <Reveal as="section" className="radar-block" id="experimentos">
        <SectionTitle title={t("trendingExperiments")} href="/experimentos" link={t("allItems")}/>
        <ExperimentHighlights items={topExperiments(experiments.items)}/>
        <SourceHealth sources={experiments.sources} noun="buscas"/>
      </Reveal>
      <Reveal as="section" className="radar-block radar-voices" id="vozes">
        <SectionTitle title={t("voicesTitle")} href="/vozes" link={t("allPosts")}/>
        <SocialFeed data={social} limit={3}/>
      </Reveal>
    </div>

    <nav className="radar-learn" aria-label={t("learn")}>
      <Link href="/modulos"><span><strong>{t("academyTitle")}</strong><small>{t("academyDescription")}</small></span><ArrowUpRight size={18} aria-hidden="true"/></Link>
      <Link href="/formacao"><span><strong>{training("title")}</strong><small>{training("description")}</small></span><ArrowUpRight size={18} aria-hidden="true"/></Link>
      <Link href="/skills"><span><strong>{skills("homeTitle")}</strong><small>{skills("homeDescription")}</small></span><ArrowUpRight size={18} aria-hidden="true"/></Link>
    </nav>
    <p className="portal-footnote">{t("originalsNotice")} </p><p className="portal-footnote">{t("homeNote")}</p>
  </div>;
}

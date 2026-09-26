import { localizeContent } from "@/lib/localized-content";
import { classifyNews } from "@/lib/classified-news";
import { getLocale, getTranslations } from "next-intl/server";
import { PortalFeed } from "@/components/portal-feeds";
import { SourceHealth } from "@/components/portal-sections";
import { DayColumns, LiveStatus, RadarHero, StatTiles } from "@/components/radar-kit";
import { SourceBars } from "@/components/radar";
import { Reveal } from "@/components/reveal";
import { currentTime, dailyCounts, newsSummary, sourceCounts } from "@/lib/radar-insights";
import { getPortalNews } from "@/lib/portal-data";
export async function generateMetadata() { const t = await getTranslations("Portal"); return { title: t("newsTitle") }; }
export default async function NewsPage() {
    const t = await getTranslations("Portal");
    const locale = await getLocale();
    const news = await getPortalNews().then(classifyNews).then(data => localizeContent(data));
    const now = currentTime();
    const summary = newsSummary(news.items, now);
    const { oldest } = sourceCounts(news.items);
    const available = news.sources.filter(source => source.status === "ok").length;
    const date = (value: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(value));
    const delta = summary.last7 - summary.previous7;
    return <div className="page-container portal-page radar-page">
      <RadarHero title={t("newsTitle")} description={t("newsDescription")} refresh status={<LiveStatus available={available} total={news.sources.length} label={t("sourcesLive", { available, total: news.sources.length })}/>}/>
      <StatTiles label={t("summaryLabel")} items={[
        { label: t("newsTotal"), value: news.items.length, detail: oldest ? t("newsTotalDetail", { date: date(oldest) }) : undefined },
        { label: t("kpiPosts"), value: summary.last7, detail: t("kpiPostsDelta", { delta: `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${Math.abs(delta)}` }), spark: summary.spark, sparkLabel: t("sparkLabel", { days: summary.spark.length }) },
        { label: t("kpiReleases"), value: summary.releases7, detail: t("kpiReleasesDetail", { month: summary.releases30 }) },
        { label: t("sourcesTile"), value: available, detail: t("sourcesTileDetail", { available, total: news.sources.length }) },
      ]}/>
      <Reveal as="div" className="radar-split charts">
        <DayColumns counts={dailyCounts(news.items, now, 28)} end={new Date(now).toISOString()}/>
        <SourceBars items={news.items}/>
      </Reveal>
      <section className="radar-block" aria-labelledby="all-news">
        <div className="portal-section-title"><h2 id="all-news">{t("allNewsTitle")}</h2></div>
        <PortalFeed items={news.items}/>
      </section>
      <SourceHealth sources={news.sources}/>
      <p className="portal-footnote">{t("releaseDetectionNote")}</p><p className="portal-footnote">{t("originalsNotice")} </p><p className="portal-footnote">{t("newsNote")}</p>
    </div>;
}

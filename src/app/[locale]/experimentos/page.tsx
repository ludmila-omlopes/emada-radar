import { localizeContent } from "@/lib/localized-content";
import { getTranslations } from "next-intl/server";
import { PortalFeed } from "@/components/portal-feeds";
import { SourceHealth } from "@/components/portal-sections";
import { BarList, LiveStatus, RadarHero, StatTiles } from "@/components/radar-kit";
import { ExperimentHighlights } from "@/components/radar";
import { Reveal } from "@/components/reveal";
import { experimentSummary, topExperiments } from "@/lib/radar-insights";
import { getExperiments } from "@/lib/portal-data";
export async function generateMetadata() { const t = await getTranslations("Portal"); return { title: t("experimentsMeta") }; }
export default async function ExperimentsPage() {
    const t = await getTranslations("Portal");
    const experiments = await getExperiments().then(data => localizeContent(data));
    const summary = experimentSummary(experiments.items);
    const comments = experiments.items.reduce((sum, item) => sum + item.comments, 0);
    const available = experiments.sources.filter(source => source.status === "ok").length;
    const kindLabel = (kind: string) => t(kind === "Jogos" ? "games" : kind === "Código" ? "coding" : "evaluations");
    return <div className="page-container portal-page radar-page">
      <RadarHero title={t("experiments")} description={t("experimentsDescription")} refresh status={<LiveStatus available={available} total={experiments.sources.length} label={t("sourceCount", { available, total: experiments.sources.length, kind: "buscas" })}/>}/>
      <StatTiles label={t("summaryLabel")} items={[
        { label: t("expTotal"), value: summary.total, detail: t("expTotalDetail", { evaluations: summary.kinds["Avaliações"], coding: summary.kinds["Código"], games: summary.kinds["Jogos"] }) },
        { label: t("expTopPoints"), value: summary.topPoints, detail: t("expTopPointsDetail") },
        { label: t("expComments"), value: comments, detail: t("expCommentsDetail") },
      ]}/>
      <Reveal as="div" className="radar-split">
        <div className="radar-stack">
          <div className="portal-section-title"><h2>{t("trendingExperiments")}</h2></div>
          <ExperimentHighlights items={topExperiments(experiments.items)}/>
        </div>
        <div className="radar-stack">
          <BarList title={t("mostVotedTitle")} detail={t("mostVotedDetail")} rows={topExperiments(experiments.items, 8).map(item => ({ key: item.id, label: item.translation?.text ?? item.title, value: item.points, href: item.url, sub: kindLabel(item.kind) }))}/>
          <BarList title={t("byKindTitle")} rows={(["Avaliações", "Código", "Jogos"] as const).map(kind => ({ key: kind, label: kindLabel(kind), value: summary.kinds[kind] }))}/>
        </div>
      </Reveal>
      <section className="radar-block" aria-labelledby="all-experiments">
        <div className="portal-section-title"><h2 id="all-experiments">{t("allExperiments")}</h2></div>
        <PortalFeed items={experiments.items} experiments/>
      </section>
      <SourceHealth sources={experiments.sources} noun="buscas"/>
      <p className="portal-footnote">{t("originalsNotice")} </p><p className="portal-footnote">{t("experimentsNote")}</p>
    </div>;
}

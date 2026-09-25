import { getTranslations } from "next-intl/server";
import { ModelLeaderboard } from "@/components/model-leaderboard";
import { PortalHeading } from "@/components/portal-sections";
import { CostScatter, ModelHighlights, StrengthHeatmap } from "@/components/radar";
import { Reveal } from "@/components/reveal";
import { getArtificialAnalysis, getLiveBench } from "@/lib/portal-data";
import { ChevronDown } from "lucide-react";
export async function generateMetadata() { const t = await getTranslations("Portal"); return { title: t("modelsMeta") }; }
export default async function ModelsPage() {
    const t = await getTranslations("Portal");
    const boards = await Promise.all([getLiveBench(), getArtificialAnalysis()]);
    const [livebench, analysis] = boards;
    return <div className="page-container portal-page radar-page">
      <PortalHeading title={t("modelsTitle")} description={t("modelsDescription")}/>
      <ModelHighlights livebench={livebench} analysis={analysis}/>
      <Reveal as="div" className="radar-block"><StrengthHeatmap board={livebench}/></Reveal>
      <Reveal as="div" className="radar-block"><CostScatter board={analysis}/></Reveal>
      <Reveal as="section" className="radar-block radar-full-table" label={t("fullTable")}>
        <div className="portal-section-title"><h2>{t("fullTable")}</h2></div>
        <p className="portal-section-intro">{t("fullTableDescription")}</p>
        <ModelLeaderboard boards={boards}/>
      </Reveal>
      <details className="benchmark-methodology"><summary>{t("methodTitle")}<ChevronDown size={16} aria-hidden="true"/></summary><div><p>{t("methodLivebench")}</p><p>{t("methodCost")}</p><p>{t("methodAA")}</p><a href="https://github.com/LiveBench/new-livebench" target="_blank" rel="noreferrer">{t("livebenchMethod")}</a><br /><a href="https://artificialanalysis.ai/methodology" target="_blank" rel="noreferrer">{t("aaMethod")}</a></div></details>
    </div>;
}

import { getTranslations } from "next-intl/server";
import { ModelLeaderboard } from "@/components/model-leaderboard";
import { PortalHeading } from "@/components/portal-sections";
import { getArtificialAnalysis, getLiveBench } from "@/lib/portal-data";
import { ChevronDown } from "lucide-react";
export async function generateMetadata() { const t = await getTranslations("Portal"); return { title: t("modelsMeta") }; }
export default async function ModelsPage() {
    const t = await getTranslations("Portal");
    const boards = await Promise.all([getLiveBench(), getArtificialAnalysis()]);
    return <div className="page-container portal-page"><PortalHeading title={t("modelsTitle")} description={t("modelsDescription")}/><ModelLeaderboard boards={boards}/><details className="benchmark-methodology"><summary>{t("methodTitle")}<ChevronDown size={16} aria-hidden="true"/></summary><div><p>{t("methodLivebench")}</p><p>{t("methodCost")}</p><p>{t("methodAA")}</p><a href="https://github.com/LiveBench/new-livebench" target="_blank" rel="noreferrer">{t("livebenchMethod")}</a><br /><a href="https://artificialanalysis.ai/methodology" target="_blank" rel="noreferrer">{t("aaMethod")}</a></div></details></div>;
}

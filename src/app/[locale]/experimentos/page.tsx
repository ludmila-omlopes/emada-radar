import { localizeContent } from "@/lib/localized-content";
import { getTranslations } from "next-intl/server";
import { PortalFeed } from "@/components/portal-feeds";
import { PortalHeading, SourceHealth } from "@/components/portal-sections";
import { getExperiments } from "@/lib/portal-data";
export async function generateMetadata() { const t = await getTranslations("Portal"); return { title: t("experimentsMeta") }; }
export default async function ExperimentsPage() {
    const t = await getTranslations("Portal");
    const experiments = await getExperiments().then(data => localizeContent(data));
    return <div className="page-container portal-page"><PortalHeading title={t("experiments")} description={t("experimentsDescription")}/><PortalFeed items={experiments.items} experiments/><SourceHealth sources={experiments.sources} noun="buscas"/><p className="portal-footnote">{t("originalsNotice")} </p><p className="portal-footnote">{t("experimentsNote")}</p></div>;
}

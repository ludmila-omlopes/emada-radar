import { localizeContent } from "@/lib/localized-content";
import { classifyNews } from "@/lib/classified-news";
import { getTranslations } from "next-intl/server";
import { PortalFeed } from "@/components/portal-feeds";
import { PortalHeading, SourceHealth } from "@/components/portal-sections";
import { getPortalNews } from "@/lib/portal-data";
export async function generateMetadata() { const t = await getTranslations("Portal"); return { title: t("newsTitle") }; }
export default async function NewsPage() {
    const t = await getTranslations("Portal");
    const news = await getPortalNews().then(classifyNews).then(data => localizeContent(data));
    return <div className="page-container portal-page"><PortalHeading title={t("newsTitle")} description={t("newsDescription")}/><PortalFeed items={news.items}/><SourceHealth sources={news.sources}/><p className="portal-footnote">{t("releaseDetectionNote")}</p><p className="portal-footnote">{t("originalsNotice")} </p><p className="portal-footnote">{t("newsNote")}</p></div>;
}

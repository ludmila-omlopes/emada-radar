import { localizeContent } from "@/lib/localized-content";
import { getTranslations } from "next-intl/server";
import { PortalHeading, ProfileDirectory, SourceHealth } from "@/components/portal-sections";
import { SocialTimeline } from "@/components/portal-feeds";
import { getSocialPosts } from "@/lib/portal-data";
export async function generateMetadata() { const t = await getTranslations("Portal"); return { title: t("voicesTitle") }; }
export default async function VoicesPage() {
    const t = await getTranslations("Portal");
    const social = await getSocialPosts().then(data => localizeContent(data));
    return <div className="page-container portal-page"><PortalHeading title={t("voicesTitle")} description={t("voicesDescription")}/><SocialTimeline data={social}/><SourceHealth sources={social.sources} noun="perfis"/>{social.items.length > 0 && <section className="portal-section"><h2 className="profile-section-heading">{t("followedProfiles")}</h2><ProfileDirectory /></section>}<p className="portal-footnote">{t("originalsNotice")} </p><p className="portal-footnote">{t("voicesNote")}</p></div>;
}

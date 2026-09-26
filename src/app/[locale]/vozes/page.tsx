import { localizeContent } from "@/lib/localized-content";
import { getLocale, getTranslations } from "next-intl/server";
import { ProfileDirectory, SourceHealth } from "@/components/portal-sections";
import { SocialTimeline } from "@/components/portal-feeds";
import { BarList, RadarHero, StatTiles } from "@/components/radar-kit";
import { Reveal } from "@/components/reveal";
import { socialProfiles } from "@/lib/portal-types";
import { getSocialPosts } from "@/lib/portal-data";
export async function generateMetadata() { const t = await getTranslations("Portal"); return { title: t("voicesTitle") }; }
export default async function VoicesPage() {
    const t = await getTranslations("Portal");
    const locale = await getLocale();
    const social = await getSocialPosts().then(data => localizeContent(data));
    const counts = socialProfiles.map(profile => ({ profile, count: social.items.filter(post => post.profile.username === profile.username).length })).sort((a, b) => b.count - a.count || a.profile.name.localeCompare(b.profile.name, locale));
    const active = counts.filter(entry => entry.count > 0);
    const top = active[0];
    return <div className="page-container portal-page radar-page">
      <RadarHero title={t("voicesTitle")} description={t("voicesDescription")} refresh/>
      {social.items.length > 0 && <>
        <StatTiles label={t("summaryLabel")} items={[
          { label: t("voicesPosts"), value: social.items.length, detail: t("voicesPostsDetail", { profiles: socialProfiles.length }) },
          { label: t("voicesActive"), value: active.length, detail: t("voicesActiveDetail", { total: socialProfiles.length }) },
          ...(top ? [{ label: t("voicesTop"), value: top.count, text: top.profile.name, detail: t("voicesTopDetail", { count: top.count }) }] : []),
        ]}/>
        <Reveal as="div" className="radar-block"><BarList className="radar-bars-card" title={t("postsByProfile")} detail={t("postsByProfileDetail")} rows={active.map(entry => ({ key: entry.profile.username, label: entry.profile.name, value: entry.count, href: `https://x.com/${entry.profile.username}`, sub: `@${entry.profile.username}` }))}/></Reveal>
      </>}
      <section className="radar-block" aria-labelledby="timeline">
        <div className="portal-section-title"><h2 id="timeline">{t("timelineTitle")}</h2></div>
        <SocialTimeline data={social}/>
      </section>
      <SourceHealth sources={social.sources} noun="perfis"/>
      {social.items.length > 0 && <Reveal as="section" className="radar-block"><div className="portal-section-title"><h2>{t("followedProfiles")}</h2></div><ProfileDirectory /></Reveal>}
      <p className="portal-footnote">{t("originalsNotice")} </p><p className="portal-footnote">{t("voicesNote")}</p>
    </div>;
}

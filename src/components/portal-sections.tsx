"use client";
import { useTranslations, useLocale } from "next-intl";
import { PortalLink as Link } from "@/components/portal-link";
import { ArrowUpRight, Check, ChevronDown, FlaskConical, MessageSquare, Radio, Rocket } from "lucide-react";
import { socialProfiles, type Collection, type Experiment, type PortalArticle, type SocialPost, type SourceState } from "@/lib/portal-types";
import { TranslatedContent } from "./translated-content";
import { PortalRefresh } from "./portal-refresh";
export function PortalDate({ date, includeTime = false }: {
    date: string;
    includeTime?: boolean;
}) {
    const locale = useLocale();
    return <time dateTime={date}>{new Date(date).toLocaleDateString(locale, { day: "2-digit", month: "short", ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "UTC" })}</time>;
}
export function PortalHeading({ title, description }: {
    title: string;
    description: string;
}) {
    return <header className="portal-heading"><div><h1>{title}</h1><p>{description}</p></div><PortalRefresh /></header>;
}
export function SectionTitle({ title, href, link }: {
    title: string;
    href?: string;
    link?: string;
}) {
    const t = useTranslations("Portal");
    return <div className="portal-section-title"><h2>{title}</h2>{href && <Link href={href}>{link ?? t("explore")}<ArrowUpRight size={16} aria-hidden="true"/></Link>}</div>;
}
export function SourceHealth({ sources, noun = "fontes" }: {
    sources: SourceState[];
    noun?: "fontes" | "buscas" | "perfis";
}) {
    const t = useTranslations("Portal");
    const available = sources.filter(source => source.status === "ok").length;
    return <details className="source-health"><summary>{t("sourceHealth")}<span>{t("sourceCount", {available, total: sources.length, kind: noun})}</span><ChevronDown size={15} aria-hidden="true"/></summary><ul>{sources.map(source => <li key={source.name}><a href={source.url} target="_blank" rel="noreferrer">{source.name}<ArrowUpRight size={12}/></a><span className={source.status === "ok" ? "source-ok" : ""}>{source.status === "ok" ? <><Check size={12}/> {source.collectedAt ? <>{t("snapshot")} <PortalDate date={source.collectedAt}/></> : source.fetchedAt ? <PortalDate date={source.fetchedAt} includeTime/> : t("available")}</> : source.status === "unconfigured" ? t("pending") : t("unavailable")}</span></li>)}</ul></details>;
}
export function PortalEmpty({ title, description }: {
    title: string;
    description: string;
}) {
    return <div className="portal-empty" role="status"><Radio size={24}/><h3>{title}</h3><p>{description}</p></div>;
}
export function ArticleList({ items, featured = false }: {
    items: PortalArticle[];
    featured?: boolean;
}) {
    const t = useTranslations("Portal");
    if (!items.length)
        return <PortalEmpty title={t("noNews")} description={t("noNewsDescription")}/>;
    return <div className={`portal-articles ${featured ? "with-featured" : ""}`}>{items.map((item, index) => <article key={item.id} className={[featured && index === 0 ? "portal-article-featured" : "", item.modelRelease ? "portal-article-release" : ""].filter(Boolean).join(" ")}><div className="portal-item-meta"><div className="portal-article-labels"><span className="portal-source">{item.source}</span>{item.modelRelease && <span className="model-release-badge" title={t("releaseDetectionNote")}><Rocket size={13} aria-hidden="true"/>{t("newModel")}</span>}</div><PortalDate date={item.publishedAt}/></div><TranslatedContent original={item.title} translation={item.translation} href={item.url}/></article>)}</div>;
}
export function ExperimentCards({ items }: {
    items: Experiment[];
}) {
    const t = useTranslations("Portal");
    if (!items.length)
        return <PortalEmpty title={t("noTests")} description={t("noTestsDescription")}/>;
    return <div className="experiment-grid">{items.map(item => <article className="experiment-card" key={item.id}><div className="portal-item-meta"><span className="experiment-kind"><FlaskConical size={14}/>{t(item.kind === "Jogos" ? "games" : item.kind === "Código" ? "coding" : "evaluations")}</span><PortalDate date={item.publishedAt}/></div><TranslatedContent original={item.title} translation={item.translation} href={item.url}/><p>{t("sharedBy")} <strong>{item.author}</strong> {t("onHn")}</p><a className="experiment-discussion" href={item.discussionUrl} target="_blank" rel="noreferrer"><MessageSquare size={14}/>{t("comments", {count:item.comments})}<span>{t("points", {count:item.points})}</span><ArrowUpRight size={14}/></a></article>)}</div>;
}
export function ProfileDirectory({ compact = false }: {
    compact?: boolean;
}) {
    const t = useTranslations("Portal");
    return <div className={`profile-directory ${compact ? "compact" : ""}`}>{socialProfiles.map(profile => <a key={profile.username} href={`https://x.com/${profile.username}`} target="_blank" rel="noreferrer"><span className="profile-initials">{profile.initials}</span><span><strong>{profile.name}</strong><small>{profile.username === "theo" ? t("roleTheo") : profile.username === "OpenAIDevs" ? t("roleOpenai") : profile.username === "AnthropicAI" ? t("roleAnthropic") : profile.username === "karpathy" ? t("roleKarpathy") : profile.role === "Comunidade de IA" ? t("roleCommunity") : profile.role}</small><span className="profile-handle">@{profile.username}</span></span><ArrowUpRight size={16}/></a>)}</div>;
}
export function SocialFeed({ data, limit = 30 }: {
    data: Collection<SocialPost>;
    limit?: number;
}) {
    const t = useTranslations("Portal");
    const missing = data.sources.every(source => source.status === "unconfigured");
    if (!data.items.length)
        return <><div className="social-notice"><Radio size={19}/><div><h3>{missing ? t("followVoices") : t("postsUnavailable")}</h3><p>{missing ? t("feedPending") : t("openProfiles")}</p></div><span className="connection-badge">{missing ? t("pending") : t("sourceUnavailable")}</span></div><ProfileDirectory compact/></>;
    const collectedAt = data.items.flatMap(item => item.collectedAt ? [item.collectedAt] : []).sort()[0];
    return <>{collectedAt && <p className="social-collection-note"><strong>{t("selectionFrom")} <PortalDate date={collectedAt}/></strong> · {data.items.every(item => item.collectedAt) ? t("snapshotOnly") : t("partialSnapshot")}</p>}<div className="social-grid">{data.items.slice(0, limit).map(item => <article className="social-post" key={item.id}><header><span className="profile-initials">{item.profile.initials}</span><a href={`https://x.com/${item.profile.username}`} target="_blank" rel="noreferrer"><strong>{item.profile.name}</strong><span>@{item.profile.username}</span></a></header><TranslatedContent original={item.text} translation={item.translation}/><footer><PortalDate date={item.publishedAt} includeTime/><a href={item.url} target="_blank" rel="noreferrer">{t("openX")}<ArrowUpRight size={15}/></a></footer></article>)}</div></>;
}

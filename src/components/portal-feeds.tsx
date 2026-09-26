"use client";
import { useTranslations, useLocale } from "next-intl";

import { useState } from "react";
import { Search } from "lucide-react";
import { socialProfiles, type Collection, type Experiment, type PortalArticle, type SocialPost } from "@/lib/portal-types";
import { ArticleList, ExperimentCards, SocialFeed } from "./portal-sections";
export function SocialTimeline({ data }: {
    data: Collection<SocialPost>;
}) {
    const t = useTranslations("Portal");
    const [username, setUsername] = useState("all");
    const posts = username === "all" ? data.items : data.items.filter(post => post.profile.username === username);
    if (!data.items.length)
        return <SocialFeed data={data}/>;
    return <><div className="portal-filters social-profile-filters" aria-label={t("filterProfile")}><button type="button" aria-pressed={username === "all"} className={username === "all" ? "selected" : ""} onClick={() => setUsername("all")}>{t("all")}</button>{socialProfiles.map(profile => { const count = data.items.filter(post => post.profile.username === profile.username).length; return <button type="button" key={profile.username} aria-pressed={username === profile.username} className={[username === profile.username ? "selected" : "", count ? "" : "empty"].filter(Boolean).join(" ")} onClick={() => setUsername(profile.username)}><span className="chip-initials" aria-hidden="true">{profile.initials}</span>{profile.name}<span className="chip-count">{count}</span></button>; })}</div><p className="feed-result-count" role="status">{t("postCount", {count:posts.length})}</p>{posts.length ? <SocialFeed data={{ ...data, items: posts }}/> : <p className="portal-filter-empty">{t("emptyProfile")}</p>}</>;
}
export function PortalFeed({ items, experiments = false }: {
    items: PortalArticle[] | Experiment[];
    experiments?: boolean;
}) {
    const t = useTranslations("Portal");
    const locale = useLocale();
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("all");
    const [releasesOnly, setReleasesOnly] = useState(false);
    const normalize = (value: string) => value.toLocaleLowerCase(locale).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filters = experiments ? ["all", "Jogos", "Código", "Avaliações"] : ["all", ...new Set(items.map(item => item.source))];
    const filtered = items.filter(item => normalize(`${item.title} ${item.translation?.text ?? ""}`).includes(normalize(query)) && (filter === "all" || (experiments ? (item as Experiment).kind : item.source) === filter) && (experiments || !releasesOnly || item.modelRelease));
    return <><div className="portal-feed-controls"><label className="portal-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} aria-label={experiments ? t("searchTests") : t("searchNews")} placeholder={experiments ? t("searchTestsPlaceholder") : t("searchNewsPlaceholder")}/></label><div className="portal-filters" aria-label={experiments ? t("experimentType") : t("newsSource")}>{filters.map(value => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={filter === value ? "selected" : ""}>{value === "all" ? t("all") : experiments ? t(value === "Jogos" ? "games" : value === "Código" ? "coding" : "evaluations") : value}</button>)}</div>{!experiments && <label className="portal-release-filter"><input type="checkbox" checked={releasesOnly} onChange={event => setReleasesOnly(event.target.checked)}/>{t("releasesOnly")}</label>}</div><p className="feed-result-count" role="status">{t(experiments ? "testCount" : "articleCount", {count:filtered.length})}</p>{!filtered.length && items.length > 0 ? <p className="portal-filter-empty">{t(releasesOnly ? "noDetectedReleases" : "filterEmpty")}</p> : experiments ? <ExperimentCards items={filtered as Experiment[]}/> : <ArticleList items={filtered as PortalArticle[]} groupByDay/>}</>;
}

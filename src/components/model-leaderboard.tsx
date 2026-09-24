"use client";
import { useTranslations, useLocale } from "next-intl";
import { localizeLeaderboard } from "@/i18n/benchmarks";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronDown, Search } from "lucide-react";
import type { Leaderboard, Metric } from "@/lib/portal-types";
import { PortalDate, PortalEmpty } from "./portal-sections";
function formatMetric(value: number | null | undefined, metric: Metric, locale: string) {
    if (value == null)
        return "—";
    if (metric.unit === "usd")
        return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: metric.precision ?? 3 }).format(value);
    if (metric.unit === "context")
        return `${value.toLocaleString(locale, { notation: "compact", maximumFractionDigits: 2 })} tokens`;
    return `${value.toLocaleString(locale, { maximumFractionDigits: metric.precision ?? 1, minimumFractionDigits: metric.precision ?? 1 })}${metric.unit === "seconds" ? " s" : metric.unit === "tokens" ? " t/s" : ""}`;
}
export function ModelLeaderboard({ boards, compact = false }: {
    boards: Leaderboard[];
    compact?: boolean;
}) {
    const t = useTranslations("Portal");
    const benchmarkText = useTranslations("Benchmarks");
    const locale = useLocale();
    const [boardId, setBoardId] = useState(boards.find(board => board.status === "ok")?.id ?? boards[0].id);
    const [metricKey, setMetricKey] = useState("overall");
    const [query, setQuery] = useState("");
    const [organization, setOrganization] = useState("all");
    const rawBoard = boards.find(board => board.id === boardId) ?? boards[0];
    const board = useMemo(() => localizeLeaderboard(rawBoard, benchmarkText), [rawBoard, benchmarkText]);
    const metric = board.metrics.find(item => item.key === metricKey) ?? board.metrics[0];
    const ranked = useMemo(() => metric ? [...board.models].filter(model => model.scores[metric.key] != null).sort((a, b) => (metric.lowerIsBetter ? 1 : -1) * (a.scores[metric.key]! - b.scores[metric.key]!) || a.name.localeCompare(b.name)) : [], [board, metric]);
    const normalize = (value: string) => value.toLocaleLowerCase(locale).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filtered = ranked.map((model, index) => ({ ...model, rank: index > 0 && ranked[index - 1].scores[metric.key] === model.scores[metric.key] ? ranked.findIndex(item => item.scores[metric.key] === model.scores[metric.key]) + 1 : index + 1 })).filter(model => normalize(`${model.name} ${model.organization}`).includes(normalize(query)) && (organization === "all" || model.organization === organization));
    const displayed = compact ? filtered.slice(0, 5) : filtered;
    return <div className={`leaderboard ${compact ? "leaderboard-compact" : ""}`}>
    {boards.length > 1 && <div className="benchmark-sources" aria-label={t("benchmarkSource")}>{boards.map(item => <button type="button" key={item.id} aria-pressed={item.id === board.id} onClick={() => { setBoardId(item.id); setMetricKey("overall"); setOrganization("all"); setQuery(""); }} className={item.id === board.id ? "selected" : ""}>{item.name}{item.status !== "ok" && <span>{item.status === "unconfigured" ? t("pending") : t("notAvailable")}</span>}</button>)}</div>}
    {board.status !== "ok" || !metric ? <PortalEmpty title={board.status === "unconfigured" ? t("benchmarkPending") : t("benchmarkFailed")} description={t("benchmarkFallback")}/> : <>
      <div className="leaderboard-controls"><label className="metric-select"><span>{t("compareBy")}</span><select value={metric.key} onChange={event => setMetricKey(event.target.value)}>{board.metrics.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>{!compact && <><label className="leaderboard-field"><span>{t("searchModel")}</span><span className="portal-search"><Search size={17} aria-hidden="true"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("modelName")}/></span></label><label className="leaderboard-field"><span>{t("organization")}</span><select className="organization-select" aria-label={t("filterOrganization")} value={organization} onChange={event => setOrganization(event.target.value)}><option value="all">{t("allOrganizations")}</option>{[...new Set(board.models.map(model => model.organization))].sort().map(value => <option key={value}>{value}</option>)}</select></label></>}</div>
      <details className="metric-help" key={`${board.id}-${metric.key}`}><summary>{t("aboutMetric")}<ChevronDown size={14} aria-hidden="true"/></summary><p className="metric-description">{metric.description}</p></details>
      <div className="leaderboard-table-wrap"><table className="leaderboard-table"><caption className="sr-only">{t("rankingCaption", {name:board.name,metric:metric.label})}</caption><thead><tr><th scope="col">#</th><th scope="col">{t("model")}</th><th scope="col" className="numeric" aria-sort={metric.lowerIsBetter ? "ascending" : "descending"}>{compact ? t("result") : metric.label}{metric.lowerIsBetter ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}</th>{!compact && metric.key !== "overall" && <th scope="col" className="numeric">{t("overall")}</th>}</tr></thead><tbody>{displayed.map(model => <tr key={model.id}><td className="rank-number">{String(model.rank).padStart(2, "0")}</td><td><a href={model.url} target="_blank" rel="noreferrer"><strong>{model.name}</strong><ArrowUpRight size={13}/></a><span className="model-organization">{model.organization}</span></td><td className="numeric"><span className="metric-value">{formatMetric(model.scores[metric.key], metric, locale)}{model.scoreNotes?.[metric.key] && <abbr className="benchmark-estimate" title={t("estimate")} aria-label={t("estimate")}>*</abbr>}</span></td>{!compact && metric.key !== "overall" && <td className="numeric secondary-score">{formatMetric(model.scores.overall, board.metrics.find(item => item.key === "overall") ?? { ...metric, unit: "score", precision: 1 }, locale)}{model.scoreNotes?.overall && <abbr className="benchmark-estimate" title={t("estimate")} aria-label={t("estimate")}>*</abbr>}</td>}</tr>)}</tbody></table></div>
      {!filtered.length && <p className="portal-filter-empty" role="status">{t("noModels")}</p>}
      <p className="leaderboard-count">{t("modelCount", {shown:displayed.length,total:ranked.length})}</p>
      {displayed.some(model => model.scoreNotes?.[metric.key] || (!compact && model.scoreNotes?.overall)) && <p className="leaderboard-note">{t("estimateNote")}</p>}
      {!compact && board.note && <details className="leaderboard-data-note"><summary>{t("aboutData")}<ChevronDown size={14} aria-hidden="true"/></summary><p className="leaderboard-note">{board.note}</p></details>}
    </>}
    <footer className="leaderboard-source"><a href={board.url} target="_blank" rel="noreferrer">{t("source")} {board.name}<ArrowUpRight size={13}/></a><span>{board.release && <>{t("version")} {board.release}{board.fetchedAt && " · "}</>}{board.fetchedAt && <>{t("fetched")} <PortalDate date={board.fetchedAt} includeTime/> UTC</>}</span></footer>
  </div>;
}

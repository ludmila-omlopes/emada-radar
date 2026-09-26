"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, MessageSquare, Rocket } from "lucide-react";
import { localizeLeaderboard } from "@/i18n/benchmarks";
import type { Experiment, Leaderboard, PortalArticle } from "@/lib/portal-types";
import { bestValue, categoryLeaders, costFrontier, costMetric, heatmap, leaderSummary, orgKey, overallMetric, rankBy, scatterPoints, standoutCategory, type OrgKey, type ScatterPoint } from "@/lib/radar-insights";
import { PortalDate } from "./portal-sections";

export const ORGS: OrgKey[] = ["anthropic", "openai", "google", "other"];
export const orgColor = (key: OrgKey) => `var(--org-${key})`;
export const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function useNumber(decimals = 0, compact = false) {
  const locale = useLocale();
  return useMemo(() => new Intl.NumberFormat(locale, compact ? { notation: "compact", maximumFractionDigits: 1 } : { minimumFractionDigits: decimals, maximumFractionDigits: decimals }), [locale, decimals, compact]);
}

function useLocalized(board: Leaderboard) {
  const t = useTranslations("Benchmarks");
  return useMemo(() => localizeLeaderboard(board, t), [board, t]);
}

export function CountUp({ value, decimals = 0, prefix = "", compact = false, wait = 300, duration = 1100 }: { value: number; decimals?: number; prefix?: string; compact?: boolean; wait?: number; duration?: number }) {
  const format = useNumber(decimals, compact);
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const progress = Math.min(1, Math.max(0, (now - start - wait) / duration));
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    setShown(0);
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); frame = requestAnimationFrame(step); }
    });
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value, wait, duration]);
  return <span ref={ref} className="count-up" aria-label={`${prefix}${format.format(value)}`}><span aria-hidden="true">{prefix}{format.format(shown)}</span></span>;
}

export function OrgLegend({ keys }: { keys: OrgKey[] }) {
  const t = useTranslations("Portal");
  return <ul className="radar-legend">{keys.map(key => <li key={key}><span className="radar-dot" style={{ background: orgColor(key) }}/>{t(`org.${key}`)}</li>)}</ul>;
}

export function Sparkline({ values, highlight = 7, label }: { values: number[]; highlight?: number; label: string }) {
  const max = Math.max(1, ...values);
  return <div className="radar-spark" role="img" aria-label={label}>{values.map((value, index) => <span key={index} className={`rc-grow-y ${index >= values.length - highlight ? "current" : ""}`} style={{ height: `${Math.max(2, value / max * 100)}%`, ...delay(420 + index * 45) }}/>)}</div>;
}

export function SummaryTiles({ news, livebench, experiments }: {
  news: { last7: number; previous7: number; spark: number[]; releases7: number; releases30: number; releaseOrgs: { key: OrgKey; count: number }[] };
  livebench: Leaderboard;
  experiments: { total: number; topPoints: number; kinds: Record<Experiment["kind"], number> };
}) {
  const t = useTranslations("Portal");
  const one = useNumber(1);
  const board = useLocalized(livebench);
  const leader = leaderSummary(board);
  const delta = news.last7 - news.previous7;
  return <section className="radar-tiles" aria-label={t("summaryLabel")}>
    <div className="radar-tile rc-rise" style={delay(200)}>
      <span className="radar-tile-label">{t("kpiPosts")}</span>
      <div className="radar-tile-row"><div className="radar-tile-main"><strong><CountUp value={news.last7}/></strong><span>{t("kpiPostsDelta", { delta: `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${Math.abs(delta)}` })}</span></div><Sparkline values={news.spark} label={t("sparkLabel", { days: news.spark.length })}/></div>
    </div>
    <div className="radar-tile rc-rise" style={delay(280)}>
      <span className="radar-tile-label">{t("kpiReleases")}</span>
      <div className="radar-tile-main"><strong><CountUp value={news.releases7}/></strong><span>{t("kpiReleasesDetail", { month: news.releases30 })}</span></div>
      {news.releaseOrgs.length > 0 && <ul className="radar-legend">{news.releaseOrgs.map(entry => <li key={entry.key}><span className="radar-dot" style={{ background: orgColor(entry.key) }}/>{t(`org.${entry.key}`)} {entry.count}</li>)}</ul>}
    </div>
    <div className="radar-tile rc-rise" style={delay(360)}>
      <span className="radar-tile-label">{t("kpiLeader", { board: board.name })}</span>
      {leader ? <><div className="radar-tile-main"><strong><CountUp value={leader.leader.value} decimals={1}/></strong><span>{t("kpiLeaderDetail", { model: leader.leader.name, margin: one.format(leader.margin) })}</span></div>
      <div className="radar-meter"><span className="rc-grow-x" style={{ width: `${Math.min(100, leader.leader.value)}%`, background: orgColor(orgKey(leader.leader.organization)), ...delay(650) }}/></div></> : <p className="radar-tile-empty">{t("benchmarkFailed")}</p>}
    </div>
    <div className="radar-tile rc-rise" style={delay(440)}>
      <span className="radar-tile-label">{t("kpiExperiments")}</span>
      <div className="radar-tile-main"><strong><CountUp value={experiments.total}/></strong><span>{t("kpiExperimentsDetail", { points: experiments.topPoints })}</span></div>
      <ul className="radar-legend plain"><li>{t("evaluations")} {experiments.kinds["Avaliações"]}</li><li>{t("coding")} {experiments.kinds["Código"]}</li><li>{t("games")} {experiments.kinds["Jogos"]}</li></ul>
    </div>
  </section>;
}

export function ReleaseCards({ items }: { items: PortalArticle[] }) {
  const t = useTranslations("Portal");
  return <div className="radar-releases">{items.map((item, index) => {
    const key = orgKey(item.source);
    return <article key={item.id} className="radar-release rc-rise" style={delay(120 + index * 110)}>
      <div className="radar-release-meta"><span><span className="radar-dot" style={{ background: orgColor(key) }}/>{item.source}</span><PortalDate date={item.publishedAt}/></div>
      <span className="radar-badge rc-sheen" style={delay(800 + index * 110)}><Rocket size={12} aria-hidden="true"/>{t("newModel")}</span>
      <h3 lang={item.translation?.locale}>{item.translation?.text ?? item.title}</h3>
      <a className="radar-arrow-link" href={item.url} target="_blank" rel="noreferrer">{t("readAnnouncement")}<ArrowUpRight size={14} aria-hidden="true"/></a>
    </article>;
  })}</div>;
}

export function SourceBars({ items }: { items: PortalArticle[] }) {
  const t = useTranslations("Portal");
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
  const rows = [...counts].sort((a, b) => b[1] - a[1]);
  const oldest = items.reduce<string | null>((min, item) => !min || item.publishedAt < min ? item.publishedAt : min, null);
  if (!rows.length) return null;
  const max = rows[0][1];
  return <div className="radar-card">
    <div className="radar-card-head"><h3>{t("publishersTitle")}</h3>{oldest && <span>{t("publishersDetail", { count: items.length })} <PortalDate date={oldest}/></span>}</div>
    <ul className="radar-bars">{rows.map(([name, count], index) => <li key={name}><span>{name}</span><span className="radar-bar-track"><span className="rc-grow-x" style={{ width: `${count / max * 100}%`, ...delay(300 + index * 90) }}/></span><strong>{count}</strong></li>)}</ul>
  </div>;
}

export function RankingSnapshot({ boards }: { boards: Leaderboard[] }) {
  const t = useTranslations("Portal");
  const benchmarkText = useTranslations("Benchmarks");
  const [boardId, setBoardId] = useState(boards.find(board => board.status === "ok")?.id ?? boards[0].id);
  const board = useMemo(() => localizeLeaderboard(boards.find(item => item.id === boardId) ?? boards[0], benchmarkText), [boards, boardId, benchmarkText]);
  const metric = overallMetric(board);
  const top = rankBy(board, metric).slice(0, 8);
  const decimals = board.id === "livebench" ? 1 : 0;
  const format = useNumber(decimals);
  const values = top.map(model => model.value);
  const lo = Math.floor(Math.min(...values) - 0.5);
  const hi = Math.ceil(Math.max(...values) + 0.5);
  const orgs = ORGS.filter(key => top.some(model => orgKey(model.organization) === key));
  return <div className="radar-card radar-ranking">
    <div className="radar-segment" role="group" aria-label={t("benchmarkSource")}>{boards.map(item => <button type="button" key={item.id} aria-pressed={item.id === board.id} className={item.id === board.id ? "selected" : ""} onClick={() => setBoardId(item.id)}>{item.name}</button>)}</div>
    {board.status !== "ok" || !metric || !top.length ? <p className="radar-tile-empty">{t("benchmarkFailed")}</p> : <>
      <div className="radar-card-head"><h3>{t("overallTop", { metric: metric.label, count: top.length })}</h3><span>{t("scaleRange", { min: lo, max: hi })}</span></div>
      <ol className="radar-dots" key={board.id}>{top.map((model, index) => <li key={model.id} title={`${model.name} · ${model.organization} · ${format.format(model.value)}`}>
        <span className="radar-rank">{String(model.rank).padStart(2, "0")}</span>
        <a href={model.url} target="_blank" rel="noreferrer" className={index === 0 ? "leader" : ""}><strong>{model.name}</strong><small>{model.organization}</small></a>
        <span className="radar-dot-track" aria-hidden="true"><span className="rc-slide" style={{ left: `calc(${(model.value - lo) / (hi - lo) * 100}% - 7px)`, background: orgColor(orgKey(model.organization)), ...delay(250 + index * 80) }}/></span>
        <span className="radar-value">{format.format(model.value)}</span>
      </li>)}</ol>
      <OrgLegend keys={orgs}/>
    </>}
    <footer className="radar-source"><a href={board.url} target="_blank" rel="noreferrer">{t("source")} {board.name}<ArrowUpRight size={12} aria-hidden="true"/></a>{board.fetchedAt && <span>{t("fetched")} <PortalDate date={board.fetchedAt} includeTime/> UTC</span>}</footer>
  </div>;
}

export function CategoryLeaders({ board: rawBoard }: { board: Leaderboard }) {
  const t = useTranslations("Portal");
  const board = useLocalized(rawBoard);
  const format = useNumber(1);
  const leaders = categoryLeaders(board);
  const standout = standoutCategory(board);
  if (board.status !== "ok" || !leaders.length) return null;
  return <div className="radar-card">
    <div className="radar-card-head"><h3>{t("leadersTitle")}</h3><span>{board.name}</span></div>
    <ul className="radar-leaders">{leaders.map((entry, index) => <li key={entry.metric.key} className="rc-rise" style={delay(200 + index * 60)}><span>{entry.metric.label}</span><span className="radar-leader-name"><span className="radar-dot" style={{ background: orgColor(orgKey(entry.leader.organization)) }}/><span>{entry.leader.name}</span></span><strong>{format.format(entry.leader.value)}</strong></li>)}</ul>
    {standout && <p className="radar-note">{t("leadersStandout", { model: standout.leader.name, rank: standout.overallRank ?? 0, category: standout.metric.label, margin: format.format(standout.margin) })}</p>}
  </div>;
}

function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setWidth(Math.max(280, node.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export function CostScatter({ board: rawBoard }: { board: Leaderboard }) {
  const t = useTranslations("Portal");
  const locale = useLocale();
  const board = useLocalized(rawBoard);
  const [ref, width] = useWidth(1100);
  const [hover, setHover] = useState<ScatterPoint | null>(null);
  const points = useMemo(() => scatterPoints(board), [board]);
  const cost = costMetric(board);
  const score = overallMetric(board);
  if (board.status !== "ok" || !cost || !score || points.length < 5) return null;
  const narrow = width < 640;
  const height = narrow ? 340 : 440;
  const m = { l: narrow ? 36 : 52, r: 16, t: 16, b: 44 };
  const lx = Math.floor(Math.log10(Math.min(...points.map(point => point.cost))));
  const hx = Math.ceil(Math.log10(Math.max(...points.map(point => point.cost))));
  const hy = Math.ceil(Math.max(...points.map(point => point.score)) / 10) * 10;
  const sx = (value: number) => m.l + (Math.log10(value) - lx) / (hx - lx) * (width - m.l - m.r);
  const sy = (value: number) => m.t + (1 - value / hy) * (height - m.t - m.b);
  const money = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: value < 0.01 ? 4 : value < 1 ? 2 : 2, minimumFractionDigits: value >= 1 && Number.isInteger(value) ? 0 : 2 }).format(value);
  const frontier = costFrontier(points);
  const value = bestValue(points);
  const top = [...points].sort((a, b) => b.score - a.score)[0];
  const labels = [top, value].filter((point, index, list): point is ScatterPoint => Boolean(point) && list.findIndex(item => item?.id === point?.id) === index);
  const xTicks = Array.from({ length: hx - lx + 1 }, (_, index) => Math.pow(10, lx + index));
  const yStep = hy > 40 ? 20 : 10;
  const yTicks = Array.from({ length: hy / yStep + 1 }, (_, index) => index * yStep);
  const ordered = [...points].sort((a, b) => (a.org === "other" ? 0 : 1) - (b.org === "other" ? 0 : 1));
  const orgs = ORGS.filter(key => points.some(point => point.org === key));
  function track(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let best: ScatterPoint | null = null;
    let distance = 18 * 18;
    for (const point of points) {
      const d = (sx(point.cost) - x) ** 2 + (sy(point.score) - y) ** 2;
      if (d < distance) { distance = d; best = point; }
    }
    setHover(best);
  }
  return <div className="radar-card radar-scatter">
    <div className="radar-scatter-head">
      <div><h2>{t("scatterTitle", { y: score.label, x: cost.label })}</h2><p>{t("scatterDescription", { count: points.length, source: board.name })}</p></div>
      <ul className="radar-legend">{orgs.map(key => <li key={key}><span className="radar-dot" style={{ background: orgColor(key) }}/>{t(`org.${key}`)}</li>)}<li><span className="radar-line-key"/>{t("frontier")}</li></ul>
    </div>
    <div ref={ref} className="radar-scatter-plot">
      <svg width={width} height={height} role="img" aria-label={t("scatterAria", { y: score.label, x: cost.label })} onPointerMove={track} onPointerLeave={() => setHover(null)}>
        {yTicks.map(tick => <g key={`y${tick}`}><line x1={m.l} x2={width - m.r} y1={sy(tick)} y2={sy(tick)} className="radar-grid"/><text x={m.l - 10} y={sy(tick) + 4} textAnchor="end" className="radar-axis">{tick}</text></g>)}
        {xTicks.map(tick => <g key={`x${tick}`}><line x1={sx(tick)} x2={sx(tick)} y1={m.t} y2={height - m.b} className="radar-grid"/><text x={sx(tick)} y={height - m.b + 20} textAnchor="middle" className="radar-axis">{money(tick)}</text></g>)}
        <text x={(m.l + width - m.r) / 2} y={height - 6} textAnchor="middle" className="radar-axis-title">{t("scatterX", { metric: cost.label })}</text>
        <polyline points={frontier.map(point => `${sx(point.cost).toFixed(1)},${sy(point.score).toFixed(1)}`).join(" ")} pathLength={1} className="radar-frontier rc-draw" style={delay(1500)}/>
        {ordered.map(point => {
          const on = hover?.id === point.id;
          return <circle key={point.id} cx={sx(point.cost)} cy={sy(point.score)} r={(point.org === "other" ? 4 : 5) + (on ? 3 : 0)} fill={orgColor(point.org)} className={`radar-point rc-pop ${on ? "on" : ""}`} style={delay(300 + (sx(point.cost) - m.l) / (width - m.l) * 1100)}/>;
        })}
        {!narrow && labels.map(point => {
          const x = sx(point.cost);
          const start = x < 220;
          return <text key={`l${point.id}`} x={start ? x + 12 : x - 12} y={sy(point.score) + 4} textAnchor={start ? "start" : "end"} className="radar-point-label rc-fade" style={delay(2600)}>{point.name}</text>;
        })}
      </svg>
      {hover && <div className="radar-tooltip" style={{ left: Math.min(width - 250, sx(hover.cost) + 14), top: Math.max(0, sy(hover.score) - 30) }}>
        <strong>{hover.name}</strong>
        <span><span className="radar-dot" style={{ background: orgColor(hover.org) }}/>{hover.organization}</span>
        <span>{score.label}: {hover.score} · {cost.label}: {money(hover.cost)}</span>
      </div>}
    </div>
    <details className="radar-table-toggle">
      <summary>{t("scatterTable")}</summary>
      <table><caption className="sr-only">{t("frontier")}</caption><thead><tr><th scope="col">{t("model")}</th><th scope="col">{t("organization")}</th><th scope="col" className="numeric">{score.label}</th><th scope="col" className="numeric">{cost.label}</th></tr></thead>
        <tbody>{frontier.slice().reverse().map(point => <tr key={point.id}><td>{point.name}</td><td>{point.organization}</td><td className="numeric">{point.score}</td><td className="numeric">{money(point.cost)}</td></tr>)}</tbody></table>
    </details>
    <footer className="radar-source"><a href={board.url} target="_blank" rel="noreferrer">{t("source")} {board.name}<ArrowUpRight size={12} aria-hidden="true"/></a><span>{t("scatterNote")}</span></footer>
  </div>;
}

export function ExperimentHighlights({ items }: { items: Experiment[] }) {
  const t = useTranslations("Portal");
  if (!items.length) return null;
  const max = Math.max(1, ...items.map(item => item.points));
  return <div className="radar-card radar-experiments">{items.map((item, index) => <article key={item.id}>
    <div className="radar-release-meta"><span className="radar-kind">{t(item.kind === "Jogos" ? "games" : item.kind === "Código" ? "coding" : "evaluations")}</span><span><PortalDate date={item.publishedAt}/> · <a href={item.discussionUrl} target="_blank" rel="noreferrer"><MessageSquare size={12} aria-hidden="true"/>{t("comments", { count: item.comments })}</a></span></div>
    <h3 lang={item.translation?.locale}><a href={item.url} target="_blank" rel="noreferrer">{item.translation?.text ?? item.title}</a></h3>
    <div className="radar-points"><span className="radar-bar-track"><span className="rc-grow-x" style={{ width: `${item.points / max * 100}%`, ...delay(300 + index * 150) }}/></span><strong>{t("points", { count: item.points })}</strong></div>
  </article>)}</div>;
}

export function ModelHighlights({ livebench: rawLive, analysis: rawAnalysis }: { livebench: Leaderboard; analysis: Leaderboard }) {
  const t = useTranslations("Portal");
  const live = useLocalized(rawLive);
  const analysis = useLocalized(rawAnalysis);
  const one = useNumber(1);
  const locale = useLocale();
  const leader = live.status === "ok" ? leaderSummary(live) : null;
  const standout = live.status === "ok" ? standoutCategory(live) : null;
  const value = analysis.status === "ok" ? bestValue(scatterPoints(analysis)) : null;
  const cost = costMetric(analysis);
  const score = overallMetric(analysis);
  const tiles = [
    leader && { label: t("bestOverall"), number: <CountUp value={leader.leader.value} decimals={1}/>, model: leader.leader.name, org: orgKey(leader.leader.organization), detail: t("bestOverallDetail", { margin: one.format(leader.margin), board: live.name }) },
    standout && { label: t("standoutTitle", { category: standout.metric.label }), number: <CountUp value={standout.leader.value} decimals={1}/>, model: standout.leader.name, org: orgKey(standout.leader.organization), detail: t("standoutDetail", { rank: standout.overallRank ?? 0, margin: one.format(standout.margin) }) },
    value && cost && score && { label: t("bestValue"), number: <CountUp value={value.cost} decimals={value.cost < 0.1 ? 2 : 2} prefix="US$ "/>, model: value.name, org: value.org, detail: t("bestValueDetail", { score: new Intl.NumberFormat(locale).format(value.score), metric: score.label, source: analysis.name }) },
  ].filter(Boolean) as { label: string; number: React.ReactNode; model: string; org: OrgKey; detail: string }[];
  if (!tiles.length) return null;
  return <section className="radar-tiles three" aria-label={t("highlights")}>{tiles.map((tile, index) => <div key={tile.label} className="radar-tile rc-rise" style={delay(160 + index * 80)}>
    <span className="radar-tile-label">{tile.label}</span>
    <div className="radar-tile-main"><strong>{tile.number}</strong></div>
    <span className="radar-tile-model"><span className="radar-dot" style={{ background: orgColor(tile.org) }}/>{tile.model}</span>
    <span className="radar-tile-detail">{tile.detail}</span>
  </div>)}</section>;
}

export function StrengthHeatmap({ board: rawBoard, limit = 10 }: { board: Leaderboard; limit?: number }) {
  const t = useTranslations("Portal");
  const board = useLocalized(rawBoard);
  const format = useNumber(1);
  if (board.status !== "ok") return null;
  const map = heatmap(board, limit);
  if (!map.rows.length) return null;
  const orgs = ORGS.filter(key => map.rows.some(row => orgKey(row.model.organization) === key));
  return <section className="radar-card radar-heatmap" aria-labelledby="heatmap-title">
    <div className="radar-scatter-head">
      <div><h2 id="heatmap-title">{t("heatmapTitle", { count: map.rows.length })}</h2><p>{t("heatmapDescription", { count: map.rows.length })}</p></div>
      <div className="radar-ramp" aria-hidden="true"><span>{t("heatmapLow")}</span>{[0, 1, 2, 3, 4].map(level => <i key={level} className={`heat-${level}`}/>)}<span>{t("heatmapHigh")}</span></div>
    </div>
    <div className="radar-heat-scroll">
      <table className="radar-heat" style={{ "--cols": map.columns.length } as CSSProperties}>
        <caption className="sr-only">{t("heatmapTitle", { count: map.rows.length })}</caption>
        <thead><tr><th scope="col">{t("model")}</th>{map.columns.map((column, index) => <th scope="col" key={column.metric.key} className={index === 0 ? "overall" : ""}>{column.metric.label}</th>)}</tr></thead>
        <tbody>{map.rows.map((row, i) => <tr key={row.model.id}>
          <th scope="row" className="rc-rise" style={delay(400 + i * 50)}><span className="radar-rank">{String(row.model.rank).padStart(2, "0")}</span><span className="radar-dot" style={{ background: orgColor(orgKey(row.model.organization)) }}/><a href={row.model.url} target="_blank" rel="noreferrer">{row.model.name}</a></th>
          {row.cells.map((cell, j) => <td key={map.columns[j].metric.key} className={`heat-${cell.level} ${cell.leader ? "leader rc-cell-lead" : "rc-cell"}`} style={delay(500 + (i + j) * 45)} title={cell.value == null ? undefined : `${row.model.name} · ${map.columns[j].metric.label}: ${format.format(cell.value)}`}>{cell.value == null ? "—" : format.format(cell.value)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <footer className="radar-source"><OrgLegend keys={orgs}/><span>{t("source")} {board.name}{board.release && ` · ${t("version")} ${board.release}`}</span></footer>
  </section>;
}

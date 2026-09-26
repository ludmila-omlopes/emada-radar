"use client";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { CountUp, Sparkline, delay, useNumber } from "./radar";
import { PortalRefresh } from "./portal-refresh";

// Shared building blocks for the portal pages: hero, stat tiles, bar lists
// and a daily column chart. All of them use the radar.css motion classes.

export function RadarHero({ eyebrow, title, description, status, refresh = false }: { eyebrow?: string; title: string; description: string; status?: ReactNode; refresh?: boolean }) {
  return <header className="radar-hero">
    <div>
      {eyebrow && <p className="radar-eyebrow rc-rise">{eyebrow}</p>}
      <h1 className="rc-rise" style={delay(80)}>{title}</h1>
      <p className="radar-lede rc-rise" style={delay(160)}>{description}</p>
    </div>
    {(status || refresh) && <div className="radar-status rc-fade" style={delay(240)}>{status}{refresh && <PortalRefresh/>}</div>}
  </header>;
}

export function LiveStatus({ available, total, label }: { available: number; total: number; label: string }) {
  return <span><span className={`radar-live ${available === total ? "rc-pulse" : "partial"}`} aria-hidden="true"/>{label}</span>;
}

export type StatTile = { label: string; value: number; decimals?: number; prefix?: string; compact?: boolean; detail?: string; spark?: number[]; sparkLabel?: string; text?: string };

export function StatTiles({ items, label }: { items: StatTile[]; label: string }) {
  return <section className={`radar-tiles ${items.length === 3 ? "three" : ""}`} aria-label={label}>{items.map((item, index) => <div key={item.label} className="radar-tile rc-rise" style={delay(200 + index * 80)}>
    <span className="radar-tile-label">{item.label}</span>
    <div className="radar-tile-row">
      <div className="radar-tile-main"><strong className={item.text ? "radar-tile-text" : ""}>{item.text ?? <CountUp value={item.value} decimals={item.decimals} prefix={item.prefix} compact={item.compact}/>}</strong>{item.detail && <span>{item.detail}</span>}</div>
      {item.spark && <Sparkline values={item.spark} label={item.sparkLabel ?? item.label}/>}
    </div>
  </div>)}</section>;
}

export type BarRow = { key: string; label: string; value: number; href?: string; sub?: string };

export function BarList({ title, detail, rows, compact = false, limit, className = "" }: { title: string; detail?: string; rows: BarRow[]; compact?: boolean; limit?: number; className?: string }) {
  const format = useNumber(0, compact);
  const shown = rows.slice(0, limit ?? rows.length);
  if (!shown.length) return null;
  const max = Math.max(1, ...shown.map(row => row.value));
  return <div className={`radar-card ${className}`}>
    <div className="radar-card-head"><h3>{title}</h3>{detail && <span>{detail}</span>}</div>
    <ul className="radar-bars wide">{shown.map((row, index) => <li key={row.key}>
      <span className="radar-bar-label">{row.href ? <a href={row.href} target="_blank" rel="noreferrer">{row.label}<ArrowUpRight size={12} aria-hidden="true"/></a> : row.label}{row.sub && <small>{row.sub}</small>}</span>
      <span className="radar-bar-track"><span className="rc-grow-x" style={{ width: `${row.value / max * 100}%`, ...delay(250 + index * 70) }}/></span>
      <strong>{format.format(row.value)}</strong>
    </li>)}</ul>
  </div>;
}

export function DayColumns({ counts, end, highlight = 7 }: { counts: number[]; end: string; highlight?: number }) {
  const t = useTranslations("Portal");
  const locale = useLocale();
  const max = Math.max(1, ...counts);
  const endDay = Math.floor(new Date(end).getTime() / 86_400_000);
  const date = (index: number) => new Date((endDay - (counts.length - 1 - index)) * 86_400_000);
  const label = (index: number) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(date(index));
  const ticks = counts.map((_, index) => index).filter(index => (counts.length - 1 - index) % 7 === 0);
  return <div className="radar-card">
    <div className="radar-card-head"><h3>{t("perDayTitle")}</h3><span>{t("perDayDetail", { days: counts.length })}</span></div>
    <div className="radar-columns" role="img" aria-label={`${t("perDayTitle")}: ${counts.map((count, index) => `${label(index)} ${count}`).join(", ")}`}>
      <div className="radar-columns-grid" aria-hidden="true"><span>{max}</span><span>{Math.round(max / 2)}</span><span>0</span></div>
      <div className="radar-columns-bars">{counts.map((count, index) => <span key={index} className="radar-column" title={t("dayTooltip", { date: label(index), count })}>
        <span className={`rc-grow-y ${index >= counts.length - highlight ? "current" : ""}`} style={{ height: `${count / max * 100}%`, ...delay(200 + index * 25) }}/>
      </span>)}</div>
      <div className="radar-columns-axis" aria-hidden="true">{counts.map((_, index) => <span key={index}>{ticks.includes(index) ? label(index) : ""}</span>)}</div>
    </div>
  </div>;
}

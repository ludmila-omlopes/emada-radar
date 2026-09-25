import type { Experiment, Leaderboard, Metric, PortalArticle, RankedModel } from "./portal-types";

// Pure helpers that turn the portal's collections into chart-ready summaries.
// Kept free of React and server-only imports so they can be unit tested.

export type OrgKey = "anthropic" | "openai" | "google" | "other";
const DAY = 86_400_000;

export function orgKey(name: string): OrgKey {
  const value = name.toLowerCase();
  if (value.includes("anthropic") || value.startsWith("claude")) return "anthropic";
  if (value.includes("openai") || value.startsWith("gpt")) return "openai";
  if (value.includes("google") || value.includes("deepmind") || value.startsWith("gemini")) return "google";
  return "other";
}

const time = (value: string) => new Date(value).getTime();

export function dailyCounts(items: { publishedAt: string }[], now: number, days = 14): number[] {
  const end = Math.floor(now / DAY);
  const counts = Array.from({ length: days }, () => 0);
  for (const item of items) {
    const day = Math.floor(time(item.publishedAt) / DAY);
    const index = days - 1 - (end - day);
    if (index >= 0 && index < days) counts[index]++;
  }
  return counts;
}

export function newsSummary(items: PortalArticle[], now: number) {
  const age = (item: PortalArticle) => now - time(item.publishedAt);
  const recent = items.filter(item => age(item) >= 0 && age(item) < 7 * DAY);
  const previous = items.filter(item => age(item) >= 7 * DAY && age(item) < 14 * DAY);
  const releases30 = items.filter(item => item.modelRelease && age(item) < 30 * DAY);
  const releases7 = releases30.filter(item => age(item) < 7 * DAY);
  const byOrg = (list: PortalArticle[]) => (["openai", "anthropic", "google", "other"] as OrgKey[]).map(key => ({ key, count: list.filter(item => orgKey(item.source) === key).length })).filter(entry => entry.count > 0);
  return { last7: recent.length, previous7: previous.length, spark: dailyCounts(items, now, 14), releases7: releases7.length, releases30: releases30.length, releaseOrgs: byOrg(releases7) };
}

export function featuredReleases(items: PortalArticle[], now: number, limit = 4) {
  const releases = items.filter(item => item.modelRelease).sort((a, b) => time(b.publishedAt) - time(a.publishedAt));
  const week = releases.filter(item => now - time(item.publishedAt) < 7 * DAY);
  return { thisWeek: week.length > 0, items: (week.length ? week : releases).slice(0, limit) };
}

export function sourceCounts(items: PortalArticle[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
  const oldest = items.reduce<string | null>((min, item) => !min || item.publishedAt < min ? item.publishedAt : min, null);
  return { oldest, rows: [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) };
}

export function topExperiments(items: Experiment[], limit = 3) {
  return [...items].sort((a, b) => b.points - a.points || b.comments - a.comments).slice(0, limit);
}

export function experimentSummary(items: Experiment[]) {
  const kinds = { "Avaliações": 0, "Código": 0, "Jogos": 0 } as Record<Experiment["kind"], number>;
  for (const item of items) kinds[item.kind]++;
  return { total: items.length, topPoints: items.reduce((max, item) => Math.max(max, item.points), 0), kinds };
}

export type RankedEntry = RankedModel & { rank: number; value: number };

export function rankBy(board: Leaderboard, metric: Metric | undefined): RankedEntry[] {
  if (!metric) return [];
  const sorted = board.models.filter(model => model.scores[metric.key] != null).sort((a, b) => (metric.lowerIsBetter ? 1 : -1) * (a.scores[metric.key]! - b.scores[metric.key]!) || a.name.localeCompare(b.name));
  return sorted.map((model, index) => {
    const value = model.scores[metric.key]!;
    const first = sorted.findIndex(item => item.scores[metric.key] === value);
    return { ...model, value, rank: (index > 0 && sorted[index - 1].scores[metric.key] === value ? first : index) + 1 };
  });
}

export const overallMetric = (board: Leaderboard) => board.metrics.find(metric => metric.key === "overall");
export const categoryMetrics = (board: Leaderboard) => board.metrics.filter(metric => metric.key !== "overall" && metric.unit === "score");

export function leaderSummary(board: Leaderboard) {
  const ranked = rankBy(board, overallMetric(board));
  if (!ranked.length) return null;
  return { leader: ranked[0], margin: ranked.length > 1 ? ranked[0].value - ranked[1].value : 0 };
}

export function categoryLeaders(board: Leaderboard) {
  const overall = rankBy(board, overallMetric(board));
  const overallRank = new Map(overall.map(model => [model.id, model.rank]));
  return categoryMetrics(board).flatMap(metric => {
    const ranked = rankBy(board, metric);
    if (!ranked.length) return [];
    return [{ metric, leader: ranked[0], margin: ranked.length > 1 ? ranked[0].value - ranked[1].value : 0, overallRank: overallRank.get(ranked[0].id) ?? null }];
  });
}

// A category led by a model outside the overall top, ranked by its lead.
export function standoutCategory(board: Leaderboard, minRank = 4) {
  return categoryLeaders(board).filter(entry => entry.overallRank != null && entry.overallRank >= minRank).sort((a, b) => b.margin - a.margin || b.overallRank! - a.overallRank!)[0] ?? null;
}

export function heatmap(board: Leaderboard, limit = 10) {
  const top = rankBy(board, overallMetric(board)).slice(0, limit);
  const metrics = [overallMetric(board), ...categoryMetrics(board)].filter((metric): metric is Metric => Boolean(metric));
  const columns = metrics.map(metric => {
    const values = top.map(model => model.scores[metric.key]).filter((value): value is number => value != null);
    return { metric, min: Math.min(...values), max: Math.max(...values) };
  });
  return { columns, rows: top.map(model => ({ model, cells: columns.map(column => {
    const value = model.scores[column.metric.key];
    if (value == null) return { value: null, level: -1, leader: false };
    const span = column.max - column.min;
    return { value, level: span > 0 ? Math.min(4, Math.floor((value - column.min) / span * 5)) : 4, leader: value === column.max };
  }) })) };
}

export type ScatterPoint = { id: string; name: string; organization: string; org: OrgKey; score: number; cost: number; url: string };

export function costMetric(board: Leaderboard) {
  return board.metrics.find(metric => metric.key === "costPerTask") ?? board.metrics.find(metric => metric.key === "output");
}

export function scatterPoints(board: Leaderboard): ScatterPoint[] {
  const cost = costMetric(board);
  const score = overallMetric(board);
  if (!cost || !score) return [];
  return board.models.flatMap(model => {
    const x = model.scores[cost.key];
    const y = model.scores[score.key];
    return x != null && y != null && x > 0 ? [{ id: model.id, name: model.name, organization: model.organization, org: orgKey(model.organization), score: y, cost: x, url: model.url }] : [];
  });
}

// Models no other model beats on score at the same or lower cost.
export function costFrontier(points: ScatterPoint[]) {
  const sorted = [...points].sort((a, b) => a.cost - b.cost || b.score - a.score);
  const frontier: ScatterPoint[] = [];
  for (const point of sorted) if (!frontier.length || point.score > frontier.at(-1)!.score) frontier.push(point);
  return frontier;
}

// Frontier model with the most score per dollar among those at or above the median score.
export function bestValue(points: ScatterPoint[]) {
  if (!points.length) return null;
  const scores = points.map(point => point.score).sort((a, b) => a - b);
  const median = scores[Math.floor(scores.length / 2)];
  return costFrontier(points).filter(point => point.score >= median).sort((a, b) => b.score / b.cost - a.score / a.cost)[0] ?? null;
}

// Server pages read the clock through this helper so render code stays pure.
export const currentTime = () => Date.now();

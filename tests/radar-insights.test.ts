import test from "node:test";
import assert from "node:assert/strict";
import { bestValue, categoryLeaders, costFrontier, dailyCounts, featuredReleases, heatmap, leaderSummary, newsSummary, orgKey, rankBy, scatterPoints, standoutCategory } from "../src/lib/radar-insights";
import type { Leaderboard, PortalArticle } from "../src/lib/portal-types";

const now = Date.parse("2026-09-25T20:00:00Z");
const day = 86_400_000;
const article = (id: string, daysAgo: number, source = "OpenAI", modelRelease = false): PortalArticle => ({ id, title: id, url: `https://example.com/${id}`, source, category: "news", publishedAt: new Date(now - daysAgo * day).toISOString(), modelRelease });

const board = (models: [string, string, Record<string, number | null>][]): Leaderboard => ({
  id: "livebench", name: "LiveBench", url: "https://livebench.ai/", release: null, fetchedAt: null, status: "ok",
  metrics: [{ key: "overall", label: "Overall", description: "", unit: "score" }, { key: "Coding", label: "Coding", description: "", unit: "score" }, { key: "Agentic Coding", label: "Agentic", description: "", unit: "score" }, { key: "cost", label: "Cost", description: "", unit: "usd", lowerIsBetter: true }],
  models: models.map(([name, organization, scores]) => ({ id: name, name, organization, url: "https://example.com", scores })),
});

test("maps sources and model makers to organization colors", () => {
  assert.equal(orgKey("Google DeepMind"), "google");
  assert.equal(orgKey("Anthropic"), "anthropic");
  assert.equal(orgKey("OpenAI"), "openai");
  assert.equal(orgKey("Hugging Face"), "other");
});

test("summarizes the news week, releases and daily counts", () => {
  const items = [article("a", 0.2), article("b", 1, "Anthropic", true), article("c", 3, "Google AI", true), article("d", 8), article("e", 10), article("f", 20, "OpenAI", true)];
  const summary = newsSummary(items, now);
  assert.equal(summary.last7, 3);
  assert.equal(summary.previous7, 2);
  assert.equal(summary.releases7, 2);
  assert.equal(summary.releases30, 3);
  assert.deepEqual(summary.releaseOrgs, [{ key: "anthropic", count: 1 }, { key: "google", count: 1 }]);
  assert.equal(dailyCounts(items, now, 14).reduce((a, b) => a + b, 0), 5);
  assert.equal(dailyCounts(items, now, 14).at(-1), 1);
  assert.deepEqual(featuredReleases(items, now).items.map(item => item.id), ["b", "c"]);
  assert.deepEqual(featuredReleases([article("old", 20, "OpenAI", true)], now), { thisWeek: false, items: [article("old", 20, "OpenAI", true)] });
});

test("ranks with ties, finds category leaders and the standout", () => {
  const lb = board([
    ["A", "Anthropic", { overall: 83, Coding: 90, "Agentic Coding": 60 }],
    ["B", "OpenAI", { overall: 82, Coding: 85, "Agentic Coding": 55 }],
    ["C", "OpenAI", { overall: 82, Coding: 80, "Agentic Coding": 50 }],
    ["D", "Meta", { overall: 81, Coding: 70, "Agentic Coding": 52 }],
    ["E", "DeepSeek", { overall: 80, Coding: 75, "Agentic Coding": 70 }],
  ]);
  assert.deepEqual(rankBy(lb, lb.metrics[0]).map(model => model.rank), [1, 2, 2, 4, 5]);
  assert.deepEqual(leaderSummary(lb), { leader: rankBy(lb, lb.metrics[0])[0], margin: 1 });
  assert.deepEqual(categoryLeaders(lb).map(entry => [entry.metric.key, entry.leader.name]), [["Coding", "A"], ["Agentic Coding", "E"]]);
  const standout = standoutCategory(lb);
  assert.equal(standout?.leader.name, "E");
  assert.equal(standout?.overallRank, 5);
  assert.equal(standout?.margin, 10);
  const map = heatmap(lb, 3);
  assert.equal(map.rows.length, 3);
  assert.deepEqual(map.columns.map(column => column.metric.key), ["overall", "Coding", "Agentic Coding"]);
  assert.equal(map.rows[0].cells[0].leader, true);
  assert.equal(map.rows[0].cells[0].level, 4);
  assert.equal(map.rows[2].cells[1].level, 0);
});

test("builds the cost frontier and best value pick", () => {
  const aa: Leaderboard = { ...board([]), id: "artificial-analysis", name: "Artificial Analysis", metrics: [{ key: "overall", label: "Intelligence", description: "", unit: "score" }, { key: "costPerTask", label: "Cost per task", description: "", unit: "usd", lowerIsBetter: true }], models: [
    ["Cheap", "OpenAI", { overall: 20, costPerTask: 0.01 }], ["Mid", "Xiaomi", { overall: 40, costPerTask: 0.1 }], ["Worse", "Other", { overall: 30, costPerTask: 0.5 }],
    ["Top", "Anthropic", { overall: 58, costPerTask: 6 }], ["Free", "Lab", { overall: 10, costPerTask: 0 }], ["Missing", "Lab", { overall: 50, costPerTask: null }],
  ].map(([name, organization, scores]) => ({ id: name as string, name: name as string, organization: organization as string, url: "https://example.com", scores: scores as Record<string, number | null> })) };
  const points = scatterPoints(aa);
  assert.deepEqual(points.map(point => point.name), ["Cheap", "Mid", "Worse", "Top"]);
  assert.deepEqual(costFrontier(points).map(point => point.name), ["Cheap", "Mid", "Top"]);
  assert.equal(bestValue(points)?.name, "Mid");
});

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { Locale } from "@/i18n/config";
import { bestValue, costMetric, overallMetric, rankBy, scatterPoints, topExperiments } from "./radar-insights";
import type { Experiment, Leaderboard, PortalArticle, SocialPost } from "./portal-types";

// Pure newsletter rules shared by the store, the cron route and the tests.
export const NEWSLETTER_LIMITS = {
  confirmHours: 72,
  resendMinutes: 15,
  confirmationsPerHour: 60,
  pendingDays: 30,
  batchSize: 100,
  // Monday opens the week's issue; Tuesday and Wednesday retry if Monday failed.
  openingDays: [1, 2, 3],
} as const;
export const CONSENT_VERSION = "2026-09-29";

export const newsletterEmail = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const isToken = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);

const DAY = 86_400_000;
const WEEK = 7 * DAY;

// ISO 8601 week in UTC, e.g. 2026-W40. One issue per key.
export function issueKey(now: Date) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const week = Math.ceil(((day.getTime() - Date.UTC(day.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
export const canOpenIssue = (now: Date) => (NEWSLETTER_LIMITS.openingDays as readonly number[]).includes(now.getUTCDay());

export type DigestItem = { title: string; url: string; source: string; publishedAt: string; translated?: boolean };
export type DigestExperiment = DigestItem & { points: number; comments: number; discussionUrl: string };
export type DigestVoice = { name: string; username: string; text: string; url: string; publishedAt: string; translated?: boolean };
export type DigestModel = { rank: number; name: string; organization: string; score: number; url: string };
export type Digest = {
  locale: Locale;
  issueKey: string;
  start: string;
  end: string;
  releases: DigestItem[];
  news: DigestItem[];
  ranking: { source: string; url: string; release: string | null; models: DigestModel[] } | null;
  bestValue: { name: string; organization: string; score: number; cost: number; costKey: string; url: string } | null;
  experiments: DigestExperiment[];
  voices: DigestVoice[];
};
export type DigestContent = Record<Locale, Digest>;
export type DigestSources = { news: PortalArticle[]; experiments: Experiment[]; social: SocialPost[]; livebench: Leaderboard; artificialAnalysis: Leaderboard };

export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch { return ""; }
}
const time = (value: string) => new Date(value).getTime();
const newestFirst = (a: { publishedAt: string }, b: { publishedAt: string }) => time(b.publishedAt) - time(a.publishedAt);
const inWeek = (item: { publishedAt: string; url: string }, now: number) => {
  const age = now - time(item.publishedAt);
  return age >= 0 && age < WEEK && Boolean(safeUrl(item.url));
};
function truncate(text: string, max: number) {
  const chars = Array.from(text.trim());
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : chars.join("");
}

// Round-robin across sources so one busy feed cannot fill the whole section.
export function interleaveSources<T extends { source: string; publishedAt: string }>(items: T[], limit: number) {
  const groups = new Map<string, T[]>();
  for (const item of [...items].sort(newestFirst)) groups.set(item.source, [...(groups.get(item.source) ?? []), item]);
  const picked: T[] = [];
  for (let round = 0; picked.length < limit && [...groups.values()].some(list => list.length > round); round++) {
    for (const list of groups.values()) if (list[round] && picked.length < limit) picked.push(list[round]);
  }
  return picked.sort(newestFirst);
}

// Feed titles can carry line breaks; a header such as the subject must be one line.
export const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();
const article = (item: PortalArticle): DigestItem => ({ title: oneLine(item.translation?.text ?? item.title), url: safeUrl(item.url), source: item.source, publishedAt: item.publishedAt, ...(item.translation ? { translated: true } : {}) });

export function selectDigest(sources: DigestSources, locale: Locale, now: number): Digest {
  const recent = sources.news.filter(item => inWeek(item, now));
  const ranked = sources.livebench.status === "ok" ? rankBy(sources.livebench, overallMetric(sources.livebench)).slice(0, 5) : [];
  const value = sources.artificialAnalysis.status === "ok" ? bestValue(scatterPoints(sources.artificialAnalysis)) : null;
  const cost = costMetric(sources.artificialAnalysis);
  return {
    locale,
    issueKey: issueKey(new Date(now)),
    start: new Date(now - WEEK).toISOString(),
    end: new Date(now).toISOString(),
    releases: recent.filter(item => item.modelRelease).sort(newestFirst).slice(0, 5).map(article),
    news: interleaveSources(recent.filter(item => !item.modelRelease), 6).map(article),
    ranking: ranked.length ? { source: sources.livebench.name, url: safeUrl(sources.livebench.url), release: sources.livebench.release, models: ranked.map(model => ({ rank: model.rank, name: model.name, organization: model.organization, score: model.value, url: safeUrl(model.url) })) } : null,
    bestValue: value && cost ? { name: value.name, organization: value.organization, score: value.score, cost: value.cost, costKey: cost.key, url: safeUrl(value.url) } : null,
    experiments: topExperiments(sources.experiments.filter(item => inWeek(item, now)), 3).map(item => ({ ...article(item), points: item.points, comments: item.comments, discussionUrl: safeUrl(item.discussionUrl) })),
    voices: sources.social.filter(post => inWeek(post, now)).sort(newestFirst).slice(0, 3).map(post => ({ name: post.profile.name, username: post.profile.username, text: truncate(post.translation?.text ?? post.text, 280), url: safeUrl(post.url), publishedAt: post.publishedAt, ...(post.translation ? { translated: true } : {}) })),
  };
}
export const isEmptyDigest = (digest: Digest) => !digest.releases.length && !digest.news.length && !digest.experiments.length;

export function newsletterLinks(baseUrl: string, locale: Locale, campaign?: string) {
  const site = (path: string) => {
    const url = new URL(`/${locale}${path}`, baseUrl);
    if (campaign) for (const [key, value] of [["utm_source", "newsletter"], ["utm_medium", "email"], ["utm_campaign", campaign]]) url.searchParams.set(key, value);
    return url.toString();
  };
  return { radar: site(""), news: site("/noticias"), models: site("/modelos"), experiments: site("/experimentos"), voices: site("/vozes") };
}
export const confirmUrl = (baseUrl: string, locale: Locale, token: string) => `${new URL(`/${locale}/newsletter/confirmar`, baseUrl)}?token=${token}`;
export function unsubscribeUrls(baseUrl: string, locale: Locale, token: string) {
  return { page: `${new URL(`/${locale}/newsletter/cancelar`, baseUrl)}?token=${token}`, oneClick: `${new URL("/api/newsletter/unsubscribe", baseUrl)}?token=${token}&locale=${locale}` };
}

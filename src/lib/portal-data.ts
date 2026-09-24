import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { feedSources, parseFeed } from "./feed-parser";
import { liveBenchMetadata, newestUnique, parseAnthropicNews, parseExperiments, parseLiveBench } from "./portal-parsers";
import { socialProfiles, type Collection, type Experiment, type Leaderboard, type PortalArticle, type SocialPost, type SourceState } from "./portal-types";
import socialSelection from "@/data/social-post-selection.json";
import { parseSocialEmbed, selectedSocialPosts } from "./social-posts";
import { databaseConfigured, getDb } from "./db";
import { SocialSearchStore } from "./social-search-store";
import { ARTIFICIAL_ANALYSIS_URL, parseArtificialAnalysisApi, parseArtificialAnalysisPage } from "./artificial-analysis";

const LIVEBENCH_RAW = "https://raw.githubusercontent.com/LiveBench/new-livebench/main";
const UA = "EmadaAcademy/2.0 (+https://emada.academy; source reader)";

async function readRemote(url: string, revalidate: number, headers: Record<string, string> = {}, maxBytes = 2_000_000) {
  const response = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: AbortSignal.timeout(12_000), next: { revalidate } });
  if (!response.ok) throw new Error(`Fonte respondeu HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Resposta vazia.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new Error("Resposta acima do limite."); }
    chunks.push(value);
  }
  const date = new Date(response.headers.get("date") ?? "");
  return { text: Buffer.concat(chunks).toString("utf8"), fetchedAt: Number.isFinite(date.getTime()) ? date.toISOString() : null };
}

const sourceState = (name: string, url: string, status: SourceState["status"], fetchedAt: string | null = null): SourceState => ({ name, url, status, fetchedAt });

export const getLiveBench = cache(async (): Promise<Leaderboard> => {
  const base: Leaderboard = { id: "livebench", name: "LiveBench", url: "https://livebench.ai/", release: null, fetchedAt: null, status: "unavailable", metrics: [], models: [] };
  try {
    const constants = await readRemote(`${LIVEBENCH_RAW}/src/lib/constants.js`, 21_600);
    const releases = constants.text.match(/export const RELEASES\s*=\s*\[([\s\S]*?)\]/)?.[1].match(/\d{4}-\d{2}-\d{2}/g);
    const release = releases?.sort().at(-1);
    if (!release) throw new Error("Versão do benchmark indisponível.");
    const suffix = release.replaceAll("-", "_");
    const [table, categories, metadata, cost] = await Promise.all([
      readRemote(`${LIVEBENCH_RAW}/public/table_${suffix}.csv`, 21_600),
      readRemote(`${LIVEBENCH_RAW}/public/categories_${suffix}.json`, 21_600),
      readRemote(`${LIVEBENCH_RAW}/src/Table/modelLinks.js`, 21_600),
      readRemote(`${LIVEBENCH_RAW}/public/cost_${suffix}.csv`, 21_600).catch(() => null),
    ]);
    const parsed = parseLiveBench(table.text, JSON.parse(categories.text), liveBenchMetadata(metadata.text), cost?.text);
    return { ...base, ...parsed, release, fetchedAt: table.fetchedAt, status: "ok" };
  } catch { return base; }
});

// Cache Components are not enabled in this app. Cache the parsed result because
// the public HTML exceeds Next's 2 MB fetch-cache limit; never cache that raw page.
const getPublicArtificialAnalysis = unstable_cache(async () => {
  const response = await readRemote(ARTIFICIAL_ANALYSIS_URL, 0, {}, 5_000_000);
  return { ...parseArtificialAnalysisPage(response.text), fetchedAt: response.fetchedAt };
}, ["artificial-analysis-public-v2", ARTIFICIAL_ANALYSIS_URL], { revalidate: 21_600 });

export const getArtificialAnalysis = cache(async (): Promise<Leaderboard> => {
  const token = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
  const base: Leaderboard = { id: "artificial-analysis", name: "Artificial Analysis", url: ARTIFICIAL_ANALYSIS_URL, release: null, fetchedAt: null, status: "unavailable", models: [], metrics: [] };
  if (token) {
    try {
      const response = await readRemote("https://artificialanalysis.ai/api/v2/data/llms/models", 21_600, { "x-api-key": token });
      return { ...base, ...parseArtificialAnalysisApi(JSON.parse(response.text)), fetchedAt: response.fetchedAt, status: "ok" };
    } catch { /* Fall back to the public leaderboard if the API is unavailable. */ }
  }
  try {
    return { ...base, ...await getPublicArtificialAnalysis(), status: "ok" };
  } catch { return base; }
});

export const getPortalNews = cache(async (): Promise<Collection<PortalArticle>> => {
  const sources = [...feedSources.map(source => ({ name: source.name, url: source.url })), { name: "Anthropic", url: "https://www.anthropic.com/news" }];
  const results = await Promise.allSettled([
    ...feedSources.map(async source => {
      const response = await readRemote(source.url, 900);
      const items = await parseFeed(response.text, source);
      return { items: items.map(item => ({ id: item.url, title: item.title, summary: item.summary, url: item.url, source: item.source, category: item.category, publishedAt: item.published_at })), fetchedAt: response.fetchedAt };
    }),
    (async () => {
      const response = await readRemote("https://www.anthropic.com/news", 1800);
      return { items: parseAnthropicNews(response.text), fetchedAt: response.fetchedAt };
    })(),
  ]);
  return {
    items: newestUnique(results.flatMap<PortalArticle>(result => result.status === "fulfilled" ? result.value.items : [])).slice(0, 100),
    sources: results.map((result, index) => sourceState(sources[index].name, sources[index].url, result.status === "fulfilled" ? "ok" : "unavailable", result.status === "fulfilled" ? result.value.fetchedAt : null)),
  };
});

export const getExperiments = cache(async (): Promise<Collection<Experiment>> => {
  const queries = ["LLM benchmark", "LLM game", "tested Claude", "model evaluation", "AI benchmark"];
  // Day-level cutoff keeps cache keys stable across requests; the parser enforces 30 days.
  const cutoff = Math.floor(Date.now() / 86_400_000) * 86_400 - 30 * 86_400;
  const results = await Promise.allSettled(queries.map(async query => {
    const params = new URLSearchParams({ query, tags: "story", hitsPerPage: "30", numericFilters: `created_at_i>${cutoff}`, restrictSearchableAttributes: "title" });
    const response = await readRemote(`https://hn.algolia.com/api/v1/search_by_date?${params}`, 1800);
    return { items: parseExperiments(JSON.parse(response.text)), fetchedAt: response.fetchedAt };
  }));
  return {
    items: newestUnique(results.flatMap(result => result.status === "fulfilled" ? result.value.items : [])).slice(0, 60),
    sources: results.map((result, index) => sourceState(`HN · ${queries[index]}`, `https://hn.algolia.com/?query=${encodeURIComponent(queries[index])}&sort=byDate&type=story`, result.status === "fulfilled" ? "ok" : "unavailable", result.status === "fulfilled" ? result.value.fetchedAt : null)),
  };
});

export const getSocialPosts = cache(async (): Promise<Collection<SocialPost>> => {
  const token = process.env.X_API_BEARER_TOKEN;
  if (databaseConfigured()) {
    try {
      const saved = await new SocialSearchStore(getDb()).read();
      if (token || saved.items.length) return saved;
    } catch { /* Keep the page available if storage is temporarily unavailable. */ }
  }
  if (token) return { items: [], sources: socialProfiles.map(profile => sourceState(profile.name, `https://x.com/${profile.username}`, "unavailable")) };
  // A dated public selection is only used when automatic collection is unconfigured.
  const results = await Promise.all(socialProfiles.map(async profile => {
    const profileUrl = `https://x.com/${profile.username}`;
    const references = selectedSocialPosts(socialSelection, profile);
    if (!references.length) return { items: [], source: sourceState(profile.name, profileUrl, token ? "unavailable" : "unconfigured") };
    const embeds = await Promise.allSettled(references.map(async reference => {
      const params = new URLSearchParams({ url: reference.url, omit_script: "true", dnt: "true" });
      const response = await readRemote(`https://publish.twitter.com/oembed?${params}`, 3600);
      return { post: parseSocialEmbed(JSON.parse(response.text), reference, profile), fetchedAt: response.fetchedAt };
    }));
    const available = embeds.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    const fetchedAt = available.flatMap(result => result.fetchedAt ? [result.fetchedAt] : []).sort().at(-1) ?? null;
    return {
      items: available.map(result => result.post),
      source: { ...sourceState(profile.name, profileUrl, available.length ? "ok" : "unavailable", fetchedAt), collectedAt: references[0].collectedAt },
    };
  }));
  return { items: newestUnique(results.flatMap(result => result.items)), sources: results.map(result => result.source) };
});

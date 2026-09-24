import { mkdir, writeFile } from "node:fs/promises";
import { getExperiments, getPortalNews, getSocialPosts } from "../src/lib/portal-data";
import { loadEnvConfig } from "@next/env";
import catalog from "../src/data/publication-translations.json";
loadEnvConfig(process.cwd());

async function main() {
  const [news, experiments, social] = await Promise.all([getPortalNews(), getExperiments(), getSocialPosts()]);
  const entries = [
    ...news.items.map(item => ({ kind: "news", id: item.id, url: item.url, original: item.title })),
    ...experiments.items.map(item => ({ kind: "experiment", id: item.id, url: item.url, original: item.title })),
    ...social.items.map(item => ({ kind: "social", id: item.id, url: item.url, original: item.text })),
  ];
  const translated = new Map(catalog.entries.map(entry => [`${entry.kind}:${entry.id}`, entry]));
  const pending = entries.filter(entry => {
    const saved = translated.get(`${entry.kind}:${entry.id}`);
    return !saved || saved.original !== entry.original || saved.url !== entry.url;
  });
  await mkdir(".local", { recursive: true });
  await writeFile(".local/translation-candidates.json", JSON.stringify({ collectedAt: new Date().toISOString(), entries: pending }, null, 2) + "\n");
  console.log(JSON.stringify({ news: news.items.length, experiments: experiments.items.length, posts: social.items.length, awaitingTranslation: pending.length, unavailableSources: [...news.sources, ...experiments.sources, ...social.sources].filter(s => s.status !== "ok").map(s => s.name), output: ".local/translation-candidates.json" }));
}
main().catch(() => { console.error("Unable to collect public translation candidates."); process.exitCode = 1; });

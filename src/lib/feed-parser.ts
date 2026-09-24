import Parser from "rss-parser";
export const feedSources = [
  { name: "OpenAI", url: "https://openai.com/news/rss.xml", hosts: ["openai.com"], category: "OpenAI" },
  { name: "Google AI", url: "https://blog.google/technology/ai/rss/", hosts: ["blog.google"], category: "Google" },
  { name: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", hosts: ["deepmind.google"], category: "Pesquisa" },
  { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", hosts: ["huggingface.co"], category: "Comunidade" },
];
export type NewsItem = { id: string; title: string; url: string; source: string; category: string; published_at: string; status: "pending" | "approved" | "rejected"; created_at?: string };
export function safeArticleUrl(raw: string, hosts: string[]) {
  try { const url = new URL(raw); if (url.protocol !== "https:" || url.username || url.password || !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    url.hash = ""; for (const key of [...url.searchParams.keys()]) if (key.startsWith("utm_")) url.searchParams.delete(key); return url.href;
  } catch { return null; }
}
export async function parseFeed(xml: string, source: typeof feedSources[number], now = new Date()) {
  if (xml.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Feed inválido.");
  const parsed = await new Parser().parseString(xml);
  const cutoff = now.getTime() - 1000 * 60 * 60 * 24 * 45;
  return parsed.items.slice(0, 50).flatMap(item => {
    const url = safeArticleUrl(item.link ?? "", source.hosts);
    const published = new Date(item.isoDate || item.pubDate || "");
    const title = (item.title || "").replace(/<[^>]*>/g, "").trim().slice(0, 300);
    if (!url || !title || !Number.isFinite(published.getTime()) || published.getTime() < cutoff || published.getTime() > now.getTime()) return [];
    const summary = String(item.contentSnippet || item.summary || item.content || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200);
    return [{ title, summary, url, source: source.name, category: source.category, published_at: published.toISOString() }];
  });
}

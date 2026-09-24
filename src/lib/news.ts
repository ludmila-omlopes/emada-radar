import "server-only";
import { databaseConfigured, getDb } from "./db";
import { feedSources, parseFeed, type NewsItem } from "./feed-parser";
export async function getNews(status: "approved" | "pending" | "rejected" = "approved"): Promise<NewsItem[]> {
  if (!databaseConfigured()) return [];
  const result = await getDb().query("SELECT id, title, url, source, category, published_at, status, created_at FROM news_items WHERE status = $1 ORDER BY published_at DESC LIMIT 100", [status]);
  return result.rows.map(row => ({ ...row, published_at: row.published_at.toISOString(), created_at: row.created_at.toISOString() }));
}
export async function collectNews() {
  const results = await Promise.allSettled(feedSources.map(async source => {
    const response = await fetch(source.url, { signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "EmadaAcademy/1.0 (RSS reader)" }, cache: "no-store" });
    if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error(`${source.name}: resposta vazia`);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 2_000_000) { await reader.cancel(); throw new Error(`${source.name}: limite do feed excedido`); } chunks.push(value); }
    const items = await parseFeed(Buffer.concat(chunks).toString("utf8"), source);
    let inserted = 0;
    for (const item of items) {
      const result = await getDb().query(`INSERT INTO news_items (title, url, source, category, published_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (url) DO NOTHING`, [item.title, item.url, item.source, item.category, item.published_at]);
      inserted += result.rowCount ?? 0;
    }
    return { source: source.name, inserted };
  }));
  const details = results.map((result, i) => result.status === "fulfilled" ? { ...result.value, ok: true } : { source: feedSources[i].name, inserted: 0, ok: false });
  await getDb().query("INSERT INTO news_sync_runs (details) VALUES ($1::jsonb)", [JSON.stringify(details)]);
  return { inserted: details.reduce((sum, result) => sum + result.inserted, 0), sources: details, ok: details.some(result => result.ok) };
}

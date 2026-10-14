import { classifyNews } from "@/lib/classified-news";
import { localizeContent } from "@/lib/localized-content";
import { getPortalNews } from "@/lib/portal-data";
import { currentTime, radarHighlights } from "@/lib/radar-insights";

// Public, read-only list read by emada.space. Titles follow the default locale (pt-BR).
// The CDN keeps each response for an hour and serves the last one while refreshing.
export async function GET() {
  const news = await getPortalNews().then(classifyNews).then(localizeContent);
  return Response.json({ items: radarHighlights(news.items, currentTime()) }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}

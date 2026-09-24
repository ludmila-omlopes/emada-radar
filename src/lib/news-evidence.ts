import { plainText } from "./portal-parsers";
const hosts = new Set(["openai.com", "www.openai.com", "blog.google", "deepmind.google", "www.anthropic.com", "anthropic.com", "huggingface.co"]);
function allowed(raw: string) {
  try { const url = new URL(raw); return url.protocol === "https:" && !url.username && !url.password && !url.port && hosts.has(url.hostname); }
  catch { return false; }
}
export function pageDescription(html: string) {
  const head = html.split(/<\/head\s*>/i)[0].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const descriptions = new Map<string, string>();
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = new Map([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1].toLowerCase(), match[2] ?? match[3]]));
    const name = (attrs.get("property") ?? attrs.get("name") ?? "").toLowerCase();
    const text = attrs.get("content");
    if (text && ["og:description", "description", "twitter:description"].includes(name)) descriptions.set(name, plainText(text));
  }
  let result = descriptions.get("og:description") ?? descriptions.get("description") ?? descriptions.get("twitter:description") ?? "";
  while (Buffer.byteLength(result) > 600) result = result.slice(0, -1);
  return result;
}
export async function readNewsDescription(url: string | undefined, fetcher: typeof fetch = fetch): Promise<string> {
  if (!url || !allowed(url)) return "";
  const signal = AbortSignal.timeout(5000);
  try {
    for (let redirects = 0; redirects < 3; redirects++) {
      if (!allowed(url)) return "";
      const response: Response = await fetcher(url, { redirect: "manual", cache: "no-store", signal, headers: { "User-Agent": "EmadaAcademy/2.0 (news metadata reader)" } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location: string | null = response.headers.get("location"); await response.body?.cancel();
        if (!location) return "";
        url = new URL(location, url).href; continue;
      }
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) { await response.body?.cancel(); return ""; }
      const reader = response.body?.getReader(); if (!reader) return "";
      const decoder = new TextDecoder(); let html = ""; let size = 0;
      try {
        while (size < 500_000) {
          const chunk = await reader.read(); if (chunk.done) break;
          size += chunk.value.byteLength; if (size > 500_000) break;
          html += decoder.decode(chunk.value, { stream: true });
          if (/<\/head\s*>/i.test(html)) break;
        }
      } finally { await reader.cancel(); }
      return pageDescription(html);
    }
  } catch { /* Optional metadata. Failures leave the source headline and RSS evidence intact. */ }
  return "";
}

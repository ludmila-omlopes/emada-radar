import { z } from "zod";
import type { SocialPost, SocialProfile } from "./portal-types";

const selectionSchema = z.object({
  collectedAt: z.string().datetime(),
  posts: z.array(z.object({ username: z.string().regex(/^\w{1,15}$/), id: z.string().regex(/^\d{1,20}$/), publishedAt: z.string().datetime() })),
});

export type SocialReference = { id: string; url: string; publishedAt: string; collectedAt: string };

// A one-time collection must never silently become a permanently "latest" feed.
export function selectedSocialPosts(raw: unknown, profile: SocialProfile, now = new Date()): SocialReference[] {
  const selection = selectionSchema.parse(raw);
  const collected = Date.parse(selection.collectedAt);
  if (collected > now.getTime() || now.getTime() - collected > 7 * 86_400_000) return [];
  const posts = selection.posts.filter(post => post.username.toLowerCase() === profile.username.toLowerCase() && Date.parse(post.publishedAt) <= collected && Date.parse(post.publishedAt) >= now.getTime() - 30 * 86_400_000);
  return [...new Map(posts.map(post => [post.id, post])).values()]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 5)
    .map(post => ({ id: post.id, url: `https://x.com/${profile.username}/status/${post.id}`, publishedAt: post.publishedAt, collectedAt: selection.collectedAt }));
}

function xPath(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !["x.com", "twitter.com", "www.x.com", "www.twitter.com"].includes(url.hostname)) return null;
    return url.pathname.replace(/\/$/, "").toLowerCase();
  } catch { return null; }
}

function embedText(html: string) {
  const safe = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const block = safe.match(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i)?.[1];
  const paragraph = block?.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  if (!paragraph) throw new Error("Post sem texto disponível.");
  const entities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", hellip: "…", mdash: "—", ndash: "–" };
  return paragraph.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/?a\b[^>]*>/gi, " ").replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (!code.startsWith("#")) return entities[code.toLowerCase()] ?? entity;
      const point = code.slice(0, 2).toLowerCase() === "#x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : "�";
    }).replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
}

const embedSchema = z.object({ url: z.string(), author_url: z.string(), html: z.string().max(200_000), type: z.literal("rich") });
export function parseSocialEmbed(raw: unknown, reference: SocialReference, profile: SocialProfile): SocialPost {
  const embed = embedSchema.parse(raw);
  const expectedPath = `/${profile.username}/status/${reference.id}`.toLowerCase();
  if (xPath(reference.url) !== expectedPath || xPath(embed.url) !== expectedPath || xPath(embed.author_url) !== `/${profile.username}`.toLowerCase()) throw new Error("Autor ou post diferente do solicitado.");
  const text = embedText(embed.html);
  if (!text) throw new Error("Post sem texto disponível.");
  // Only text is returned. Remote HTML and scripts are never rendered or executed.
  return { id: reference.id, url: reference.url, publishedAt: reference.publishedAt, profile, text, collectedAt: reference.collectedAt };
}

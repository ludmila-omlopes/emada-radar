import { createHash } from "node:crypto";
import { z } from "zod";
import { socialProfiles } from "./portal-types";

// Filtering happens at X, before posts are returned and billed.
export const SOCIAL_QUERY = `(${socialProfiles.map(p => `from:${p.username}`).join(" OR ")}) (AI OR LLM OR Claude OR GPT OR ChatGPT OR Gemini OR Codex OR "language model" OR benchmark OR inference OR "open weights" OR agents OR Anthropic OR OpenAI) -is:retweet -is:reply`;
export const SOCIAL_QUERY_KEY = createHash("sha256").update(SOCIAL_QUERY).digest("hex");
export const SOCIAL_PAGE_SIZE = 10;
const DAY = 86_400_000;
export type SearchCursor = {
  queryKey?: string;
  sinceId?: string;
  completedAt?: string;
  window?: { start?: string; sinceId?: string; end: string; nextToken?: string; newestId?: string };
};

// Slots line up with the cron at 09:00 and 21:00 UTC, including manual invocations.
export const socialSlot = (now: Date) => Math.floor((now.getTime() - 9 * 3_600_000) / (12 * 3_600_000));
export function prepareSearch(previous: SearchCursor, now: Date) {
  let cursor = previous.queryKey === SOCIAL_QUERY_KEY ? { ...previous } : { queryKey: SOCIAL_QUERY_KEY };
  const oldestCovered = cursor.window?.start ?? cursor.completedAt ?? cursor.window?.end;
  const expired = Boolean(cursor.window && oldestCovered && new Date(oldestCovered).getTime() < now.getTime() - (7 * DAY - 3_600_000));
  if (expired) cursor = { queryKey: SOCIAL_QUERY_KEY };
  if (!cursor.window) {
    const end = new Date(now.getTime() - 60_000).toISOString();
    // Recent search only covers seven days. An old since_id must not hide that limit.
    const recent = cursor.completedAt && new Date(cursor.completedAt).getTime() > now.getTime() - 6 * DAY;
    cursor.window = recent && cursor.sinceId
      ? { sinceId: cursor.sinceId, end }
      : { start: recent ? cursor.completedAt : new Date(now.getTime() - (expired || cursor.completedAt ? 6 : 1) * DAY).toISOString(), end };
  }
  const window = cursor.window;
  const params = new URLSearchParams({ query: SOCIAL_QUERY, max_results: String(SOCIAL_PAGE_SIZE), sort_order: "recency", "tweet.fields": "author_id,created_at,note_tweet", end_time: window.end });
  if (window.sinceId) params.set("since_id", window.sinceId);
  else if (window.start) params.set("start_time", window.start);
  if (window.nextToken) params.set("next_token", window.nextToken);
  return { cursor, params, expired };
}

const id = z.string().regex(/^\d+$/);
export const searchResponse = z.object({
  data: z.array(z.object({ id, author_id: id, text: z.string(), created_at: z.string().datetime(), note_tweet: z.object({ text: z.string() }).optional(), note_post: z.object({ text: z.string() }).optional() })).max(SOCIAL_PAGE_SIZE).optional(),
  meta: z.object({ next_token: z.string().optional(), newest_id: id.optional(), result_count: z.number().int().nonnegative() }),
  errors: z.array(z.unknown()).optional(),
});
export const usersResponse = z.object({ data: z.array(z.object({ id, username: z.string() })).optional(), errors: z.array(z.unknown()).optional() });
export function advanceSearch(cursor: SearchCursor, response: z.infer<typeof searchResponse>): SearchCursor {
  if (!cursor.window) throw new Error("missing_window");
  const ids = [cursor.window.newestId, response.meta.newest_id, ...(response.data ?? []).map(p => p.id)].filter((id): id is string => Boolean(id));
  const newestId = ids.reduce<string | undefined>((a, b) => !a || BigInt(b) > BigInt(a) ? b : a, undefined);
  if (response.meta.next_token) return { ...cursor, window: { ...cursor.window, nextToken: response.meta.next_token, newestId } };
  return { queryKey: SOCIAL_QUERY_KEY, sinceId: newestId ?? cursor.sinceId, completedAt: cursor.window.end };
}

export class SocialApiError extends Error {}
export async function readX(path: string, token: string): Promise<unknown> {
  const response = await fetch(`https://api.x.com/2/${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new SocialApiError(`x_http_${response.status}`);
  return response.json();
}

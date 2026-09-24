import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { advanceSearch, prepareSearch, readX, searchResponse, SOCIAL_QUERY_KEY, SocialApiError, socialSlot, usersResponse, type SearchCursor } from "./social-search";
import { socialProfiles, type Collection, type SocialPost } from "./portal-types";

type State = { cursor: SearchCursor; accounts: Record<string, string>; last_success_at: Date | null; last_error: string | null };
export class SocialSearchStore {
  constructor(private readonly db: Pool, private readonly request = readX) {}

  async collect(token: string, now = new Date()) {
    const slot = socialSlot(now);
    const lease = randomUUID();
    const client = await this.db.connect();
    let state: State;
    let prepared: ReturnType<typeof prepareSearch>;
    try {
      await client.query("BEGIN");
      const locked = await client.query<State & { busy: boolean }>("SELECT *, lease_until > $1 AS busy FROM social_search_state WHERE id = 1 FOR UPDATE", [now]);
      if (!locked.rows[0]) throw new Error("social_migration_required");
      state = locked.rows[0];
      const claimed = locked.rows[0].busy ? null : await client.query("INSERT INTO social_search_runs (slot, started_at, status) VALUES ($1, $2, 'running') ON CONFLICT DO NOTHING RETURNING slot", [slot, now]);
      if (!claimed?.rowCount) { await client.query("COMMIT"); return { ok: true, skipped: true, posts: 0 }; }
      prepared = prepareSearch(state.cursor, now);
      await client.query("UPDATE social_search_state SET cursor=$1, lease_id=$2, lease_until=$3 WHERE id=1", [JSON.stringify(prepared.cursor), lease, new Date(now.getTime() + 120_000)]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }

    try {
      // Resolve only missing handles; no daily user-expansion charges.
      const missing = socialProfiles.filter(p => !state.accounts[p.username.toLowerCase()]);
      if (missing.length) {
        const params = new URLSearchParams({ usernames: missing.map(p => p.username).join(",") });
        const users = usersResponse.parse(await this.request(`users/by?${params}`, token));
        for (const user of users.data ?? []) {
          if (missing.some(p => p.username.toLowerCase() === user.username.toLowerCase())) state.accounts[user.username.toLowerCase()] = user.id;
        }
        await this.db.query("UPDATE social_search_state SET accounts=$1 WHERE id=1 AND lease_id=$2", [JSON.stringify(state.accounts), lease]);
        if (missing.some(p => !state.accounts[p.username.toLowerCase()])) throw new Error("x_users_incomplete");
      }
      // One page per slot: max 20 posts/day across all profiles, with no automatic retries.
      const result = searchResponse.parse(await this.request(`tweets/search/recent?${prepared.params}`, token));
      if (result.errors?.length) throw new Error("x_partial_response");
      const posts = (result.data ?? []).map(post => {
        const profile = socialProfiles.find(p => state.accounts[p.username.toLowerCase()] === post.author_id);
        if (!profile) throw new Error("x_unknown_author");
        return { ...post, username: profile.username, text: post.note_tweet?.text ?? post.note_post?.text ?? post.text };
      });
      const finish = await this.db.connect();
      try {
        await finish.query("BEGIN");
        const owned = await finish.query("SELECT id FROM social_search_state WHERE id=1 AND lease_id=$1 FOR UPDATE", [lease]);
        if (!owned.rowCount) throw new Error("social_lease_lost");
        for (const post of posts) await finish.query("INSERT INTO social_search_posts (id, username, body, published_at, query_key, fetched_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET body=EXCLUDED.body, query_key=EXCLUDED.query_key, fetched_at=EXCLUDED.fetched_at", [post.id, post.username, post.text, post.created_at, SOCIAL_QUERY_KEY, now]);
        await finish.query("UPDATE social_search_state SET cursor=$1, last_success_at=$2, last_error=NULL, lease_id=NULL, lease_until=NULL WHERE id=1", [JSON.stringify(advanceSearch(prepared.cursor, result)), now]);
        await finish.query("UPDATE social_search_runs SET status='done', finished_at=$1, post_count=$2, error_code=$3 WHERE slot=$4", [now, posts.length, prepared.expired ? "recent_window_expired" : null, slot]);
        await finish.query("DELETE FROM social_search_posts WHERE published_at < $1", [new Date(now.getTime() - 30 * 86_400_000)]);
        await finish.query("COMMIT");
      } catch (error) { await finish.query("ROLLBACK"); throw error; }
      finally { finish.release(); }
      return { ok: true, skipped: false, posts: posts.length, pending: Boolean(result.meta.next_token), windowExpired: prepared.expired };
    } catch (error) {
      const code = error instanceof SocialApiError ? error.message : "x_collection_failed";
      await this.db.query("UPDATE social_search_state SET last_error=$1, lease_id=NULL, lease_until=NULL WHERE id=1 AND lease_id=$2", [code, lease]);
      await this.db.query("UPDATE social_search_runs SET status='failed', finished_at=$1, error_code=$2 WHERE slot=$3", [now, code, slot]);
      return { ok: false, skipped: false, posts: 0, error: code };
    }
  }

  async read(now = new Date()): Promise<Collection<SocialPost>> {
    const [saved, states] = await Promise.all([
      this.db.query<{ id: string; username: string; body: string; published_at: Date }>("SELECT id, username, body, published_at FROM social_search_posts WHERE query_key=$1 AND published_at >= $2 ORDER BY published_at DESC LIMIT 60", [SOCIAL_QUERY_KEY, new Date(now.getTime() - 30 * 86_400_000)]),
      this.db.query<State>("SELECT cursor, accounts, last_success_at, last_error FROM social_search_state WHERE id=1"),
    ]);
    const state = states.rows[0];
    const healthy = state?.cursor.queryKey === SOCIAL_QUERY_KEY && state.last_success_at && !state.last_error && now.getTime() - state.last_success_at.getTime() < 26 * 3_600_000;
    return {
      items: saved.rows.flatMap(post => {
        const profile = socialProfiles.find(p => p.username.toLowerCase() === post.username.toLowerCase());
        return profile ? [{ id: post.id, text: post.body, publishedAt: post.published_at.toISOString(), profile, url: `https://x.com/${profile.username}/status/${post.id}` }] : [];
      }),
      sources: socialProfiles.map(p => ({ name: p.name, url: `https://x.com/${p.username}`, status: healthy ? "ok" : "unavailable", fetchedAt: state?.last_success_at?.toISOString() ?? null })),
    };
  }
}

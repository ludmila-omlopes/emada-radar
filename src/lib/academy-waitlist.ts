import type { Pool } from "pg";
import type { Locale } from "@/i18n/config";

export const WAITLIST_SOURCES = ["modulos", "aprender", "progresso"] as const;
export const WAITLIST_JOINS_PER_HOUR = 200;
const HOUR = 3_600_000;

export type WaitlistEntry = { email: string; locale: Locale; source: string; created_at: Date };

export class AcademyWaitlist {
  constructor(private readonly db: Pool) {}

  // Repeated addresses keep their first entry; the form answers the same either way.
  async join(input: { email: string; locale: Locale; source: string; userId?: string | null }, now = new Date()): Promise<"joined" | "busy"> {
    const recent = await this.db.query<{ count: string }>("SELECT count(*) AS count FROM academy_waitlist WHERE created_at > $1", [new Date(now.getTime() - HOUR)]);
    if (Number(recent.rows[0].count) >= WAITLIST_JOINS_PER_HOUR) return "busy";
    await this.db.query("INSERT INTO academy_waitlist (email, locale, source, user_id, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING", [input.email, input.locale, input.source, input.userId ?? null, now]);
    return "joined";
  }

  async list(limit = 500) {
    const [entries, total] = await Promise.all([
      this.db.query<WaitlistEntry>("SELECT email, locale, source, created_at FROM academy_waitlist ORDER BY created_at DESC LIMIT $1", [limit]),
      this.db.query<{ count: string }>("SELECT count(*) AS count FROM academy_waitlist"),
    ]);
    return { total: Number(total.rows[0].count), entries: entries.rows };
  }
}

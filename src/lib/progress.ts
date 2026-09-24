import "server-only";
import { cache } from "react";
import { getDb } from "./db";
import { getSession } from "./session";
export type ProgressRecord = { lesson_slug: string; answer: string; checked: number[]; choice: number; completed_at: string; updated_at: string };
export const getProgress = cache(async (): Promise<ProgressRecord[]> => {
  const session = await getSession();
  if (!session) return [];
  const result = await getDb().query("SELECT lesson_slug, answer, checked, choice, completed_at, updated_at FROM lesson_progress WHERE user_id = $1 ORDER BY updated_at DESC", [session.user.id]);
  return result.rows.map(row => ({ ...row, completed_at: row.completed_at.toISOString(), updated_at: row.updated_at.toISOString() }));
});

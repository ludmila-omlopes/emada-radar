import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, getAuth } from "./auth";
import { getDb } from "./db";

export const getSession = cache(async () => {
  if (!authConfigured()) return null;
  return getAuth().api.getSession({ headers: await headers() });
});
export const isAdmin = cache(async () => {
  const session = await getSession();
  if (!session) return false;
  const result = await getDb().query("SELECT 1 FROM admin_users WHERE user_id = $1", [session.user.id]);
  return result.rowCount === 1;
});
export async function requireSession(next = "/progresso") {
  const session = await getSession();
  if (!session) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return session;
}
export async function requireAdmin(next = "/admin") {
  await requireSession(next);
  if (!await isAdmin()) redirect("/?aviso=acesso-restrito");
}

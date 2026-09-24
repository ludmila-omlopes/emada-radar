"use server";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
export async function acceptAdminInvite(token: string) {
  const session = await getSession();
  if (!session || !/^[a-f0-9]{64}$/.test(token)) return { error: "Entre na conta vinculada ao convite." };
  const db = await getDb().connect(); let error = "";
  try {
    await db.query("BEGIN");
    const invite = await db.query("UPDATE admin_invites SET used_at = now() WHERE token_hash = $1 AND lower(email) = lower($2) AND used_at IS NULL AND expires_at > now() RETURNING email", [createHash("sha256").update(token).digest("hex"), session.user.email]);
    if (!invite.rowCount) { await db.query("ROLLBACK"); return { error: "Convite inválido, expirado ou vinculado a outro e-mail." }; }
    await db.query("INSERT INTO admin_users (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [session.user.id]);
    await db.query("COMMIT");
  } catch { await db.query("ROLLBACK"); error = "Não foi possível ativar o acesso. Tente novamente."; }
  finally { db.release(); }
  if (error) return { error };
  revalidatePath("/", "layout"); redirect("/admin");
}

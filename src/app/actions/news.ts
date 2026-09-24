"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/session";
import { collectNews } from "@/lib/news";
export async function moderateNews(id: string, status: string) {
  const session = await getSession();
  if (!session || !await isAdmin()) return { ok: false, message: "Acesso restrito à administração." };
  const parsed = z.object({ id: z.uuid(), status: z.enum(["approved", "rejected", "pending"]) }).safeParse({ id, status });
  if (!parsed.success) return { ok: false, message: "Notícia ou ação inválida." };
  try {
    const result = await getDb().query("UPDATE news_items SET status = $1, reviewed_by = $2, reviewed_at = now() WHERE id = $3 RETURNING id", [parsed.data.status, session.user.id, parsed.data.id]);
    if (!result.rowCount) return { ok: false, message: "Notícia não encontrada." };
    revalidatePath("/", "layout"); return { ok: true, message: "Notícia atualizada." };
  } catch { return { ok: false, message: "Não foi possível atualizar a notícia." }; }
}
export async function syncNews() {
  if (!await isAdmin()) return { ok: false, message: "Acesso restrito à administração." };
  try { const result = await collectNews(); revalidatePath("/admin"); return { ok: result.ok, message: result.ok ? `${result.inserted} nova(s) notícia(s) na fila.${result.sources.some(s => !s.ok) ? " Uma fonte não respondeu; tente mais tarde." : ""}` : "As fontes não responderam. Tente novamente mais tarde." }; }
  catch { return { ok: false, message: "Não foi possível coletar as notícias." }; }
}

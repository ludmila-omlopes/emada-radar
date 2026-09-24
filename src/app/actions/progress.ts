"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { validateSubmission } from "@/lib/validation";

export async function saveLesson(input: unknown) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Entre na sua conta para salvar o progresso." };
  const validation = validateSubmission(input);
  if (!validation.ok) return validation;
  const { lessonSlug, answer, checked, choice } = validation.data;
  try {
    await getDb().query(`INSERT INTO lesson_progress (user_id, lesson_slug, answer, checked, choice)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      ON CONFLICT (user_id, lesson_slug) DO UPDATE SET answer = EXCLUDED.answer, checked = EXCLUDED.checked, choice = EXCLUDED.choice, updated_at = now()`,
      [session.user.id, lessonSlug, answer, JSON.stringify(checked), choice]);
    revalidatePath("/", "layout");
    return { ok: true, error: "" };
  } catch { return { ok: false, error: "Não foi possível salvar. Seu texto continua aqui; tente novamente." }; }
}

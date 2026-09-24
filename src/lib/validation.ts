import { z } from "zod";
import { findLesson } from "./curriculum";

export const submissionSchema = z.object({
  lessonSlug: z.string().max(100), answer: z.string().trim().min(30, "Escreva pelo menos 30 caracteres para registrar seu exercício.").max(12000),
  checked: z.array(z.number().int().min(0)).max(10), choice: z.number().int().min(0).max(10),
});
export function validateSubmission(input: unknown) {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const data = parsed.data;
  const { lesson } = findLesson(data.lessonSlug);
  if (!lesson) return { ok: false as const, error: "Capítulo não encontrado." };
  if (!lesson.steps.every((_, i) => data.checked.includes(i))) return { ok: false as const, error: "Conclua e marque todas as etapas do exercício." };
  if (data.choice !== lesson.quiz.answer) return { ok: false as const, error: "Revise a pergunta antes de concluir o capítulo." };
  return { ok: true as const, data };
}
export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20\x7f]/.test(value)) return "/progresso";
  return value;
}

import { ContentError } from "./lesson-editor";
import { trustedPracticeOrigin } from "./practice-policy";
import type { LessonContentStore } from "./lesson-content-store";

type Dependencies = { admin: () => Promise<{ id: string } | null>; store: () => Pick<LessonContentStore, "read" | "write">; siteUrl?: string; published?: () => void };
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
export function lessonContentHandlers(deps: Dependencies) {
  async function handle(request: Request, post: boolean) {
    try {
      if (post && !trustedPracticeOrigin(request, deps.siteUrl)) return reply({ error: "Origem inválida." }, 403);
      const admin = await deps.admin();
      if (!admin) return reply({ error: "Acesso restrito à administração. Entre com sua conta autorizada." }, 403);
      if (!post) return reply({ state: await deps.store().read(new URL(request.url).searchParams.get("lesson") ?? "") });
      if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ContentError("Formato inválido.", 415);
      const reader = request.body?.getReader();
      if (!reader) throw new ContentError("Pedido vazio.");
      const chunks: Uint8Array[] = []; let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.length;
          if (size > 400_000) { await reader.cancel(); throw new ContentError("O conteúdo excedeu o limite de tamanho.", 413); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const merged = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
      let input: unknown;
      try { input = JSON.parse(new TextDecoder().decode(merged)); } catch { throw new ContentError("Pedido inválido."); }
      const state = await deps.store().write(admin.id, input);
      if ((input as { operation: string }).operation === "publish") deps.published?.();
      return reply({ state });
    } catch (error) {
      if (error instanceof ContentError) return reply({ error: error.message }, error.status);
      console.error("lesson_content_unavailable");
      return reply({ error: "Não foi possível confirmar o salvamento. Seus textos continuam no editor. Recarregue a versão salva antes de tentar novamente." }, 503);
    }
  }
  return { GET: (request: Request) => handle(request, false), POST: (request: Request) => handle(request, true) };
}

import { PracticeError, practiceInput, trustedPracticeOrigin } from "./practice-policy";
import type { PracticeStore } from "./practice-store";

type Dependencies = { user: () => Promise<{ id: string } | null>; store: () => Pick<PracticeStore, "state" | "execute">; siteUrl?: string };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
async function readLimitedJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new PracticeError("content_type", "Envie uma mensagem em formato válido.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new PracticeError("body", "Mensagem vazia.");
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.length;
      if (bytes > 12_000) { await reader.cancel(); throw new PracticeError("size", "A mensagem é muito grande.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const merged = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(merged)); } catch { throw new PracticeError("json", "Mensagem inválida."); }
}
export function practiceHandlers(deps: Dependencies) {
  async function handle(request: Request, post: boolean) {
    try {
      if (post && !trustedPracticeOrigin(request, deps.siteUrl)) return reply({ error: "Origem da solicitação inválida." }, 403);
      const user = await deps.user();
      if (!user) return reply({ error: "Entre na sua conta para usar o chat." }, 401);
      if (!post) {
        const slug = new URL(request.url).searchParams.get("lesson");
        if (!slug || slug.length > 100) throw new PracticeError("lesson", "Informe a aula.");
        return reply({ state: await deps.store().state(user.id, slug) });
      }
      const parsed = practiceInput.safeParse(await readLimitedJson(request));
      if (!parsed.success) throw new PracticeError("input", "Confira a mensagem e o limite de 1.500 caracteres.");
      return reply(await deps.store().execute(user.id, parsed.data));
    } catch (error) {
      if (error instanceof PracticeError) return reply({ error: error.message, code: error.code }, error.status);
      // Log no keys, prompts, connection strings or provider bodies.
      console.error("practice_chat_unavailable");
      return reply({ error: "O chat está temporariamente indisponível. Seu exercício escrito continua disponível." }, 503);
    }
  }
  return { GET: (request: Request) => handle(request, false), POST: (request: Request) => handle(request, true) };
}

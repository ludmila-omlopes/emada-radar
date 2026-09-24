import { z } from "zod";
import { PRACTICE_LIMITS, PRACTICE_MODEL, PracticeError, keyHasSafeLimit, type ChatMessage } from "./practice-policy";

// Only imported by server modules. Never expose this credential via props or NEXT_PUBLIC_.
export async function checkPracticeKey(key: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new PracticeError("provider_key", "O chat está temporariamente indisponível. O exercício escrito continua disponível.", 503);
  const schema = z.object({ data: z.object({ limit: z.number().nullable(), limit_reset: z.string().nullable(), limit_remaining: z.number().nullable(), is_management_key: z.boolean() }) });
  const result = schema.safeParse(await response.json());
  if (!result.success || !keyHasSafeLimit(result.data.data)) throw new PracticeError("unsafe_key", "O chat aguarda a configuração do limite de crédito pela administração.", 503);
  if (result.data.data.limit_remaining === null || result.data.data.limit_remaining < PRACTICE_LIMITS.requestCostMicro / 1_000_000) throw new PracticeError("provider_budget", "A cota compartilhada de IA está pausada. Você pode continuar o exercício escrito.", 429);
}

export async function callPracticeModel(key: string, messages: ChatMessage[], fetcher: typeof fetch = fetch) {
  const response = await fetcher("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-OpenRouter-Title": "Emada Academy" },
    body: JSON.stringify({ model: PRACTICE_MODEL, messages, stream: false, max_tokens: PRACTICE_LIMITS.maxOutputTokens,
      reasoning: { enabled: false }, temperature: 0.6,
      provider: { allow_fallbacks: false, require_parameters: true, data_collection: "deny", max_price: { prompt: 0.25, completion: 1, request: 0 } },
      usage: { include: true },
    }),
  });
  // Never surface provider error bodies: they may contain sensitive request context.
  if (!response.ok) throw new PracticeError("provider_error", "Não foi possível obter a resposta. Por segurança, esta tentativa conta no limite. Não houve reenvio automático.", 502);
  const schema = z.object({ id: z.string(), choices: z.array(z.object({ message: z.object({ content: z.string().min(1).max(12_000) }) })).min(1), usage: z.object({ prompt_tokens: z.number().int().nonnegative(), completion_tokens: z.number().int().nonnegative(), cost: z.number().nonnegative().optional() }).optional() });
  const result = schema.safeParse(await response.json());
  if (!result.success) throw new PracticeError("invalid_response", "A IA não devolveu uma resposta válida. Esta tentativa continua reservada no limite.", 502);
  return { reply: result.data.choices[0].message.content, generationId: result.data.id,
    promptTokens: result.data.usage?.prompt_tokens, completionTokens: result.data.usage?.completion_tokens,
    costMicro: result.data.usage?.cost === undefined ? undefined : Math.ceil(result.data.usage.cost * 1_000_000) };
}

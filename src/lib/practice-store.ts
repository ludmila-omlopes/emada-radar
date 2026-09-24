import type { Pool, PoolClient } from "pg";
import { allLessons, type Lesson } from "./curriculum";
import { PRACTICE_LIMITS as L, PracticeError, assertQuota, buildPracticeMessages, type PracticeInput, type PracticeState } from "./practice-policy";
import { callPracticeModel, checkPracticeKey } from "./openrouter";

type RequestRow = { id: string; conversation_id: string; lesson_slug: string; prompt: string; reply: string | null; status: "pending" | "done" | "failed"; token_charge: number; cost_charge_micro: string; created_at: Date; context_trimmed: boolean };
type Usage = { lesson_messages: number; day_messages: number; lesson_tokens: number; day_tokens: number; pending: boolean; cooldown: boolean };
const usageSql = `SELECT
  count(*) FILTER (WHERE lesson_slug = $2)::int AS lesson_messages,
  count(*) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::int AS day_messages,
  COALESCE(sum(token_charge) FILTER (WHERE lesson_slug = $2), 0)::int AS lesson_tokens,
  COALESCE(sum(token_charge) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'), 0)::int AS day_tokens,
  COALESCE(bool_or(status = 'pending' AND created_at > now() - interval '90 seconds'), false) AS pending,
  COALESCE(bool_or(created_at > now() - interval '5 seconds'), false) AS cooldown
  FROM practice_requests WHERE user_id = $1`;

export class PracticeStore {
  constructor(private pool: Pool, private settings: { enabled: boolean; key?: string }, private provider = { check: checkPracticeKey, call: callPracticeModel }, private publishedLesson?: (slug: string) => Promise<Lesson | undefined>) {}

  private lesson(slug: string) {
    const lesson = allLessons.find(item => item.slug === slug);
    if (!lesson) throw new PracticeError("lesson", "Aula não encontrada.", 404);
    return lesson;
  }
  private available() { return this.settings.enabled && Boolean(this.settings.key); }
  private async transaction<T>(userId: string, run: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '10000ms'");
      // Cross-instance, cross-tab lock. Never hold this while calling the provider.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`emada-practice:${userId}`]);
      const result = await run(client);
      await client.query("COMMIT"); return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async state(userId: string, slug: string): Promise<PracticeState> {
    this.lesson(slug);
    const remaining = { messagesLesson: L.messagesPerLesson, messagesDay: L.messagesPerDay, tokensLesson: L.tokensPerLesson, tokensDay: L.tokensPerDay, conversations: L.conversationsPerLesson };
    if (!this.available()) return { available: false, reason: "O chat integrado está em preparação. Você pode fazer a prática em outra ferramenta e registrar seu exercício abaixo.", conversations: [], remaining };
    const [conversations, turns, usage, budget] = await Promise.all([
      this.pool.query<{ id: string }>("SELECT id FROM practice_conversations WHERE user_id = $1 AND lesson_slug = $2 ORDER BY created_at, id", [userId, slug]),
      this.pool.query<RequestRow>("SELECT * FROM practice_requests WHERE user_id = $1 AND lesson_slug = $2 ORDER BY created_at, id", [userId, slug]),
      this.pool.query<Usage>(usageSql, [userId, slug]),
      this.pool.query<{ charged_micro: string }>("SELECT charged_micro FROM practice_budgets WHERE month = date_trunc('month', now() AT TIME ZONE 'UTC')::date"),
    ]);
    const u = usage.rows[0];
    const budgetAvailable = Number(budget.rows[0]?.charged_micro ?? 0) + L.requestCostMicro <= L.monthlyBudgetMicro;
    return { available: budgetAvailable, reason: budgetAvailable ? undefined : "A cota mensal compartilhada de IA terminou. O histórico e o exercício escrito continuam disponíveis.",
      conversations: conversations.rows.map(conversation => ({ id: conversation.id, turns: turns.rows.filter(turn => turn.conversation_id === conversation.id).map(turn => ({ id: turn.id, prompt: turn.prompt, reply: turn.reply, status: turn.status, createdAt: turn.created_at.toISOString(), contextTrimmed: turn.context_trimmed })) })),
      remaining: { messagesLesson: Math.max(0, L.messagesPerLesson - u.lesson_messages), messagesDay: Math.max(0, L.messagesPerDay - u.day_messages), tokensLesson: Math.max(0, L.tokensPerLesson - u.lesson_tokens), tokensDay: Math.max(0, L.tokensPerDay - u.day_tokens), conversations: Math.max(0, L.conversationsPerLesson - conversations.rows.length) },
    };
  }

  async execute(userId: string, input: PracticeInput) {
    const original = this.lesson(input.lessonSlug);
    const lesson = this.publishedLesson ? await this.publishedLesson(input.lessonSlug) ?? original : original;
    if (!this.available()) throw new PracticeError("disabled", "O chat integrado ainda não está disponível.", 503);
    if (input.operation === "start") {
      await this.transaction(userId, async client => {
        const existing = await client.query("SELECT id, user_id, lesson_slug FROM practice_conversations WHERE id = $1", [input.requestId]);
        if (existing.rows[0]) {
          if (existing.rows[0].user_id !== userId || existing.rows[0].lesson_slug !== input.lessonSlug) throw new PracticeError("conflict", "Identificador inválido.", 409);
          return;
        }
        const count = await client.query<{ count: number }>("SELECT count(*)::int FROM practice_conversations WHERE user_id = $1 AND lesson_slug = $2", [userId, input.lessonSlug]);
        if (count.rows[0].count >= L.conversationsPerLesson) throw new PracticeError("conversations_limit", "Você já abriu as duas conversas desta aula. Continue uma delas ou consulte o histórico.", 429);
        await client.query("INSERT INTO practice_conversations (id, user_id, lesson_slug) VALUES ($1, $2, $3)", [input.requestId, userId, input.lessonSlug]);
      });
      return { conversationId: input.requestId, state: await this.state(userId, input.lessonSlug) };
    }

    const reservation = await this.transaction(userId, async client => {
      const owned = await client.query("SELECT id FROM practice_conversations WHERE id = $1 AND user_id = $2 AND lesson_slug = $3", [input.conversationId, userId, input.lessonSlug]);
      if (!owned.rowCount) throw new PracticeError("conversation", "Conversa não encontrada.", 404);
      const old = await client.query<RequestRow & { user_id: string }>("SELECT * FROM practice_requests WHERE id = $1", [input.requestId]);
      if (old.rows[0]) {
        if (old.rows[0].user_id !== userId || old.rows[0].conversation_id !== input.conversationId || old.rows[0].prompt !== input.message) throw new PracticeError("conflict", "Identificador de mensagem inválido.", 409);
        return null; // Idempotent retries never make a second paid call, even after a timeout.
      }
      const history = await client.query<RequestRow>("SELECT * FROM practice_requests WHERE conversation_id = $1 AND user_id = $2 ORDER BY created_at, id", [input.conversationId, userId]);
      const usage = (await client.query<Usage>(usageSql, [userId, input.lessonSlug])).rows[0];
      assertQuota({ lessonMessages: usage.lesson_messages, dayMessages: usage.day_messages, conversationMessages: history.rows.length, lessonTokens: usage.lesson_tokens, dayTokens: usage.day_tokens, pending: usage.pending, cooldown: usage.cooldown });
      const prepared = buildPracticeMessages(lesson, history.rows, input.message);
      await client.query("INSERT INTO practice_budgets (month) VALUES (date_trunc('month', now() AT TIME ZONE 'UTC')::date) ON CONFLICT DO NOTHING");
      // Atomic conditional debit prevents concurrent users from oversubscribing the budget.
      const debit = await client.query("UPDATE practice_budgets SET charged_micro = charged_micro + $1 WHERE month = date_trunc('month', now() AT TIME ZONE 'UTC')::date AND charged_micro + $1 <= $2 RETURNING month", [L.requestCostMicro, L.monthlyBudgetMicro]);
      if (!debit.rowCount) throw new PracticeError("monthly_limit", "A cota mensal compartilhada de IA terminou. Continue pelo exercício escrito.", 429);
      await client.query(`INSERT INTO practice_requests (id, conversation_id, user_id, lesson_slug, prompt, status, token_charge, cost_charge_micro, context_trimmed)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)`, [input.requestId, input.conversationId, userId, input.lessonSlug, input.message, L.requestTokenReservation, L.requestCostMicro, prepared.contextTrimmed]);
      return prepared;
    });
    if (reservation) {
      let providerCalled = false;
      let result: Awaited<ReturnType<typeof callPracticeModel>> | undefined;
      let failure: unknown;
      try {
        await this.provider.check(this.settings.key!);
        providerCalled = true;
        result = await this.provider.call(this.settings.key!, reservation.messages);
      } catch (error) { failure = error; }
      await this.settle(userId, input.requestId, result, providerCalled, failure instanceof PracticeError ? failure.code : "unconfirmed");
      if (failure) throw failure instanceof PracticeError ? failure : new PracticeError("unconfirmed", "Não foi possível confirmar a resposta. A tentativa foi contabilizada por segurança. Consulte o histórico antes de enviar novamente.", 502);
    }
    return { conversationId: input.conversationId, state: await this.state(userId, input.lessonSlug) };
  }

  private async settle(userId: string, requestId: string, result: Awaited<ReturnType<typeof callPracticeModel>> | undefined, providerCalled: boolean, errorCode: string) {
    await this.transaction(userId, async client => {
      const row = (await client.query<RequestRow>("SELECT * FROM practice_requests WHERE id = $1 AND user_id = $2 FOR UPDATE", [requestId, userId])).rows[0];
      if (!row || row.status !== "pending") return;
      const tokens = result?.promptTokens !== undefined && result?.completionTokens !== undefined ? result.promptTokens + result.completionTokens : providerCalled ? L.requestTokenReservation : 0;
      const cost = result?.costMicro ?? (providerCalled ? L.requestCostMicro : 0);
      const overrun = tokens > L.requestTokenReservation || cost > L.requestCostMicro;
      // If reported usage violates our conservative reservation, fail closed for the month.
      await client.query(`UPDATE practice_budgets SET charged_micro = GREATEST(charged_micro - $1 + $2, $3)
        WHERE month = date_trunc('month', $4::timestamptz AT TIME ZONE 'UTC')::date`, [Number(row.cost_charge_micro), cost, overrun ? L.monthlyBudgetMicro : 0, row.created_at]);
      await client.query(`UPDATE practice_requests SET status = $1, reply = $2, token_charge = $3, cost_charge_micro = $4,
        prompt_tokens = $5, completion_tokens = $6, generation_id = $7, error_code = $8, finished_at = now() WHERE id = $9 AND user_id = $10`,
        [result ? "done" : "failed", result?.reply ?? null, tokens, cost, result?.promptTokens ?? null, result?.completionTokens ?? null, result?.generationId ?? null, result ? null : errorCode, requestId, userId]);
    });
  }
}

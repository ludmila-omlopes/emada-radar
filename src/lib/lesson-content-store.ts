import type { Pool } from "pg";
import { allLessons } from "./curriculum";
import { ContentError, parseContentWrite, type LessonEditorState, type TextOverrides } from "./lesson-editor";

type Row = { lesson_slug: string; draft: TextOverrides; published: TextOverrides; version: number; updated_at: Date; published_at: Date | null };
function state(slug: string, row?: Row): LessonEditorState {
  return { slug, draft: row?.draft ?? {}, published: row?.published ?? {}, version: row?.version ?? 0, updatedAt: row?.updated_at?.toISOString() ?? null, publishedAt: row?.published_at?.toISOString() ?? null };
}
export class LessonContentStore {
  constructor(private pool: Pool) {}
  async read(slug: string) {
    if (!allLessons.some(lesson => lesson.slug === slug)) throw new ContentError("Aula não encontrada.", 404);
    const result = await this.pool.query<Row>("SELECT * FROM lesson_content WHERE lesson_slug = $1", [slug]);
    return state(slug, result.rows[0]);
  }
  async list() {
    const result = await this.pool.query<Row>("SELECT * FROM lesson_content");
    return result.rows.map(row => state(row.lesson_slug, row));
  }
  async write(editorId: string, input: unknown) {
    const data = parseContentWrite(input, allLessons);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '10000ms'");
      // Recheck membership inside the mutation, even when a caller checked auth.
      const admin = await client.query("SELECT 1 FROM admin_users WHERE user_id = $1 FOR KEY SHARE", [editorId]);
      if (!admin.rowCount) throw new ContentError("Acesso restrito à administração.", 403);
      await client.query("INSERT INTO lesson_content (lesson_slug) VALUES ($1) ON CONFLICT DO NOTHING", [data.slug]);
      const current = await client.query<Row>("SELECT * FROM lesson_content WHERE lesson_slug = $1 FOR UPDATE", [data.slug]);
      if (current.rows[0].version !== data.version) throw new ContentError("Esta aula foi salva em outra aba. Seus textos continuam aqui. Copie o que quiser preservar e recarregue a versão mais recente antes de salvar.", 409);
      const result = await client.query<Row>(`UPDATE lesson_content SET draft = $2::jsonb,
        published = CASE WHEN $3 = 'publish' THEN $2::jsonb ELSE published END,
        published_at = CASE WHEN $3 = 'publish' THEN now() ELSE published_at END,
        updated_at = now(), updated_by = $4, version = version + 1
        WHERE lesson_slug = $1 RETURNING *`, [data.slug, JSON.stringify(data.texts), data.operation, editorId]);
      await client.query("INSERT INTO lesson_content_revisions (lesson_slug, version, operation, texts, editor_id) VALUES ($1, $2, $3, $4::jsonb, $5)", [data.slug, result.rows[0].version, data.operation, JSON.stringify(data.texts), editorId]);
      await client.query("COMMIT");
      return state(data.slug, result.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}

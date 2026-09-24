import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { allLessons, archivedLessons } from "../src/lib/curriculum";
import { applyLessonText, ContentError, lessonTextGroups, parseContentWrite, validateTextOverrides } from "../src/lib/lesson-editor";
import { LessonContentStore } from "../src/lib/lesson-content-store";
import { lessonContentHandlers } from "../src/lib/lesson-content-http";
import { getDayProgress, learningDays } from "../src/lib/learning-days";
import { validateSubmission } from "../src/lib/validation";

test("all active lesson text groups have unique safe paths and bounded chat starters", () => {
  for (const lesson of allLessons) {
    const groups = lessonTextGroups(lesson);
    const fields = groups.flatMap(group => group.fields);
    assert.equal(new Set(fields.map(field => field.path)).size, fields.length);
    assert.ok(groups.some(group => group.id === "practice"));
    assert.ok(groups.some(group => group.id === "quiz"));
    assert.equal(fields.find(field => field.path === "example.after")?.max, 1500);
    assert.deepEqual(validateTextOverrides(lesson, Object.fromEntries(fields.map(field => [field.path, field.value]))), {});
    assert.equal(fields.some(field => /(^slug$|\.src$|\.url$|^quiz\.answer$)/.test(field.path)), false);
  }
});

test("text overlay updates rich lessons without mutating originals, structure or progress", () => {
  const base = allLessons[0];
  const snapshot = JSON.stringify(base);
  const changed = applyLessonText(base, validateTextOverrides(base, { title: "Aula revisada", "sections.0.reading.diagram.nodes.0.text": "Nova explicação", "quiz.question": "Pergunta revisada", "example.after": "Um pedido de trabalho fictício" }));
  assert.equal(changed.title, "Aula revisada");
  assert.equal(changed.sections[0].reading!.diagram.nodes[0].text, "Nova explicação");
  assert.equal(JSON.stringify(base), snapshot);
  assert.equal(changed.slug, base.slug);
  assert.equal(changed.sections.length, base.sections.length);
  assert.equal(changed.quiz.answer, base.quiz.answer);
  assert.deepEqual(changed.presentation, base.presentation);
  const source = learningDays.map(day => ({ ...day, lesson: day.lesson.slug === base.slug ? changed : day.lesson }));
  assert.equal(getDayProgress([base.slug], source).count, 1);
  assert.equal(getDayProgress([], source).next?.lesson.title, "Aula revisada");
  assert.equal(validateSubmission({ lessonSlug: base.slug, answer: "Um registro de aprendizado com mais de trinta caracteres.", checked: [0, 1, 2], choice: changed.quiz.answer }).ok, true);
});

test("protected fields, unknown paths, prototype injection, invalid bodies and excessive text are rejected", () => {
  const base = allLessons[0];
  for (const value of [{ slug: "other" }, { "quiz.answer": "0" }, { "sections.0.reading.illustration.src": "https://tracker" }, { "steps.3": "extra" }, { title: " " }, { title: 2 }, { title: "x".repeat(181) }, { "example.after": "x".repeat(1501) }, JSON.parse('{"__proto__":"x"}'), { "constructor.prototype.title": "x" }]) assert.throws(() => validateTextOverrides(base, value), ContentError);
  for (const input of [null, [], { operation: "delete" }, { operation: "draft", slug: archivedLessons[0].slug, version: 0, texts: {} }, { operation: "draft", slug: base.slug, version: -1, texts: {} }, { operation: "draft", slug: base.slug, version: 0, texts: {}, admin: true }]) assert.throws(() => parseContentWrite(input, allLessons), ContentError);
});

test("every diagram preview receives unsaved title, caption and node edits without changing its layout or source", () => {
  const kinds = new Set<string>();
  let diagrams = 0;
  for (const lesson of allLessons) {
    for (const [index, section] of lesson.sections.entries()) {
      if (!section.reading) continue;
      const base = section.reading.diagram;
      const prefix = `sections.${index}.reading.diagram`;
      const fields = lessonTextGroups(lesson).find(group => group.id === `section-${index}`)!.fields.filter(field => field.path.startsWith(`${prefix}.`));
      assert.equal(fields.length, 2 + base.nodes.length * 2);
      const snapshot = JSON.stringify(base);
      const texts = Object.fromEntries(fields.map(field => [field.path, `Rascunho ${field.label}`]));
      const preview = applyLessonText(lesson, texts).sections[index].reading!.diagram;
      assert.equal(preview.title, texts[`${prefix}.title`]);
      assert.equal(preview.caption, texts[`${prefix}.caption`]);
      preview.nodes.forEach((node, n) => {
        assert.equal(node.title, texts[`${prefix}.nodes.${n}.title`]);
        assert.equal(node.text, texts[`${prefix}.nodes.${n}.text`]);
      });
      assert.equal(preview.kind, base.kind);
      assert.equal(JSON.stringify(base), snapshot);
      // Temporarily empty inputs must still render while the user is typing.
      assert.equal(applyLessonText(lesson, { [`${prefix}.title`]: "" }).sections[index].reading!.diagram.title, "");
      kinds.add(base.kind);
      diagrams++;
    }
  }
  assert.equal(diagrams, 35);
  assert.deepEqual([...kinds].sort(), ["compare", "cycle", "filter", "flow", "timeline"]);
});

test("optional text can be cleared and unknown saved paths cannot affect properties", () => {
  const base = allLessons[0];
  const index = base.sections.findIndex(section => section.prompt);
  assert.ok(index >= 0);
  const texts = validateTextOverrides(base, { [`sections.${index}.prompt`]: "", "example.before": "" });
  const changed = applyLessonText(base, { ...texts, slug: "bad", "quiz.answer": "0", "__proto__.polluted": "true" });
  assert.equal(changed.sections[index].prompt, "");
  assert.equal(changed.slug, base.slug);
  assert.equal(changed.quiz.answer, base.quiz.answer);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test("content HTTP rejects nonadmins, cross-origin calls, malformed and oversized payloads", async () => {
  let calls = 0;
  const store = () => { calls++; return {} as LessonContentStore; };
  const restricted = lessonContentHandlers({ admin: async () => null, store, siteUrl: "https://academy.example" });
  const admin = lessonContentHandlers({ admin: async () => ({ id: "editor" }), store, siteUrl: "https://academy.example" });
  const post = (body: string, origin = "https://academy.example", type = "application/json") => new Request("https://academy.example/api/admin/lessons", { method: "POST", headers: { origin, "content-type": type }, body });
  assert.equal((await restricted.GET(new Request("https://academy.example/api/admin/lessons?lesson=x"))).status, 403);
  assert.equal((await restricted.POST(post("{}"))).status, 403);
  assert.equal((await admin.POST(post("{}", "https://evil.example"))).status, 403);
  assert.equal((await admin.POST(post("{}", "https://academy.example", "text/plain"))).status, 415);
  assert.equal((await admin.POST(post("{"))).status, 400);
  assert.equal((await admin.POST(post("x".repeat(400001)))).status, 413);
  assert.equal(calls, 0);
});

test("migration is additive, drafts private, publishing atomic, conflicts safe and history retained", async () => {
  const db = new PGlite();
  await db.exec('CREATE TABLE "user" (id text PRIMARY KEY); CREATE TABLE admin_users (user_id text PRIMARY KEY REFERENCES "user"(id)); INSERT INTO "user" VALUES (\'editor\'), (\'student\'); INSERT INTO admin_users VALUES (\'editor\');');
  const migration = await readFile(new URL("../migrations/003-lesson-content.sql", import.meta.url), "utf8");
  await db.exec(migration); await db.exec(migration);
  let queue = Promise.resolve();
  const lock = async () => { const previous = queue; let release!: () => void; queue = new Promise<void>(resolve => { release = resolve; }); await previous; return release; };
  const query = async (sql: string, params?: unknown[]) => { const result = await db.query(sql, params); return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 }; };
  const pool = { query: async (sql: string, params?: unknown[]) => { const release = await lock(); try { return await query(sql, params); } finally { release(); } }, connect: async () => { const release = await lock(); return { query, release }; } } as unknown as Pool;
  const store = new LessonContentStore(pool);
  const slug = allLessons[0].slug;
  try {
    assert.equal((await store.read(slug)).version, 0);
    await assert.rejects(store.write("student", { slug, version: 0, operation: "publish", texts: { title: "Not authorized" } }), error => error instanceof ContentError && error.status === 403);
    assert.equal((await store.list()).length, 0);
    const draft = await store.write("editor", { slug, version: 0, operation: "draft", texts: { title: "Título privado" } });
    assert.deepEqual(draft.published, {});
    assert.equal(draft.publishedAt, null);
    assert.equal(draft.draft.title, "Título privado");
    const race = await Promise.allSettled(["Versão A", "Versão B"].map(title => store.write("editor", { slug, version: 1, operation: "publish", texts: { title } })));
    assert.equal(race.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(race.filter(result => result.status === "rejected" && result.reason.status === 409).length, 1);
    const published = await store.read(slug);
    assert.equal(published.version, 2);
    assert.ok(published.publishedAt);
    await store.write("editor", { slug, version: 2, operation: "draft", texts: { title: "Nova ideia privada" } });
    assert.deepEqual((await store.read(slug)).published, published.published);
    const original = await store.write("editor", { slug, version: 3, operation: "publish", texts: {} });
    assert.deepEqual(original.published, {});
    const count = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM lesson_content_revisions");
    assert.equal(count.rows[0].count, 4);
    assert.equal((await db.query<{ count: number }>('SELECT count(*)::int AS count FROM "user"')).rows[0].count, 2);
  } finally { await db.close(); }
});

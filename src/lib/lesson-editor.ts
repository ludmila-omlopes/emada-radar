import type { Lesson } from "./curriculum";

export type TextOverrides = Record<string, string>;
export type LessonTextField = { path: string; label: string; value: string; max: number; optional: boolean; multiline: boolean };
export type LessonTextGroup = { id: string; title: string; fields: LessonTextField[] };
export class ContentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// Only these known text leaves are editable. URLs, slugs, structure and answers
// never come from the browser. Paths are derived from the bundled curriculum.
export function lessonTextGroups(lesson: Lesson): LessonTextGroup[] {
  const groups: LessonTextGroup[] = [];
  function group(id: string, title: string) {
    const fields: LessonTextField[] = [];
    groups.push({ id, title, fields });
    return (path: string, label: string, value: string | undefined, max = 6000, optional = false, multiline = true) => {
      fields.push({ path, label, value: value ?? "", max, optional, multiline });
    };
  }
  const general = group("general", "Visão geral");
  general("title", "Título da aula", lesson.title, 180, false, false);
  general("intro", "Apresentação / objetivo", lesson.intro, 800);
  lesson.sections.forEach((section, i) => {
    const prefix = `sections.${i}`;
    const add = group(`section-${i}`, `${i + 1}. ${section.title}`);
    add(`${prefix}.title`, "Título da etapa", section.title, 180, false, false);
    add(`${prefix}.body`, "Texto de abertura", section.body);
    add(`${prefix}.prompt`, "Pedido para experimentar (opcional)", section.prompt, 1500, true);
    if (section.slide) add(`${prefix}.slide.alt`, "Descrição acessível do slide", section.slide.alt, 600);
    const r = section.reading;
    if (!r) return;
    r.paragraphs.forEach((value, n) => add(`${prefix}.reading.paragraphs.${n}`, `Desenvolvimento · parágrafo ${n + 1}`, value));
    add(`${prefix}.reading.diagram.title`, "Diagrama · título", r.diagram.title, 180, false, false);
    r.diagram.nodes.forEach((node, n) => {
      add(`${prefix}.reading.diagram.nodes.${n}.title`, `Diagrama · bloco ${n + 1} · título`, node.title, 140, false, false);
      add(`${prefix}.reading.diagram.nodes.${n}.text`, `Diagrama · bloco ${n + 1} · texto`, node.text, 1200);
    });
    add(`${prefix}.reading.diagram.caption`, "Diagrama · legenda", r.diagram.caption, 1200);
    for (const [key, label] of Object.entries({ title: "Título", situation: "A situação", response: "Uma forma de experimentar", commentary: "O que observar" })) {
      add(`${prefix}.reading.example.${key}`, `Exemplo · ${label}`, r.example[key as keyof typeof r.example], key === "title" ? 180 : 6000);
    }
    add(`${prefix}.reading.reflection.question`, "Reflexão · pergunta", r.reflection.question, 600);
    add(`${prefix}.reading.reflection.answer`, "Reflexão · resposta revelada", r.reflection.answer);
    add(`${prefix}.reading.takeaway`, "Guarde esta ideia", r.takeaway, 1200);
    if (r.illustration) {
      add(`${prefix}.reading.illustration.alt`, "Ilustração · descrição acessível", r.illustration.alt, 600);
      add(`${prefix}.reading.illustration.caption`, "Ilustração · legenda", r.illustration.caption, 1200);
    }
  });
  const practice = group("practice", "Prática e exemplo de chat");
  practice("example.before", "Pedido vago (opcional)", lesson.example.before, 1500, true);
  practice("example.after", "Pedido sugerido no chat", lesson.example.after, 1500);
  practice("example.caption", "Legenda do pedido", lesson.example.caption, 1200);
  lesson.steps.forEach((value, i) => practice(`steps.${i}`, `Tarefa ${i + 1} do checklist`, value, 1200));
  practice("task", "O que o aluno deve registrar", lesson.task, 2000);
  practice("placeholder", "Sugestão no campo de registro", lesson.placeholder, 2000);
  const quiz = group("quiz", "Revisão");
  quiz("quiz.question", "Pergunta", lesson.quiz.question, 1200);
  lesson.quiz.options.forEach((value, i) => quiz(`quiz.options.${i}`, `Alternativa ${i + 1}${i === lesson.quiz.answer ? " · correta (preserve o sentido)" : " · incorreta"}`, value, 1200));
  quiz("quiz.explanation", "Explicação da resposta", lesson.quiz.explanation, 3000);
  if (lesson.presentation || lesson.sources.length) {
    const material = group("material", "Material de apoio");
    if (lesson.presentation) material("presentation.attribution", "Descrição da apresentação", lesson.presentation.attribution, 1200);
    lesson.sources.forEach((source, i) => material(`sources.${i}.label`, `Nome da fonte ${i + 1}`, source.label, 200, false, false));
  }
  return groups;
}

export function validateTextOverrides(lesson: Lesson, input: unknown): TextOverrides {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ContentError("Formato dos textos inválido.");
  const fields = new Map(lessonTextGroups(lesson).flatMap(group => group.fields).map(field => [field.path, field]));
  const result: TextOverrides = {};
  for (const [path, value] of Object.entries(input)) {
    const field = fields.get(path);
    if (!field) throw new ContentError("Este campo não pode ser editado.");
    if (typeof value !== "string" || value.length > field.max || (!field.optional && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
      throw new ContentError(`Confira “${field.label}”: ${field.optional ? "até" : "preencha com até"} ${field.max} caracteres.`);
    }
    if (value !== field.value) result[path] = value;
  }
  return result;
}

export function applyLessonText(lesson: Lesson, overrides: TextOverrides): Lesson {
  const copy = structuredClone(lesson);
  const allowed = new Set(lessonTextGroups(lesson).flatMap(group => group.fields.map(field => field.path)));
  for (const [path, value] of Object.entries(overrides)) {
    if (!allowed.has(path) || typeof value !== "string") continue;
    const keys = path.split(".");
    let target = copy as unknown as Record<string, unknown>;
    for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
    target[keys.at(-1)!] = value;
  }
  return copy;
}

export type LessonEditorState = {
  slug: string; version: number; draft: TextOverrides; published: TextOverrides;
  updatedAt: string | null; publishedAt: string | null;
};
export type ContentWrite = { slug: string; version: number; operation: "draft" | "publish"; texts: TextOverrides };
export function parseContentWrite(input: unknown, lessons: Lesson[]): ContentWrite {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ContentError("Pedido inválido.");
  const item = input as Record<string, unknown>;
  if (Object.keys(item).some(key => !["slug", "version", "operation", "texts"].includes(key)) || typeof item.slug !== "string" || !Number.isSafeInteger(item.version) || (item.version as number) < 0 || !["draft", "publish"].includes(item.operation as string)) throw new ContentError("Pedido inválido.");
  const lesson = lessons.find(lesson => lesson.slug === item.slug);
  if (!lesson) throw new ContentError("Aula não encontrada.", 404);
  return { slug: lesson.slug, version: item.version as number, operation: item.operation as ContentWrite["operation"], texts: validateTextOverrides(lesson, item.texts) };
}

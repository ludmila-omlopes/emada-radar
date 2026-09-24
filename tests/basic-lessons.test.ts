import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { allLessons, archivedLessons, findLesson, modules } from "../src/lib/curriculum";
import { getDayProgress, learningDays } from "../src/lib/learning-days";
import { validateSubmission } from "../src/lib/validation";

test("seven foundations retain their titles; automations remain eight independent lessons", () => {
  assert.deepEqual(modules.map(module => module.lessons.length), [7, 8]);
  assert.equal(learningDays[7].moduleSlug, "automacoes");
  assert.deepEqual(modules[0].lessons.map(lesson => lesson.title), [
    "Seu primeiro passo com IA", "Qual é a sua pergunta?", "Seu primeiro projeto pessoal",
    "Experimentar e avaliar", "Pensando em voz alta", "O desconforto de começar", "Uma prática que cabe na rotina",
  ]);
  assert.equal(new Set([...allLessons, ...archivedLessons].map(lesson => lesson.slug)).size, 21);
});

test("each foundation lesson has five substantial explorations and an editable summary", () => {
  for (const lesson of modules[0].lessons) {
    assert.equal(lesson.sections.length, 5);
    assert.ok(lesson.presentation?.attribution.includes("Emada Academy"));
    const deck = resolve("public", `.${lesson.presentation!.download}`);
    assert.ok(statSync(deck).size > 1000);
    assert.equal(readFileSync(deck).subarray(0, 2).toString(), "PK");
    for (const section of lesson.sections) {
      assert.ok(section.body.length > 150);
      assert.ok(section.reading);
      assert.equal(section.reading.paragraphs.length, 2);
      assert.ok(section.reading.paragraphs.every(paragraph => paragraph.length > 200));
      assert.ok(section.reading.diagram.nodes.length >= 3);
      assert.ok(section.reading.diagram.nodes.every(node => node.title && node.text));
      assert.ok(section.reading.diagram.caption.length > 50);
      assert.ok(section.reading.example.commentary.length > 100);
      assert.ok(section.reading.reflection.question.length > 30);
      assert.ok(section.reading.reflection.answer.length > 100);
      const words = JSON.stringify({ body: section.body, reading: section.reading }).split(/\s+/).length;
      assert.ok(words >= 220, `${lesson.title} / ${section.title}: ${words} words`);
      if (section.reading.illustration) {
        assert.ok(section.reading.illustration.alt.length > 50);
        const asset = readFileSync(resolve("public", `.${section.reading.illustration.src}`));
        assert.equal(asset.subarray(8, 12).toString(), "WEBP");
        assert.ok(asset.length < 250000, "illustration is optimized for the web");
      }
    }
  }
});

test("foundation content uses an original public voice and accurate text-chat expectations", () => {
  assert.doesNotMatch(JSON.stringify(modules[0]), /Jeremy|Utley|AI Learning Series/i);
  const voice = modules[0].lessons.find(lesson => lesson.slug === "pensando-em-voz-alta")!;
  assert.match(JSON.stringify(voice.sections), /Academy.*texto/);
  assert.match(JSON.stringify(voice.sections), /não oferece gravação/);
  assert.equal(modules[0].lessons.flatMap(lesson => lesson.sections).filter(section => section.reading?.illustration).length, 3);
});

test("old exercises remain addressable and never complete new basics", () => {
  assert.equal(archivedLessons.length, 6);
  for (const lesson of archivedLessons) assert.equal(findLesson(lesson.slug).lesson, lesson);
  const progress = getDayProgress([...archivedLessons, modules[1].lessons[0]].map(lesson => lesson.slug));
  assert.equal(progress.count, 1);
  assert.equal(progress.next?.number, 1);
  assert.equal(progress.days[7].complete, true);
});

test("work examples and practice prompts stay coherent across the seven foundations", () => {
  const foundation = modules[0];
  const serialized = JSON.stringify(foundation);
  assert.doesNotMatch(serialized, /jantares?|piquenique|clube de leitura|fogão|passeio|hobby/i);
  for (const lesson of foundation.lessons) {
    for (const section of lesson.sections) {
      assert.match(JSON.stringify(section.reading!.example), /vídeo|edição|editora?|cliente|produto|serviço|papelaria|anúncio|empreendedor|criador|briefing|montagem|publicar|roteiro/i,
        `${lesson.title} / ${section.title} must use a work example`);
      if (section.prompt) assert.ok(section.prompt.length <= 1500, "copyable prompt fits the practice composer");
    }
    assert.match(lesson.example.after, /fictíci[oa]/, "starter uses a fictional work scenario");
    assert.match(lesson.presentation!.download, /fundamentos-v3\.pptx$/);
    assert.equal(lesson.steps.length, 3, "existing completion checklist remains compatible");
  }
  assert.deepEqual(foundation.lessons.map(lesson => lesson.quiz.answer), [1, 0, 2, 1, 0, 2, 1]);
  const project = JSON.stringify(foundation.lessons[2].sections);
  assert.match(project, /não assiste aos arquivos de vídeo/);
  assert.match(project, /plano em texto, não um vídeo pronto/);
});

test("new and archived exercises retain server-side checklist, answer and quiz validation", () => {
  for (const lesson of [...modules[0].lessons, ...archivedLessons]) {
    const submission = { lessonSlug: lesson.slug, answer: "Minha avaliação do exercício usando apenas informações fictícias.", checked: lesson.steps.map((_, i) => i), choice: lesson.quiz.answer };
    assert.equal(validateSubmission(submission).ok, true);
    assert.equal(validateSubmission({ ...submission, answer: "Curto" }).ok, false);
    assert.equal(validateSubmission({ ...submission, checked: [] }).ok, false);
    assert.equal(validateSubmission({ ...submission, choice: (lesson.quiz.answer + 1) % lesson.quiz.options.length }).ok, false);
  }
  assert.equal(validateSubmission({ lessonSlug: "inexistente", answer: "Um texto suficientemente longo para este teste.", checked: [0, 1, 2], choice: 0 }).ok, false);
});

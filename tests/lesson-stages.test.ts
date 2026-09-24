import assert from "node:assert/strict";
import { test } from "node:test";
import { allLessons, archivedLessons } from "../src/lib/curriculum";
import { getLessonStages } from "../src/lib/lesson-stages";

test("every day and archived lesson exposes every stage in display order", () => {
  for (const lesson of [...allLessons, ...archivedLessons]) {
    const stages = getLessonStages(lesson);
    const practiceIndex = lesson.sections.length + (lesson.presentation ? 0 : 1);
    assert.equal(stages.length, practiceIndex + 2);
    assert.deepEqual(stages.slice(0, lesson.sections.length).map(stage => stage.title), lesson.sections.map(section => section.title));
    assert.equal(stages[practiceIndex].kind, "Prática");
    assert.equal(stages[practiceIndex + 1].kind, "Revisão");
    assert.equal(stages.filter(stage => stage.kind === "Exemplo").length, lesson.presentation ? 0 : 1);
    assert.ok(stages.every(stage => stage.title.length > 0));
  }
});

test("foundation navigation retains five explorations, practice and review", () => {
  const stages = getLessonStages(allLessons[0]);
  assert.equal(stages.length, 7);
  assert.deepEqual(stages.map(stage => stage.kind), ["Exploração", "Exploração", "Exploração", "Exploração", "Exploração", "Prática", "Revisão"]);
});

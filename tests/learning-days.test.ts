import assert from "node:assert/strict";
import { test } from "node:test";
import { allLessons } from "../src/lib/curriculum";
import { getDayProgress, learningDays } from "../src/lib/learning-days";

test("daily study preserves the lesson identifiers used by saved exercises", () => {
  assert.equal(learningDays.length, 15);
  assert.deepEqual(learningDays.map(day => day.lesson.slug), allLessons.map(lesson => lesson.slug));
  assert.deepEqual(learningDays.map(day => day.number), Array.from({ length: 15 }, (_, i) => i + 1));
});

test("new accounts start on day one; duplicate or obsolete completions do not inflate progress", () => {
  const first = learningDays[0].lesson.slug;
  assert.equal(getDayProgress([]).next?.number, 1);
  const progress = getDayProgress([first, first, "removed-lesson"]);
  assert.equal(progress.count, 1);
  assert.equal(progress.percent, 7);
  assert.equal(progress.next?.number, 2);
});

test("out-of-order study continues at the first unfinished day", () => {
  const progress = getDayProgress([learningDays[2].lesson.slug, learningDays[0].lesson.slug]);
  assert.equal(progress.count, 2);
  assert.equal(progress.next?.number, 2);
  assert.equal(progress.days[2].complete, true);
});

test("finishing the timeline leaves no next day and does not leak progress between accounts", () => {
  const complete = getDayProgress(learningDays.map(day => day.lesson.slug));
  assert.equal(complete.percent, 100);
  assert.equal(complete.next, undefined);
  assert.equal(getDayProgress([]).count, 0);
  assert.equal(getDayProgress([]).next?.number, 1);
});

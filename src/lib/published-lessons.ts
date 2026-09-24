import "server-only";
import { cache } from "react";
import { getDb, databaseConfigured } from "./db";
import { learningDays } from "./learning-days";
import { applyLessonText, type TextOverrides } from "./lesson-editor";

// Request-local deduplication only: drafts never enter learner props or caches.
export const getPublishedDays = cache(async () => {
  if (!databaseConfigured()) return learningDays;
  const result = await getDb().query<{ lesson_slug: string; published: TextOverrides }>("SELECT lesson_slug, published FROM lesson_content WHERE published_at IS NOT NULL");
  const content = new Map(result.rows.map(row => [row.lesson_slug, row.published]));
  return learningDays.map(day => ({ ...day, lesson: applyLessonText(day.lesson, content.get(day.lesson.slug) ?? {}) }));
});

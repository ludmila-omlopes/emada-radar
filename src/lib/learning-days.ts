import { modules } from "./curriculum";

// Only active lessons count; previous basics retain their own archived identifiers.
export const learningDays = modules.flatMap(module => module.lessons.map(lesson => ({
  lesson, moduleSlug: module.slug, moduleTitle: module.title, level: module.level,
}))).map((day, index) => ({ ...day, number: index + 1 }));

export function getDayProgress(completedSlugs: readonly string[], source = learningDays) {
  const completed = new Set(completedSlugs);
  const days = source.map(day => ({ ...day, complete: completed.has(day.lesson.slug) }));
  const count = days.filter(day => day.complete).length;
  return { days, count, total: days.length, percent: Math.round(count / days.length * 100), next: days.find(day => !day.complete) };
}

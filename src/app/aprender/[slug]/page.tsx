import { notFound } from "next/navigation";
import { getDayProgress } from "@/lib/learning-days";
import { getPublishedDays } from "@/lib/published-lessons";
import { getProgress } from "@/lib/progress";
import { requireSession } from "@/lib/session";
import { LessonSession } from "@/components/lesson-session";
import { archivedLessons } from "@/lib/curriculum";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const learningDays = await getPublishedDays();
  const day = learningDays.find(d => d.lesson.slug === slug);
  const archived = archivedLessons.find(lesson => lesson.slug === slug);
  return { title: day ? `Dia ${day.number} · ${day.lesson.title}` : archived ? `${archived.title} · Versão anterior` : "Aula não encontrada" };
}
export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const learningDays = await getPublishedDays();
  const day = learningDays.find(d => d.lesson.slug === slug);
  const archived = !day ? archivedLessons.find(lesson => lesson.slug === slug) : undefined;
  if (!day && !archived) notFound();
  const session = await requireSession(`/aprender/${slug}`);
  const progress = await getProgress();
  const saved = progress.find(p => p.lesson_slug === slug);
  const next = getDayProgress([...progress.map(p => p.lesson_slug), slug], learningDays).next;
  return <LessonSession key={`${session.user.id}:${slug}`} day={day ?? { number: 0, lesson: archived! }} archived={Boolean(archived)} totalDays={learningDays.length} userId={session.user.id} saved={saved} next={next ? { number: next.number, slug: next.lesson.slug, title: next.lesson.title } : undefined}/>;
}

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";
import { learningDays } from "@/lib/learning-days";
import { LessonContentStore } from "@/lib/lesson-content-store";
import { AdminLessonEditor } from "@/components/admin-lesson-editor";

export const metadata = { title: "Editor de aula", robots: { index: false, follow: false } };
export default async function AdminLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireAdmin(`/admin/aulas/${slug}`);
  const day = learningDays.find(day => day.lesson.slug === slug);
  if (!day) notFound();
  const initial = await new LessonContentStore(getDb()).read(slug);
  return <div className="page-container"><AdminLessonEditor base={day.lesson} initial={initial} day={day.number}/></div>;
}

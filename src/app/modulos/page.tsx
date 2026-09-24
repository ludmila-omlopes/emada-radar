import { DayTimeline } from "@/components/day-timeline";
import { getProgress } from "@/lib/progress";
import { requireSession } from "@/lib/session";
import { getPublishedDays } from "@/lib/published-lessons";
export const metadata = { title: "Minha trilha" };
export default async function ModulesPage() {
  await requireSession("/modulos");
  const progress = await getProgress();
  return <div className="page-container"><DayTimeline source={await getPublishedDays()} completed={progress.map(p => p.lesson_slug)}/></div>;
}

import { DayTimeline } from "@/components/day-timeline";
import { getProgress } from "@/lib/progress";
import { canAccessAcademy, requireSession } from "@/lib/session";
import { AcademyWaitlist } from "@/components/academy-waitlist";
import { getPublishedDays } from "@/lib/published-lessons";
export async function generateMetadata() { return { title: await canAccessAcademy() ? "Minha trilha" : "Emada Academy" }; }
export default async function ModulesPage() {
  if (!await canAccessAcademy()) return <AcademyWaitlist source="modulos"/>;
  await requireSession("/modulos");
  const progress = await getProgress();
  return <div className="page-container"><DayTimeline source={await getPublishedDays()} completed={progress.map(p => p.lesson_slug)}/></div>;
}

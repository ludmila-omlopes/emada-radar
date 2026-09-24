import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getProgress } from "@/lib/progress";
import { getDayProgress } from "@/lib/learning-days";
import { getPublishedDays } from "@/lib/published-lessons";
import { GoogleAccount } from "@/components/google-account";
import { Button } from "@/components/ui/button";
import { archivedLessons } from "@/lib/curriculum";
export const metadata = { title: "Meu progresso", robots: { index: false, follow: false } };
export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  await requireSession("/progresso");
  const progress = await getProgress();
  const learningDays = await getPublishedDays();
  const state = getDayProgress(progress.map(p => p.lesson_slug), learningDays);
  const archivedRecords = archivedLessons.flatMap(lesson => {
    const record = progress.find(p => p.lesson_slug === lesson.slug);
    return record ? [{ lesson, record }] : [];
  });
  const records = learningDays.flatMap(day => {
    const record = progress.find(p => p.lesson_slug === day.lesson.slug);
    return record ? [{ day, record }] : [];
  });
  return <div className="page-container"><div className="daily-track">
    <header className="track-heading"><h1>Meu progresso</h1><p>Suas conquistas e exercícios salvos.</p></header>
    <div className="track-progress"><div><span>{state.count} de {state.total} dias concluídos</span><strong>{state.percent}%</strong></div><progress value={state.count} max={state.total} aria-label="Dias de estudo concluídos"/></div>
    <Button asChild><Link href="/modulos">Ver minha timeline<ArrowRight size={16}/></Link></Button>
    <section className="saved-days"><h2>Exercícios salvos</h2>{records.length ? records.map(({ day, record }) => <details key={record.lesson_slug} className="saved-day"><summary>Dia {day.number} · {day.lesson.title}</summary><time dateTime={record.updated_at}>Atualizado em {new Date(record.updated_at).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</time><pre>{record.answer}</pre><Link className="text-link" href={`/aprender/${record.lesson_slug}`}>Revisar aula<ArrowRight size={15}/></Link></details>) : <p>Conclua seu primeiro dia para salvar um exercício aqui.</p>}</section>
    {archivedRecords.length > 0 && <section className="saved-days"><h2>Histórico do básico anterior</h2><p>Seus exercícios continuam aqui. As sete novas aulas têm atividades próprias e começam sem conclusão.</p>{archivedRecords.map(({ lesson, record }) => <details key={lesson.slug} className="saved-day"><summary>{lesson.title} · Versão anterior</summary><time dateTime={record.updated_at}>Atualizado em {new Date(record.updated_at).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</time><pre>{record.answer}</pre><Link className="text-link" href={`/aprender/${lesson.slug}`}>Revisar aula anterior<ArrowRight size={15}/></Link></details>)}</section>}
    <details className="account-details" open={Boolean(error)}><summary>Minha conta · Conexão com Google</summary><GoogleAccount error={error}/></details>
  </div></div>;
}

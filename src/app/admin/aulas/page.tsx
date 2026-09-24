import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";
import { learningDays } from "@/lib/learning-days";
import { LessonContentStore } from "@/lib/lesson-content-store";
import { applyLessonText } from "@/lib/lesson-editor";

export const metadata = { title: "Editar aulas", robots: { index: false, follow: false } };
export default async function AdminLessonsPage() {
  await requireAdmin("/admin/aulas");
  const states = await new LessonContentStore(getDb()).list();
  return <div className="page-container"><div className="admin-lessons"><Link href="/admin" className="text-link"><ArrowLeft size={16}/>Administração</Link><header className="editor-heading"><div><p className="editor-eyebrow">Conteúdo da Academy</p><h1>Suas aulas, nas suas palavras.</h1><p>Escolha uma aula para editar textos, exemplos, diagramas e exercícios.<br/>Rascunhos ficam privados até você publicar.</p></div></header>
    {Array.from(new Set(learningDays.map(day => day.moduleSlug))).map(moduleSlug => <section key={moduleSlug} className="admin-lesson-group"><h2>{moduleSlug === "fundamentos" ? "Fundamentos" : "Automações"}</h2><ol>{learningDays.filter(day => day.moduleSlug === moduleSlug).map(day => {
      const state = states.find(state => state.slug === day.lesson.slug);
      const lesson = applyLessonText(day.lesson, state?.draft ?? {});
      const keys = new Set([...Object.keys(state?.draft ?? {}), ...Object.keys(state?.published ?? {})]);
      const draft = [...keys].some(key => state?.draft[key] !== state?.published[key]);
      return <li key={lesson.slug}><Link href={`/admin/aulas/${lesson.slug}`}><span className="admin-lesson-number">{String(day.number).padStart(2, "0")}</span><span><strong>{lesson.title}</strong><small>{lesson.sections.length} etapas de conteúdo · prática e revisão</small></span><span className="admin-lesson-status">{draft ? "Rascunho não publicado" : state?.publishedAt ? "Publicado" : "Versão original"}</span><ArrowRight size={18}/></Link></li>;
    })}</ol></section>)}
    <p className="editor-note">As edições preservam os links e o progresso dos alunos. Este editor altera os textos no site; imagens e arquivos de apresentação não são substituídos aqui.</p>
  </div></div>;
}

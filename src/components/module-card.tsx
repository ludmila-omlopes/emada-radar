import Link from "next/link";
import { ArrowUpRight, BookOpen, Clock3, Check } from "lucide-react";
import type { CourseModule } from "@/lib/curriculum";
import { ModuleArt } from "./module-art";
export function ModuleCard({ module, completed = [] }: { module: CourseModule; completed?: string[] }) {
  const done = module.lessons.filter(l => completed.includes(l.slug)).length;
  const next = module.lessons.find(l => !completed.includes(l.slug)) ?? module.lessons[0];
  return <article className="module-card"><Link href={`/modulos#${module.slug}`} aria-label={`Ver capítulos: ${module.title}`}><ModuleArt type={module.slug as "fundamentos" | "automacoes"} /></Link><div className="module-card-content"><div className="module-card-label"><span>MÓDULO {module.number}</span><span className={module.level === "Básico" ? "level-tag" : "level-tag intermediate"}>{module.level}</span></div><h3><Link href={`/modulos#${module.slug}`}>{module.title}</Link></h3><p>{module.description}</p><div className="module-meta"><span><BookOpen size={14} />{module.lessons.length} capítulos</span><span><Clock3 size={14} />{module.lessons.reduce((s, l) => s + l.minutes, 0)} min</span></div><div className="module-card-bottom"><span>{done > 0 ? `${done}/${module.lessons.length} concluídos` : module.tags.join(" · ")}</span><Link href={`/aprender/${next.slug}`}>{done === module.lessons.length ? <>Revisar <Check size={16} /></> : done ? <>Continuar <ArrowUpRight size={16} /></> : <>Começar <ArrowUpRight size={16} /></>}</Link></div></div></article>;
}

import Link from "next/link";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDayProgress, learningDays } from "@/lib/learning-days";

export function DayTimeline({ completed, name, source = learningDays }: { completed: string[]; name?: string; source?: typeof learningDays }) {
  const { days, count, total, percent, next } = getDayProgress(completed, source);
  return <div className="daily-track">
    <header className="track-heading">
      <h1>{name ? `Sua trilha, ${name}.` : "Sua trilha, dia a dia."}</h1>
      <p>Uma aula por dia, no seu ritmo. Você pode avançar quando quiser.</p>
    </header>
    <div className="track-progress">
      <div><span>{count} de {total} dias concluídos</span><strong>{percent}%</strong></div>
      <progress value={count} max={total} aria-label="Dias de estudo concluídos" />
    </div>
    {next ? <section className="next-day" aria-labelledby="next-day-title">
      <div className="next-day-number">Dia <strong>{String(next.number).padStart(2, "0")}</strong></div>
      <div className="next-day-copy"><h2 id="next-day-title">{next.lesson.title}</h2><p><Clock3 size={15} />{next.lesson.minutes} min · {next.lesson.sections[0]?.reading ? "Leitura, exploração e prática" : next.lesson.presentation ? "Slides, leitura e prática" : "Conceito, exemplo e prática"}</p></div>
      <Button asChild><Link href={`/aprender/${next.lesson.slug}`}>{count ? "Continuar" : "Começar"}<ArrowRight size={17}/></Link></Button>
    </section> : <section className="track-finished"><Check size={26}/><div><h2>Você concluiu os {total} dias.</h2><p>Revise uma aula ou coloque suas ideias em prática.</p></div><Button asChild><Link href="/laboratorio">Abrir laboratório<ArrowRight size={17}/></Link></Button></section>}
    <section className="timeline" aria-label="Linha do tempo de aprendizado">
      {Array.from(new Set(days.map(day => day.moduleSlug))).map(moduleSlug => {
        const group = days.filter(day => day.moduleSlug === moduleSlug);
        return <section className="timeline-group" id={moduleSlug} key={moduleSlug}>
          <div className="timeline-group-heading"><h2>{group[0].level === "Básico" ? "Fundamentos" : "Automações"}</h2><span>Dias {group[0].number}–{group.at(-1)!.number}</span></div>
          <ol>{group.map(day => {
            const current = next?.number === day.number;
            return <li key={day.lesson.slug} className={`timeline-item ${day.complete ? "is-complete" : current ? "is-current" : "is-upcoming"}`}>
              <Link href={`/aprender/${day.lesson.slug}`} aria-current={current ? "step" : undefined}>
                <span className="timeline-marker" aria-hidden="true">{day.complete ? <Check size={17}/> : day.number}</span>
                <span className="timeline-title"><span>Dia {day.number}</span><strong>{day.lesson.title}</strong></span>
                <span className="timeline-state">{day.complete ? "Concluído" : current ? "Próximo passo" : `${day.lesson.minutes} min`}</span><ArrowRight className="timeline-arrow" size={16}/>
              </Link>
            </li>;
          })}</ol>
        </section>;
      })}
    </section>
  </div>;
}

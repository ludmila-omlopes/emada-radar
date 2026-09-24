"use client";
/* eslint-disable react-hooks/set-state-in-effect -- restore a user-scoped draft after hydration. */
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock3, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PracticeChat } from "@/components/practice-chat";
import { LessonStageNavigation } from "@/components/lesson-stage-navigation";
import { FoundationReading } from "@/components/foundation-reading";
import { getLessonStages } from "@/lib/lesson-stages";
import { saveLesson } from "@/app/actions/progress";
import type { Lesson } from "@/lib/curriculum";
import type { ProgressRecord } from "@/lib/progress";

type Props = {
  day: { number: number; lesson: Lesson }; totalDays: number; userId: string;
  saved?: ProgressRecord; next?: { number: number; slug: string; title: string };
  archived?: boolean;
};
export function LessonSession({ day, totalDays, userId, saved, next, archived = false }: Props) {
  const { lesson } = day;
  const router = useRouter();
  const exampleStep = lesson.sections.length;
  const practiceStep = exampleStep + (lesson.presentation ? 0 : 1);
  const quizStep = practiceStep + 1;
  const stages = getLessonStages(lesson);
  const totalSteps = stages.length;
  const draftKey = `emada:draft:${userId}:${lesson.slug}`;
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState(saved?.answer ?? "");
  const [checked, setChecked] = useState<number[]>(saved?.checked ?? []);
  const [choice, setChoice] = useState<number | null>(saved?.choice ?? null);
  const [reviewed, setReviewed] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const recordInput = useRef<HTMLTextAreaElement>(null);
  const moved = useRef(false);
  const practiceReady = lesson.steps.every((_, i) => checked.includes(i)) && answer.trim().length >= 30;
  const correct = choice === lesson.quiz.answer;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw && !saved) {
        const draft = JSON.parse(raw);
        const text = typeof draft.answer === "string" ? draft.answer.slice(0, 12000) : "";
        const checks: number[] = Array.isArray(draft.checked) ? draft.checked.filter((n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < lesson.steps.length) : [];
        setAnswer(text); setChecked(checks);
        if (Number.isInteger(draft.choice) && draft.choice >= 0 && draft.choice < lesson.quiz.options.length) setChoice(draft.choice);
        if (Number.isInteger(draft.step) && draft.step >= 0 && draft.step <= quizStep) {
          setStep(draft.step);
        }
      }
    } catch { /* The lesson also works with browser storage disabled. */ }
    setReady(true);
  }, [draftKey, saved, lesson.steps, lesson.quiz.options.length, quizStep]);

  useEffect(() => {
    if (!ready || success) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify({ step, answer, checked, choice })); } catch { /* Server saving remains available. */ }
  }, [ready, success, draftKey, step, answer, checked, choice]);

  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step, success]);

  function goTo(value: number) {
    if (!ready || pending || !Number.isInteger(value) || value < 0 || value >= totalSteps) return;
    moved.current = true; setError("");
    if (value === step) { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "instant" }); }
    else setStep(value);
  }
  function save() {
    setError("");
    startTransition(async () => {
      try {
        const result = await saveLesson({ lessonSlug: lesson.slug, answer, checked, choice });
        if (!result.ok) { setError(result.error); return; }
        try { sessionStorage.removeItem(draftKey); } catch { /* Optional draft cleanup. */ }
        moved.current = true; setSuccess(true); router.refresh();
      } catch { setError("Não foi possível salvar. Sua resposta continua aqui. Tente novamente."); }
    });
  }
  const section = lesson.sections[step];
  const title = section?.title ?? (step === practiceStep ? "Agora, pratique" : step === exampleStep ? "Veja um exemplo" : "Confira o que aprendeu");
  const stage = step < exampleStep ? (lesson.presentation ? "Aula" : "Conceito") : step === practiceStep ? "Prática" : step === exampleStep ? "Exemplo" : "Revisão";

  return <div className={`lesson-session${section?.reading && !success ? " session-foundation" : ""}${step === practiceStep && !success && !archived ? " session-practice" : ""}`}>
    <div className="session-top"><Link href="/modulos"><ArrowLeft size={16}/>Minha trilha</Link><span>{archived ? "Versão anterior" : `Dia ${day.number} de ${totalDays}`}{saved && " · Concluído"}</span></div>
    <header className="session-header"><h1>{!archived && `Dia ${day.number}: `}{lesson.title}</h1><span><Clock3 size={14}/>{lesson.minutes} min{lesson.presentation && (lesson.sections[0]?.reading ? " · Leitura, exploração e prática" : " · Slides, leitura e prática")}</span></header>
    {archived && <p className="session-archive-note">Esta aula pertence ao básico anterior. Seu exercício foi preservado e não conta como conclusão das novas aulas.</p>}
    {!success ? <>
      <div className="session-progress"><div><span>{stage}</span><span>Etapa {step + 1} de {totalSteps}</span></div><progress value={step + 1} max={totalSteps} aria-label="Etapa atual da aula"/></div>
      <LessonStageNavigation stages={stages} current={step} disabled={!ready || pending} onSelect={goTo}/>
      <article className="session-content" aria-labelledby="step-title">
        <h2 ref={heading} id="step-title" tabIndex={-1}>{title}</h2>
        {section?.reading && <FoundationReading key={`${lesson.slug}:${step}`} body={section.body} reading={section.reading} prompt={section.prompt}/>}
        {section?.slide && !section.reading && <figure className="session-slide">
          <Image src={section.slide.src} alt={section.slide.alt} width={1600} height={900} unoptimized className="session-slide-image"/>
          <figcaption><span>Slide {step + 1} de {lesson.sections.length}</span><Dialog><DialogTrigger asChild><button type="button" className="text-link">Ampliar slide</button></DialogTrigger><DialogContent className="slide-dialog" aria-describedby={undefined}><DialogTitle className="sr-only">{section.title}</DialogTitle><Image src={section.slide.src} alt={section.slide.alt} width={1600} height={900} unoptimized className="session-slide-image"/></DialogContent></Dialog></figcaption>
        </figure>}
        {section && !section.reading && <p className="session-reading">{section.body}</p>}
        {section?.prompt && !section.reading && <div className="session-example session-slide-prompt"><p className="example-caption">Pedido para experimentar</p><blockquote>{section.prompt}</blockquote></div>}
        {!lesson.presentation && step === exampleStep && <div className="session-example">
          {lesson.example.before && <p className="example-before">Pedido vago: “{lesson.example.before}”</p>}
          <blockquote>{lesson.example.after}</blockquote><p className="example-caption">{lesson.example.caption}</p>
        </div>}
        {step === practiceStep && <>
          <p className="practice-intro">Siga o roteiro, experimente e registre o que aprendeu. Você não precisa chegar a uma resposta perfeita.</p>
          <div className={`practice-workspace${archived ? " practice-workspace-archived" : ""}`}>
          <aside className="practice-guide" aria-labelledby="practice-guide-title">
            <span className="practice-eyebrow">01 · Entenda a tarefa</span><h3 id="practice-guide-title">Seu roteiro</h3>
            <ol>{lesson.steps.map(task => <li key={task}>{task}</li>)}</ol>
            <div className="practice-goal"><h4>O que você vai registrar</h4><p>{lesson.task}</p></div>
            <a className="text-link" href="#practice-record">Ir para meu registro <ArrowRight size={15} aria-hidden="true"/></a>
            <p className="practice-alternative">Já praticou em outra ferramenta? Pode seguir direto para o registro.</p>
          </aside>
          {!archived && <PracticeChat key={`${userId}:${lesson.slug}`} lessonSlug={lesson.slug} storageKey={`emada:chat-draft:${userId}:${lesson.slug}`} starter={lesson.example.after} onUseTranscript={text => {
            const combined = [answer, text].filter(Boolean).join("\n\n");
            if (combined.length > 12000) { setError("A conversa ultrapassa o limite do registro. Copie apenas os trechos relevantes do histórico e acrescente sua avaliação."); return false; }
            setAnswer(combined); setError("");
            requestAnimationFrame(() => { recordInput.current?.focus({ preventScroll: true }); recordInput.current?.scrollIntoView({ behavior: "instant", block: "center" }); });
            return true;
          }}/>}
          </div>
          <section id="practice-record" className="practice-record" aria-labelledby="practice-record-title">
            <div className="practice-record-heading"><span className="practice-eyebrow">03 · Reflita</span><h3 id="practice-record-title">Seu registro de aprendizado</h3><p>Este espaço é seu, não é outra mensagem para a IA. Anote o que funcionou, o que faltou e o que você conferiu.</p><p className="practice-draft-note">Rascunho nesta aba. O registro é salvo na sua conta ao concluir a aula.</p></div>
            <div className="practice-record-fields"><label className="field-label" htmlFor="day-answer">{lesson.task}</label><Textarea ref={recordInput} id="day-answer" name="day-answer" value={answer} onChange={e => setAnswer(e.target.value)} placeholder={lesson.placeholder} maxLength={12000} aria-describedby="answer-help"/>
            <p className="help-text" id="answer-help">{answer.trim().length < 30 ? `Escreva pelo menos 30 caracteres. Faltam ${30 - answer.trim().length}.` : `${answer.length.toLocaleString("pt-BR")} / 12.000 caracteres · mínimo preenchido.`}</p>
            <fieldset className="practice-checks"><legend>Antes de seguir, confirme o que fez <span>{checked.length}/{lesson.steps.length}</span></legend><div className="exercise-checklist">{lesson.steps.map((task, i) => <label key={task}><input type="checkbox" checked={checked.includes(i)} onChange={e => setChecked(e.target.checked ? [...checked, i] : checked.filter(n => n !== i))}/><span>{task}</span></label>)}</div></fieldset>
            </div>
          </section>
        </>}
        {step === quizStep && <fieldset className="session-quiz"><legend>{lesson.quiz.question}</legend><div className="quiz-options">{lesson.quiz.options.map((option, i) => <label className={choice === i ? "selected" : ""} key={option}><input type="radio" name="day-quiz" checked={choice === i} onChange={() => { setChoice(i); setReviewed(false); }}/><span>{option}</span></label>)}</div>
          {reviewed && <p className="quiz-feedback" role="status"><strong>{correct ? "Isso mesmo. " : "Tente novamente. "}</strong>{lesson.quiz.explanation}</p>}
        </fieldset>}
        {step === quizStep && !practiceReady && <aside className="session-review-reminder"><p>Você pode responder à revisão agora. Para concluir a aula, também precisa preencher seu registro e confirmar as tarefas da prática.</p><Button type="button" variant="outline" disabled={!ready || pending} onClick={() => goTo(practiceStep)}>Completar a prática<ArrowRight size={16} aria-hidden="true"/></Button></aside>}
      </article>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="session-controls"><Button variant="ghost" disabled={step === 0 || pending || !ready} onClick={() => goTo(step - 1)}><ArrowLeft size={16}/>Voltar</Button>
        {step < quizStep ? <Button disabled={!ready || pending} onClick={() => goTo(step + 1)}>{step === practiceStep - 1 ? "Praticar" : step === practiceStep ? "Ir para a revisão" : "Continuar"}<ArrowRight size={16}/></Button>
          : reviewed && correct ? <Button disabled={pending || !practiceReady} onClick={save}>{pending ? <LoaderCircle className="animate-spin" size={16}/> : <Check size={16}/>} {pending ? "Salvando…" : saved ? "Salvar revisão" : archived ? "Concluir aula anterior" : `Concluir dia ${day.number}`}</Button>
          : <Button disabled={choice === null} onClick={() => setReviewed(true)}>Conferir resposta<ArrowRight size={16}/></Button>}
      </div>
      {step === practiceStep && !practiceReady && <p className="session-hint">Você pode explorar as etapas. Para concluir a aula, preencha o registro e confirme as tarefas.</p>}
      <details className="session-sources"><summary>{lesson.presentation ? "Material de apoio" : "Fontes da aula"}</summary>{lesson.presentation && <><a href={lesson.presentation.download} download>Baixar apresentação-resumo editável (.pptx)</a><p>{lesson.presentation.attribution}</p></>}{lesson.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>)}</details>
    </> : <section className="session-success"><Check size={36}/><h2 ref={heading} tabIndex={-1}>{archived ? "Aula anterior salva." : `Dia ${day.number} concluído.`}</h2><p>Seu exercício e seu progresso foram salvos.</p>{next ? <><p>Próximo: Dia {next.number} · {next.title}</p><Button asChild><Link href={`/aprender/${next.slug}`}>Ir para o dia {next.number}<ArrowRight size={16}/></Link></Button></> : <><p>Você completou a trilha. Hora de aplicar o que aprendeu.</p><Button asChild><Link href="/laboratorio">Abrir laboratório<ArrowRight size={16}/></Link></Button></>}<Link className="text-link" href="/modulos">Voltar à timeline</Link></section>}
  </div>;
}

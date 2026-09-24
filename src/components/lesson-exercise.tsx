"use client";
/* eslint-disable react-hooks/set-state-in-effect -- hydrate a tab-local draft after mount. */
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Lesson } from "@/lib/curriculum";
import type { ProgressRecord } from "@/lib/progress";
import { saveLesson } from "@/app/actions/progress";
export function LessonExercise({ lesson, userId, saved, nextSlug }: { lesson: Lesson; userId: string | null; saved?: ProgressRecord; nextSlug?: string }) {
  const draftKey = `emada:draft:${userId ?? "visitante"}:${lesson.slug}`;
  const [answer, setAnswer] = useState(saved?.answer ?? ""); const [checked, setChecked] = useState<number[]>(saved?.checked ?? []); const [choice, setChoice] = useState<number | null>(saved?.choice ?? null);
  const [reviewed, setReviewed] = useState(Boolean(saved)); const [status, setStatus] = useState(""); const [success, setSuccess] = useState(Boolean(saved)); const [pending, startTransition] = useTransition();
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    // Restore a tab-local draft without sharing answers across accounts or browser sessions.
    try { const draft = sessionStorage.getItem(draftKey); if (draft && !saved) { const parsed = JSON.parse(draft); if (typeof parsed.answer === "string") setAnswer(parsed.answer); if (Array.isArray(parsed.checked)) setChecked(parsed.checked.filter((n: unknown) => Number.isInteger(n))); if (Number.isInteger(parsed.choice)) setChoice(parsed.choice); } } catch { /* Storage may be unavailable in privacy modes. */ }
    setDraftReady(true);
  }, [draftKey, saved]);
  useEffect(() => { if (!draftReady) return; try { sessionStorage.setItem(draftKey, JSON.stringify({ answer, checked, choice })); } catch { /* The server save remains available. */ } }, [draftReady, draftKey, answer, checked, choice]);
  const allChecked = lesson.steps.every((_, i) => checked.includes(i)); const correct = choice === lesson.quiz.answer;
  function save() { startTransition(async () => { const result = await saveLesson({ lessonSlug: lesson.slug, answer, checked, choice }); setSuccess(result.ok); setStatus(result.ok ? "Capítulo concluído. Seu exercício foi salvo na sua conta." : result.error); }); }
  return <section className="exercise" id="pratica"><h2>Aprender é colocar em prática.</h2><div className="exercise-checklist">{lesson.steps.map((step, i) => <label key={step}><input type="checkbox" checked={checked.includes(i)} onChange={e => { setChecked(e.target.checked ? [...checked, i] : checked.filter(n => n !== i)); setSuccess(false); }}/><span>{step}</span></label>)}</div>
    <label className="field-label" htmlFor="exercise-answer">{lesson.task}</label><Textarea id="exercise-answer" placeholder={lesson.placeholder} value={answer} onChange={e => { setAnswer(e.target.value); setSuccess(false); }} maxLength={12000}/><p className="help-text">Registre seu raciocínio, usando dados fictícios. Mínimo de 30 caracteres. A resposta escrita é uma autoavaliação; a plataforma confere as etapas e a pergunta de revisão.</p>
    <fieldset className="quiz"><legend>{lesson.quiz.question}</legend><div className="quiz-options">{lesson.quiz.options.map((option, i) => <label key={option} className={choice === i ? "selected" : ""}><input type="radio" name={`quiz-${lesson.slug}`} checked={choice === i} onChange={() => { setChoice(i); setReviewed(false); setSuccess(false); }}/><span>{option}</span></label>)}</div><Button variant="outline" size="sm" className="mt-4" disabled={choice === null} onClick={() => setReviewed(true)}>Conferir resposta</Button>{reviewed && <p className="quiz-feedback" role="status"><strong>{correct ? "Isso mesmo. " : "Vamos rever. "}</strong>{lesson.quiz.explanation}</p>}</fieldset>
    {!userId && <p className="exercise-status">Seu rascunho fica nesta aba. Entre na sua conta para salvar o exercício e o progresso.</p>}
    <div className="exercise-footer">{userId ? <Button disabled={!allChecked || answer.trim().length < 30 || !correct || !reviewed || pending} onClick={save}>{pending ? <LoaderCircle size={16} className="animate-spin"/> : <Check size={16}/>} {saved ? "Salvar revisão" : "Concluir capítulo"}</Button> : <Button asChild><Link href={`/entrar?next=${encodeURIComponent(`/aprender/${lesson.slug}`)}`}>Entrar e salvar progresso <ArrowRight size={15}/></Link></Button>}{success && nextSlug && <Button variant="outline" asChild><Link href={`/aprender/${nextSlug}`}>Próximo capítulo <ArrowRight size={15}/></Link></Button>}{success && !nextSlug && <Button variant="outline" asChild><Link href="/progresso">Ver minha jornada <ArrowRight size={15}/></Link></Button>}</div>{status && <p className={`mt-4 ${success ? "success-text" : "error-text"}`} role="status">{status}</p>}
  </section>;
}

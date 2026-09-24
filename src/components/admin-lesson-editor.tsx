"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Eye, Pencil, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FoundationDiagram, FoundationReading } from "@/components/foundation-reading";
import { applyLessonText, lessonTextGroups, validateTextOverrides, type LessonEditorState, type LessonTextField, type TextOverrides } from "@/lib/lesson-editor";
import type { Lesson } from "@/lib/curriculum";
import type { LearningDiagram } from "@/lib/foundation-types";

function same(a: TextOverrides, b: TextOverrides) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every(key => a[key] === b[key]);
}
export function AdminLessonEditor({ base, initial, day }: { base: Lesson; initial: LessonEditorState; day: number }) {
  const groups = useMemo(() => lessonTextGroups(base), [base]);
  const [saved, setSaved] = useState(initial);
  const [texts, setTexts] = useState(initial.draft);
  const [groupId, setGroupId] = useState("general");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const dirty = !same(texts, saved.draft);
  const unpublished = !same(texts, saved.published);
  const edited = useMemo(() => applyLessonText(base, texts), [base, texts]);
  const selected = groups.find(group => group.id === groupId)!;
  const diagram = groupId.startsWith("section-") ? edited.sections[Number(groupId.slice(8))]?.reading?.diagram : undefined;
  const diagramFields = selected.fields.filter(field => field.path.includes(".reading.diagram."));
  const count = Object.keys(texts).filter(key => texts[key] !== saved.published[key]).length + Object.keys(saved.published).filter(key => !(key in texts)).length;

  useEffect(() => {
    if (!dirty) return;
    function unload(event: BeforeUnloadEvent) { event.preventDefault(); }
    function follow(event: MouseEvent) {
      const link = (event.target as Element).closest?.("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download") || link.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("Há alterações não salvas. Quer sair e descartá-las?")) { event.preventDefault(); event.stopPropagation(); }
    }
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", follow, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", follow, true); };
  }, [dirty]);

  function change(path: string, value: string, original: string) {
    setTexts(previous => { const next = { ...previous }; if (value === original) delete next[path]; else next[path] = value; return next; });
    setNotice(""); setError(""); setConfirmPublish(false);
  }
  async function save(operation: "draft" | "publish") {
    if (busy) return;
    setError(""); setNotice("");
    try { validateTextOverrides(base, texts); }
    catch (error) { setError(error instanceof Error ? error.message : "Confira os campos."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/lessons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: base.slug, version: saved.version, texts, operation }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSaved(result.state); setTexts(result.state.draft); setConfirmPublish(false);
      setNotice(operation === "publish" ? "Alterações publicadas. Os alunos verão os novos textos ao abrir ou atualizar a aula." : "Rascunho salvo. A aula dos alunos não foi alterada.");
    } catch (error) { setError(error instanceof Error ? error.message : "Falha ao salvar. Seus textos continuam aqui."); }
    finally { setBusy(false); }
  }
  async function reload() {
    if (dirty && !window.confirm("Recarregar vai substituir suas alterações não salvas. Copiou o que deseja preservar?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/lessons?lesson=${encodeURIComponent(base.slug)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSaved(result.state); setTexts(result.state.draft); setConfirmPublish(false); setNotice("Versão salva carregada.");
    } catch { setError("Não foi possível carregar. Seus textos foram mantidos."); }
    finally { setBusy(false); }
  }
  function renderField(field: LessonTextField) {
    const value = texts[field.path] ?? field.value;
    const id = `edit-${field.path}`;
    const invalid = value.length > field.max || (!field.optional && !value.trim());
    return <div className="editor-field" key={field.path}>
      <label htmlFor={id}>{field.label}</label>
      {field.multiline ? <Textarea id={id} value={value} rows={Math.min(12, Math.max(3, Math.ceil(value.length / 100)))} maxLength={field.max} aria-invalid={invalid} aria-describedby={`${id}-help`} onChange={event => change(field.path, event.target.value, field.value)}/> : <Input id={id} value={value} maxLength={field.max} aria-invalid={invalid} aria-describedby={`${id}-help`} onChange={event => change(field.path, event.target.value, field.value)}/>}
      <div className="editor-field-help" id={`${id}-help`}><span>{value.length.toLocaleString("pt-BR")} / {field.max.toLocaleString("pt-BR")}{invalid && " · preencha este campo"}</span>{value !== field.value && <button type="button" onClick={() => { if (window.confirm("Restaurar o texto original deste campo no rascunho?")) change(field.path, field.value, field.value); }}>Restaurar original</button>}</div>
    </div>;
  }
  return <div className="lesson-editor">
    <Link className="text-link" href="/admin/aulas"><ArrowLeft size={16}/>Todas as aulas</Link>
    <header className="editor-heading"><div><p className="editor-eyebrow">Administração · Dia {day}</p><h1>{edited.title || base.title}</h1><p>Edite por etapa. Salve para continuar depois ou publique quando estiver pronta.</p></div><a className="text-link" href={`/aprender/${base.slug}`} target="_blank" rel="noreferrer">Ver aula publicada<ArrowUpRight size={16}/></a></header>
    <div className="editor-toolbar">
      <div className="editor-save-state"><strong>{dirty ? "Alterações não salvas" : !same(saved.draft, saved.published) ? "Rascunho salvo · não publicado" : "Textos publicados"}</strong><span>{saved.updatedAt ? `Último salvamento: ${new Date(saved.updatedAt).toLocaleString("pt-BR")}` : "Versão original da aula"}</span></div>
      <div className="editor-actions"><Button type="button" variant="outline" disabled={busy || !dirty} onClick={() => save("draft")}><Save size={16}/>{busy ? "Aguarde…" : "Salvar rascunho"}</Button><Button type="button" disabled={busy || !unpublished} onClick={() => { setConfirmPublish(true); setError(""); }}><Send size={16}/>Publicar alterações</Button></div>
    </div>
    {notice && <p className="editor-notice" role="status">{notice}</p>}
    {error && <div className="editor-error" role="alert"><p>{error}</p><button type="button" className="text-link" disabled={busy} onClick={reload}>Recarregar versão salva</button><p>Antes de recarregar, copie os textos que quiser preservar.</p></div>}
    {confirmPublish && <section className="editor-confirm" aria-label="Confirmar publicação"><h2>Publicar {count} campo(s) alterado(s)?</h2><p>Isso atualiza os textos para todos os alunos. As apresentações para download não são regeneradas pelo editor.</p><div className="editor-actions"><Button disabled={busy} onClick={() => save("publish")}>Confirmar publicação</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirmPublish(false)}>Continuar editando</Button></div></section>}
    <div className="editor-workspace">
      <aside className="editor-sidebar"><label htmlFor="editor-stage">Etapa da aula</label><select id="editor-stage" value={groupId} onChange={event => setGroupId(event.target.value)}>{groups.map(group => <option key={group.id} value={group.id}>{group.title}</option>)}</select><nav aria-label="Conteúdo para editar">{groups.map(group => <button type="button" key={group.id} aria-current={group.id === groupId ? "step" : undefined} onClick={() => setGroupId(group.id)}>{group.title}</button>)}</nav><p>Texto simples, sem HTML. Links, imagens e estrutura ficam preservados.</p></aside>
      <section className="editor-panel" aria-labelledby="editor-panel-title">
        <header className="editor-panel-heading"><h2 id="editor-panel-title">{selected.title}</h2><div role="group" aria-label="Modo do editor"><button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}><Pencil size={15}/>Editar</button><button type="button" aria-pressed={preview} onClick={() => setPreview(true)}><Eye size={15}/>Prévia</button></div></header>
        {preview ? <div className="editor-preview"><p className="editor-preview-note">Prévia do rascunho · nada é enviado ao chat ou salvo no progresso.</p><LessonTextPreview lesson={edited} groupId={groupId}/></div> : <fieldset className="editor-fields" disabled={busy}><legend className="sr-only">Textos de {selected.title}</legend>
          {groupId === "quiz" && <p className="editor-note">A alternativa correta fica na mesma posição para preservar os exercícios salvos. Ao reescrever, mantenha o sentido da pergunta e das respostas.</p>}
          {groupId === "material" && <p className="editor-note">Você edita a descrição, não o arquivo PowerPoint. Os slides para download continuam na versão existente.</p>}
          {selected.fields.map(field => {
            if (diagram && diagramFields.includes(field)) return field === diagramFields[0] ? <AdminDiagramEditor key={groupId} diagram={diagram} fields={diagramFields} renderField={renderField}/> : null;
            return renderField(field);
          })}
        </fieldset>}
      </section>
    </div>
  </div>;
}

function AdminDiagramEditor({ diagram, fields, renderField }: { diagram: LearningDiagram; fields: LessonTextField[]; renderField: (field: LessonTextField) => ReactNode }) {
  const [part, setPart] = useState("general");
  const visibleFields = fields.filter(field => part === "general" ? !field.path.includes(".nodes.") : field.path.includes(`.nodes.${part}.`));
  return <section className="editor-diagram" aria-labelledby="editor-diagram-title">
    <header className="editor-diagram-heading"><h3 id="editor-diagram-title">Edite o diagrama vendo o resultado</h3><p>Escolha uma parte e ajuste o texto. A prévia muda enquanto você digita; nada é publicado automaticamente.</p></header>
    <div className="editor-diagram-workspace">
      <div className="editor-diagram-controls">
        <label htmlFor="editor-diagram-part">Parte do diagrama</label>
        <select id="editor-diagram-part" value={part} onChange={event => setPart(event.target.value)}>
          <option value="general">Título e legenda</option>
          {diagram.nodes.map((node, index) => <option key={index} value={String(index)}>Bloco {index + 1} · {node.title || "Sem título"}</option>)}
        </select>
        <div className="editor-diagram-fields">{visibleFields.map(renderField)}</div>
      </div>
      <div className="editor-diagram-preview">
        <p className="editor-diagram-preview-label"><Eye size={15} aria-hidden="true"/>Prévia ao vivo · rascunho</p>
        <div className="editor-diagram-canvas foundation-reading" role="region" aria-label="Prévia do diagrama; role para ver todos os blocos" tabIndex={0}>
          <FoundationDiagram diagram={diagram}/>
        </div>
      </div>
    </div>
  </section>;
}

function LessonTextPreview({ lesson, groupId }: { lesson: Lesson; groupId: string }) {
  if (groupId.startsWith("section-")) {
    const section = lesson.sections[Number(groupId.slice(8))];
    return <article><h2>{section.title}</h2>{section.reading ? <FoundationReading body={section.body} reading={section.reading} prompt={section.prompt}/> : <><p>{section.body}</p>{section.prompt && <blockquote>{section.prompt}</blockquote>}</>}</article>;
  }
  if (groupId === "general") return <article><h2>{lesson.title}</h2><p>{lesson.intro}</p><p>{lesson.minutes} minutos · {lesson.sections.length} etapas de conteúdo</p></article>;
  if (groupId === "practice") return <article><h2>Agora, pratique</h2><ol>{lesson.steps.map((step, i) => <li key={i}>{step}</li>)}</ol><h3>Pedido sugerido no chat</h3>{lesson.example.before && <p>Pedido vago: {lesson.example.before}</p>}<blockquote>{lesson.example.after}</blockquote><p>{lesson.example.caption}</p><h3>Seu registro de aprendizado</h3><p>{lesson.task}</p><p className="editor-note">{lesson.placeholder}</p></article>;
  if (groupId === "quiz") return <article><h2>{lesson.quiz.question}</h2><ol>{lesson.quiz.options.map((option, i) => <li key={i}>{option}{i === lesson.quiz.answer && <strong> · correta</strong>}</li>)}</ol><h3>Explicação</h3><p>{lesson.quiz.explanation}</p></article>;
  return <article><h2>Material de apoio</h2>{lesson.presentation && <p>{lesson.presentation.attribution}</p>}{lesson.sources.map(source => <p key={source.url}>{source.label}</p>)}</article>;
}

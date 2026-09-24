"use client";
/* eslint-disable react-hooks/set-state-in-effect -- restore a user-scoped session draft after hydration. */
import { useEffect, useRef, useState } from "react";
import { ArrowDown, Check, LoaderCircle, Plus, RotateCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMarkdown } from "@/components/chat-markdown";
import { PRACTICE_LIMITS as L, type PracticeState } from "@/lib/practice-policy";

type Props = { lessonSlug: string; storageKey: string; starter: string; onUseTranscript: (text: string) => boolean };
export function PracticeChat({ lessonSlug, storageKey, starter, onUseTranscript }: Props) {
  const [state, setState] = useState<PracticeState | null>(null);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [imported, setImported] = useState("");
  const [aboveLatest, setAboveLatest] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const retry = useRef<{ signature: string; requestId: string } | null>(null);
  const startRetry = useRef<string | null>(null);
  const history = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const followLatest = useRef(true);
  const conversation = state?.conversations.find(item => item.id === selected) ?? state?.conversations.at(-1);
  const remaining = Math.min(L.messagesPerConversation - (conversation?.turns.length ?? 0), state?.remaining.messagesLesson ?? L.messagesPerLesson, state?.remaining.messagesDay ?? L.messagesPerDay);
  const canSend = Boolean(draftReady && state?.available && (conversation || state.remaining.conversations > 0) && remaining > 0 && state.remaining.tokensLesson >= L.requestTokenReservation && state.remaining.tokensDay >= L.requestTokenReservation);
  const completed = conversation?.turns.filter(turn => turn.status === "done") ?? [];
  const transcriptVersion = completed.map(turn => turn.id).join(":");
  const latest = conversation?.turns.at(-1);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (typeof draft.message === "string") setMessage(draft.message.slice(0, L.maxMessageChars));
        if (typeof draft.selected === "string") setSelected(draft.selected);
        if (typeof draft.imported === "string") setImported(draft.imported);
        if (typeof draft.retry?.signature === "string" && typeof draft.retry?.requestId === "string") retry.current = draft.retry;
        if (typeof draft.startId === "string") startRetry.current = draft.startId;
      }
    } catch { /* Chat remains usable if browser storage is unavailable. */ }
    setDraftReady(true);
  }, [storageKey]);
  useEffect(() => {
    if (!draftReady) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ message, selected, imported, retry: retry.current, startId: startRetry.current })); } catch { /* Optional local draft. */ }
  }, [storageKey, message, selected, imported, busy, draftReady]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/practice-chat?lesson=${encodeURIComponent(lessonSlug)}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
      .then(data => setState(data.state))
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Não foi possível carregar o chat."); });
    return () => controller.abort();
  }, [lessonSlug]);
  useEffect(() => {
    if (followLatest.current && history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [conversation?.id, latest?.id, latest?.status, sending]);

  async function refresh() {
    const response = await fetch(`/api/practice-chat?lesson=${encodeURIComponent(lessonSlug)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setState(data.state);
  }
  async function update() {
    setBusy(true); setError("");
    try { await refresh(); } catch { setError("Não foi possível atualizar. Tente novamente em alguns instantes."); } finally { setBusy(false); }
  }
  async function startConversation() {
    startRetry.current ??= crypto.randomUUID();
    const response = await fetch("/api/practice-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "start", lessonSlug, requestId: startRetry.current }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível abrir a conversa.");
    setState(data.state); setSelected(data.conversationId); startRetry.current = null;
    return data.conversationId as string;
  }
  async function submit(operation: "start" | "send") {
    if (busy) return;
    if (operation === "send" && !message.trim()) { setError("Escreva um pedido ou use o exemplo para começar."); composer.current?.focus(); return; }
    setBusy(true); setSending(operation === "send"); setError(""); setNotice(""); followLatest.current = true;
    try {
      if (operation === "start") { await startConversation(); return; }
      // A first conversation opens for free; only explicit submission generates a response.
      const conversationId = conversation?.id ?? await startConversation();
      const payload = { operation, lessonSlug, conversationId, message };
      const signature = JSON.stringify(payload);
      if (retry.current?.signature !== signature) retry.current = { signature, requestId: crypto.randomUUID() };
      const requestId = retry.current.requestId;
      // Persist the request ID before network activity so a reload cannot duplicate spending.
      try { sessionStorage.setItem(storageKey, JSON.stringify({ message, selected: conversationId, imported, retry: retry.current })); } catch { /* Server idempotency still applies within this session. */ }
      const response = await fetch("/api/practice-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, requestId }) });
      const data = await response.json();
      if (!response.ok) { await refresh(); throw new Error(data.error || "Não foi possível enviar."); }
      setState(data.state); setSelected(data.conversationId);
      const turn = (data.state as PracticeState).conversations.find(item => item.id === conversationId)?.turns.find(item => item.id === requestId);
      if (turn?.status !== "done") throw new Error("A tentativa ainda não tem uma resposta confirmada. Atualize o histórico. Seu pedido foi mantido aqui.");
      retry.current = null; setMessage("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível confirmar o envio. Atualize o histórico antes de tentar novamente.");
    } finally { setBusy(false); setSending(false); }
  }
  function useTranscript() {
    const text = completed.map(turn => `Meu pedido: ${turn.prompt}\nResposta da IA: ${turn.reply}`).join("\n\n");
    if (onUseTranscript(text)) { setImported(transcriptVersion); setNotice("Conversa incluída no registro. Acrescente sua avaliação com suas palavras."); }
    else setNotice("A conversa é grande demais para o registro. Copie apenas os trechos relevantes.");
  }

  return <section className="practice-chat" aria-labelledby="practice-chat-title">
    <header className="chat-heading"><div><span className="practice-eyebrow">02 · Experimente</span><h3 id="practice-chat-title">Converse com a IA</h3></div><span className="chat-model">Gemini 2.5 Flash Lite</span></header>
    <p className="chat-safety">Use dados fictícios. A IA pode errar — confira o que receber.</p>
    {state && <>
      <div className="chat-toolbar">
        <div className="chat-conversations" role="group" aria-label="Conversas desta aula">{state.conversations.map((item, i) => <button type="button" key={item.id} aria-pressed={conversation?.id === item.id} disabled={busy} onClick={() => { setSelected(item.id); setError(""); setNotice(""); followLatest.current = true; }}>Conversa {i + 1}</button>)}{!conversation && <span>Primeira conversa</span>}</div>
        <div className="chat-tools">{conversation && state.remaining.conversations > 0 && <button type="button" className="chat-tool" disabled={busy || !state.available} onClick={() => submit("start")}><Plus size={16} aria-hidden="true"/>Nova conversa</button>}<button type="button" className="chat-tool chat-refresh" aria-label="Atualizar histórico" title="Atualizar histórico" disabled={busy} onClick={update}><RotateCw size={16} aria-hidden="true"/></button></div>
      </div>
      {!state.available && <p className="chat-notice" role="status">{state.reason}</p>}
      <div ref={history} className={`chat-history${conversation?.turns.length ? " has-messages" : ""}`} role="log" tabIndex={0} aria-label="Histórico da prática" aria-live="polite" aria-relevant="additions text" onScroll={() => {
        const el = history.current; if (!el) return;
        const above = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
        followLatest.current = !above; setAboveLatest(above);
      }}>
        {!conversation?.turns.length && !sending && <div className="chat-empty"><h4>Comece com uma tarefa sua.</h4><p>Explique o que precisa, leia a resposta e peça um ajuste. Use o roteiro desta prática como guia.</p><details className="chat-starter"><summary>Precisa de uma ideia para o primeiro pedido?</summary><blockquote>{starter}</blockquote><button type="button" className="text-link" disabled={busy || !canSend || Boolean(message)} onClick={() => { setMessage(starter.slice(0, L.maxMessageChars)); composer.current?.focus(); }}>Usar este exemplo</button><small>O exemplo vai para o campo de mensagem. Adapte antes de enviar.</small></details></div>}
        {conversation?.turns.map(turn => <div className="chat-turn" key={turn.id}><div className="chat-message chat-user"><span className="chat-author">Você</span><p>{turn.prompt}</p></div>{turn.reply ? <div className="chat-message chat-assistant"><span className="chat-author">IA <span>· confira esta resposta</span></span><ChatMarkdown text={turn.reply}/>{turn.contextTrimmed && <small>Para economizar tokens, esta resposta usou apenas o trecho mais recente da conversa.</small>}</div> : <p className="chat-notice">{turn.status === "pending" ? "Resposta ainda não confirmada. Use “Atualizar histórico” antes de reenviar." : "Não recebemos uma resposta nesta tentativa. Ela conta no limite de mensagens."}</p>}</div>)}
        {sending && <p className="chat-thinking" role="status"><LoaderCircle size={16} className="animate-spin" aria-hidden="true"/>A IA está preparando a resposta…</p>}
      </div>
      {aboveLatest && <button type="button" className="chat-latest" onClick={() => { if (history.current) history.current.scrollTop = history.current.scrollHeight; followLatest.current = true; }}><ArrowDown size={14} aria-hidden="true"/>Ver mensagens recentes</button>}
      <form className="chat-composer" onSubmit={event => { event.preventDefault(); if (canSend) void submit("send"); }}>
        <div className="chat-compose-label"><label htmlFor="practice-message">Sua mensagem para a IA</label><span>{remaining} de {L.messagesPerConversation} envios disponíveis</span></div>
        <Textarea ref={composer} id="practice-message" name="practice-message" value={message} disabled={busy || !canSend} onChange={event => { setMessage(event.target.value); setError(""); }} maxLength={L.maxMessageChars} placeholder="Ex.: me ajude a criar um roteiro curto para uma loja fictícia…" aria-describedby="practice-message-help" aria-invalid={Boolean(error)} onKeyDown={event => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) { event.preventDefault(); if (canSend) void submit("send"); } }}/>
        <div className="chat-compose-footer"><small id="practice-message-help">{message.length.toLocaleString("pt-BR")} / 1.500<span className="chat-keyboard"> · Ctrl/⌘ + Enter envia</span></small><Button type="submit" disabled={busy || !canSend}>{sending ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true"/> : <Send size={16} aria-hidden="true"/>}{sending ? "Enviando…" : "Enviar mensagem"}</Button></div>
        {error && <p className="error-text" role="alert">{error}</p>}
        {!canSend && state.available && <p className="chat-notice">{remaining === 0 && (conversation?.turns.length ?? 0) >= L.messagesPerConversation && state.remaining.conversations > 0 && state.remaining.messagesLesson > 0 ? "Esta conversa chegou a 6 envios. Você pode abrir a segunda conversa ou seguir para seu registro." : "Sua cota disponível foi atingida. O histórico continua aqui; siga para o registro do exercício."}</p>}
      </form>
      <div className="chat-bottom"><details className="chat-usage"><summary>Limites e privacidade</summary><p>Até 2 conversas por aula, 6 envios por conversa e respostas de até 500 tokens. Restam {state.remaining.messagesLesson} envios nesta aula e {state.remaining.messagesDay} hoje.</p><p>Suas mensagens são enviadas ao OpenRouter e ao provedor do Gemini, e o histórico fica salvo na sua conta. O chat não pesquisa na web nem executa ações em outros aplicativos.</p><p>Restam {state.remaining.tokensLesson.toLocaleString("pt-BR")} tokens na aula e {state.remaining.tokensDay.toLocaleString("pt-BR")} hoje. Incluem contexto e respostas. Reservamos até {L.requestTokenReservation.toLocaleString("pt-BR")} por envio; falhas sem confirmação mantêm a reserva. A cota diária renova à meia-noite UTC; os limites da aula não reiniciam.</p></details>
      {completed.length > 0 && <button type="button" className="chat-transcript" disabled={busy || imported === transcriptVersion} onClick={useTranscript}>{imported === transcriptVersion ? <Check size={16} aria-hidden="true"/> : <ArrowDown size={16} aria-hidden="true"/>}{imported === transcriptVersion ? "Incluída no registro" : "Levar conversa para o registro"}</button>}</div>
    </>}
    {!state && !error && <div className="chat-loading" role="status"><LoaderCircle size={18} className="animate-spin" aria-hidden="true"/>Carregando seu espaço de prática…</div>}
    {!state && error && <div className="chat-notice"><p className="error-text" role="alert">{error}</p><Button type="button" variant="outline" disabled={busy} onClick={update}>Tentar carregar chat</Button></div>}
    {notice && <p className="chat-notice" role="status">{notice}</p>}
  </section>;
}

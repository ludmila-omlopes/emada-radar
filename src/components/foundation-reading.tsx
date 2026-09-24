"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowRight, Check, ChevronDown, Copy, RotateCcw } from "lucide-react";
import type { FoundationReading as Reading, LearningDiagram } from "@/lib/foundation-types";

export function FoundationDiagram({ diagram }: { diagram: LearningDiagram }) {
  const ordered = diagram.kind !== "compare";
  const List = ordered ? "ol" : "ul";
  return <figure className={`foundation-diagram diagram-${diagram.kind}`} aria-label={diagram.title}>
    <header><span className="foundation-eyebrow">Veja a ideia</span><h3>{diagram.title}</h3></header>
    <List className="diagram-nodes" role="list">{diagram.nodes.map((node, i) => <li key={i}>
      <div className="diagram-node"><span className="diagram-index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><h4>{node.title}</h4><p>{node.text}</p></div>
      {ordered && i < diagram.nodes.length - 1 && <span className="diagram-connector" aria-hidden="true"><ArrowRight className="diagram-arrow-right" size={19}/><ArrowDown className="diagram-arrow-down" size={19}/></span>}
    </li>)}</List>
    {diagram.kind === "cycle" && <div className="diagram-loop"><RotateCcw size={15} aria-hidden="true"/>Volte ao início se outro teste fizer sentido.</div>}
    <figcaption>{diagram.caption}</figcaption>
  </figure>;
}

export function FoundationReading({ body, reading, prompt }: { body: string; reading: Reading; prompt?: string }) {
  const [copyStatus, setCopyStatus] = useState("");
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(prompt ?? ""); setCopyStatus("Pedido copiado. Cole no chat quando quiser praticar."); }
    catch { setCopyStatus("Não foi possível copiar automaticamente. Selecione e copie o texto abaixo."); }
  }
  return <div className="foundation-reading">
    <div className={`foundation-opening${reading.illustration ? " has-illustration" : ""}`}>
      <div><p className="foundation-lead">{body}</p><div className="foundation-page-links"><a href="#learning-diagram">Ver diagrama<ArrowDown size={14} aria-hidden="true"/></a><a href="#learning-example">Explorar exemplo<ArrowDown size={14} aria-hidden="true"/></a></div></div>
      {reading.illustration && <figure className="foundation-illustration"><Image src={reading.illustration.src} alt={reading.illustration.alt} width={1536} height={1024} sizes="(max-width: 640px) 100vw, 440px"/><figcaption>{reading.illustration.caption}</figcaption></figure>}
    </div>
    <div className="foundation-prose">{reading.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
    <div id="learning-diagram" className="foundation-anchor"><FoundationDiagram diagram={reading.diagram}/></div>
    <section id="learning-example" className="foundation-case foundation-anchor" aria-labelledby="learning-example-title">
      <header><span className="foundation-eyebrow">Na vida real · exemplo fictício</span><h3 id="learning-example-title">{reading.example.title}</h3></header>
      <div className="foundation-case-columns"><div><h4>A situação</h4><p>{reading.example.situation}</p></div><div><h4>Uma forma de experimentar</h4><p>{reading.example.response}</p></div></div>
      <p className="foundation-case-comment"><strong>O que observar</strong>{reading.example.commentary}</p>
    </section>
    {prompt && <section className="foundation-prompt" aria-labelledby="learning-prompt-title"><div className="foundation-prompt-heading"><h3 id="learning-prompt-title">Leve para a prática</h3><button type="button" onClick={copyPrompt}><Copy size={15} aria-hidden="true"/>Copiar pedido</button></div><p>Adapte os campos ao seu exemplo fictício. Copiar não envia uma mensagem.</p><blockquote>{prompt}</blockquote><p className="foundation-copy-status" role="status">{copyStatus}</p></section>}
    <section className="foundation-reflection" aria-labelledby="learning-reflection-title"><span className="foundation-eyebrow">Uma pausa para pensar</span><h3 id="learning-reflection-title">{reading.reflection.question}</h3><p>Formule sua resposta antes de abrir. Não precisa escrever nem enviar nada.</p><details><summary>Explorar uma resposta<ChevronDown size={17} aria-hidden="true"/></summary><div>{reading.reflection.answer}</div></details></section>
    <aside className="foundation-takeaway"><Check size={20} aria-hidden="true"/><div><span className="foundation-eyebrow">Guarde esta ideia</span><p>{reading.takeaway}</p></div></aside>
  </div>;
}

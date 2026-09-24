"use client";
import { useState } from "react";
import { glossary, promptTemplates } from "@/lib/curriculum";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { CopyButton } from "./copy-button";
export function Library({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery); const [category, setCategory] = useState("Todos");
  const normalized = (value: string) => value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const items = glossary.filter(item => (category === "Todos" || item.category === category) && normalized(item.term + item.definition).includes(normalized(query)));
  return <Tabs defaultValue="glossario" className="library-tabs"><TabsList><TabsTrigger value="glossario">Glossário de IA</TabsTrigger><TabsTrigger value="prompts">Prompts para começar</TabsTrigger></TabsList><TabsContent value="glossario"><div className="filter-bar"><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar um conceito…" aria-label="Buscar conceito"/>{["Todos", "Fundamentos", "Conexões", "Automações"].map(cat => <button key={cat} className={`filter-button ${category === cat ? "selected" : ""}`} onClick={() => setCategory(cat)} aria-pressed={category === cat}>{cat}</button>)}</div>{items.length ? <div className="glossary-grid">{items.map(item => <article className="glossary-card" key={item.term}><h3>{item.term}</h3><p>{item.definition}</p></article>)}</div> : <p className="empty-text" role="status">Nenhum conceito encontrado. Tente outro termo ou selecione “Todos”.</p>}</TabsContent><TabsContent value="prompts"><p className="muted text-sm mb-7 leading-7">Um ponto de partida para adaptar ao seu contexto. Substitua os campos entre colchetes e revise o resultado.</p><div className="template-grid">{promptTemplates.map(template => <article className="template-card" key={template.title}><h3>{template.title}</h3><p>{template.text}</p><CopyButton text={template.text}/></article>)}</div></TabsContent></Tabs>;
}

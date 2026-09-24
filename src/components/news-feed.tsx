"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NewsCards } from "./news-cards";
import type { NewsItem } from "@/lib/feed-parser";
export function NewsFeed({ items }: { items: NewsItem[] }) {
  const [query, setQuery] = useState(""); const [source, setSource] = useState("Todas");
  const filtered = items.filter(item => (source === "Todas" || source === item.source) && item.title.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  return <><div className="filter-bar"><Input placeholder="Buscar nas notícias…" aria-label="Buscar notícias" value={query} onChange={e => setQuery(e.target.value)}/>{["Todas", ...new Set(items.map(item => item.source))].map(value => <button className={`filter-button ${source === value ? "selected" : ""}`} key={value} onClick={() => setSource(value)} aria-pressed={source === value}>{value}</button>)}</div>{!filtered.length && items.length > 0 ? <p className="empty-text" role="status">Nenhuma notícia para este filtro.</p> : <NewsCards items={filtered}/>}</>;
}

import { Library } from "@/components/library";
export const metadata = { title: "Biblioteca" };
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) { const { q } = await searchParams; return <div className="page-container"><div className="page-heading"><h1>Menos jargão.<br/><em>Mais repertório.</em></h1><p>Conceitos em linguagem simples e prompts para levar para o seu trabalho.<br/>Volte aqui sempre que uma sigla aparecer no caminho.</p></div><Library key={q ?? ""} initialQuery={q ?? ""}/></div>; }

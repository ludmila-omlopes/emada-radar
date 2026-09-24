import { requireAdmin } from "@/lib/session";
import { getNews } from "@/lib/news";
import { getDb } from "@/lib/db";
import { AdminNews } from "@/components/admin-news";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
export const metadata = { title: "Administração", robots: { index: false, follow: false } };
export default async function AdminPage() {
  await requireAdmin();
  const [pending, approved, rejected, sync] = await Promise.all([getNews("pending"), getNews("approved"), getNews("rejected"), getDb().query("SELECT created_at, details FROM news_sync_runs ORDER BY created_at DESC LIMIT 1")]);
  return <div className="page-container"><Link href="/admin/aulas" className="admin-content-link"><div><strong>Editar aulas</strong><span>Textos, exemplos, diagramas e exercícios · salve rascunhos e publique quando quiser.</span></div><ArrowRight size={22}/></Link><div className="page-heading"><h1>O que vale<br/><em>entrar no radar?</em></h1><p>Revise a matéria na fonte antes de aprovar. Notícias novas chegam à fila<br/>a cada coleta; rejeições e aprovações são preservadas nas próximas execuções.</p></div><AdminNews items={[...pending, ...approved, ...rejected]}/><div className="callout"><p>Coleta diária configurada para 10h UTC na Vercel. Fontes: OpenAI e Google AI.<br/>{sync.rows[0] ? `Última coleta: ${new Date(sync.rows[0].created_at).toLocaleString("pt-BR", { timeZone: "UTC" })} UTC. ${sync.rows[0].details.filter((d: { ok: boolean }) => !d.ok).length ? "Uma ou mais fontes falharam; tente uma coleta manual." : "Fontes consultadas com sucesso."}` : "Nenhuma coleta executada ainda. Use “Coletar agora” para iniciar."}</p></div></div>;
}

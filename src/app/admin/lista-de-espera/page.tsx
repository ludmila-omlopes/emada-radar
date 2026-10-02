import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ACADEMY_OWNER_EMAIL } from "@/lib/academy-access";
import { AcademyWaitlist } from "@/lib/academy-waitlist";
import { databaseConfigured, getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { CopyButton } from "@/components/copy-button";

export const metadata = { title: "Lista de espera", robots: { index: false, follow: false } };
const when = (value: Date) => `${new Date(value).toLocaleString("pt-BR", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })} UTC`;
export default async function AdminWaitlistPage() {
  await requireAdmin("/admin/lista-de-espera");
  const waitlist = databaseConfigured() ? await new AcademyWaitlist(getDb()).list().catch(() => null) : null;
  return <div className="page-container newsletter-admin">
    <Link href="/admin" className="text-link"><ArrowLeft size={16}/>Administração</Link>
    <div className="page-heading"><h1>Lista de espera<br/><em>da Academy</em></h1><p>A Academy está aberta apenas para {ACADEMY_OWNER_EMAIL}. As demais pessoas veem o formulário da lista de espera em /modulos, nas aulas e em /progresso.</p></div>
    {!waitlist ? <p className="error-text">Não foi possível ler a lista. Confira o banco e aplique a migração 009.</p> : <>
      <dl className="newsletter-admin-stats"><div><dt>Inscritos</dt><dd>{waitlist.total}</dd></div></dl>
      {waitlist.entries.length > 0 && <CopyButton label="Copiar e-mails" text={waitlist.entries.map(entry => entry.email).join("\n")}/>}
      <div className="newsletter-admin-table"><table>
        <thead><tr><th>E-mail</th><th>Idioma</th><th>Origem</th><th>Entrada</th></tr></thead>
        <tbody>{waitlist.entries.length ? waitlist.entries.map(entry => <tr key={entry.email}><td>{entry.email}</td><td>{entry.locale}</td><td>{entry.source}</td><td>{when(entry.created_at)}</td></tr>) : <tr><td colSpan={4}>Ninguém na lista ainda.</td></tr>}</tbody>
      </table></div>
    </>}
  </div>;
}

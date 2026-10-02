import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { locales } from "@/i18n/config";
import { databaseConfigured, getDb } from "@/lib/db";
import { isEmptyDigest, unsubscribeUrls } from "@/lib/newsletter";
import { buildDigests } from "@/lib/newsletter-digest";
import { digestEmail } from "@/lib/newsletter-email";
import { newsletterSettings } from "@/lib/newsletter-sender";
import { NewsletterStore } from "@/lib/newsletter-store";
import { getSession, requireAdmin } from "@/lib/session";
import { AdminNewsletterTest } from "@/components/admin-newsletter-test";

export const metadata = { title: "Newsletter", robots: { index: false, follow: false } };
const when = (value: Date | null) => value ? `${new Date(value).toLocaleString("pt-BR", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })} UTC` : "—";
function siteOrigin() {
  try { return new URL(process.env.BETTER_AUTH_URL ?? "").origin; }
  catch { return "http://localhost:3000"; }
}
export default async function AdminNewsletterPage() {
  await requireAdmin("/admin/newsletter");
  const session = await getSession();
  const settings = newsletterSettings();
  const baseUrl = settings?.baseUrl ?? siteOrigin();
  const [stats, content] = await Promise.all([
    databaseConfigured() ? new NewsletterStore(getDb()).stats().catch(() => null) : null,
    buildDigests(),
  ]);
  const previews = locales.map(locale => {
    const urls = unsubscribeUrls(baseUrl, locale, "previa");
    const email = digestEmail("previa@example.com", content[locale], { baseUrl, unsubscribePage: urls.page, oneClick: urls.oneClick });
    // Links in the preview open in a new tab instead of inside the frame.
    return { locale, subject: email.subject, html: email.html.replace("<head>", '<head><base target="_blank">') };
  });
  return <div className="page-container newsletter-admin">
    <Link href="/admin" className="text-link"><ArrowLeft size={16}/>Administração</Link>
    <div className="page-heading"><h1>Newsletter<br/><em>do Radar</em></h1><p>Resumo semanal enviado às segundas, 11h UTC (8h em Brasília). A prévia usa os dados atuais das fontes; no envio real, o conteúdo fica congelado quando a edição da semana é aberta.</p></div>
    <dl className="newsletter-admin-config">
      <div><dt>Envio</dt><dd>{settings ? "Ativo" : "Desativado. Defina NEWSLETTER_ENABLED, RESEND_API_KEY e NEWSLETTER_FROM."}</dd></div>
      <div><dt>Remetente</dt><dd>{settings?.from ?? "—"}</dd></div>
      <div><dt>Links dos e-mails</dt><dd>{baseUrl}</dd></div>
    </dl>
    {stats ? <>
      <dl className="newsletter-admin-stats">
        <div><dt>Confirmados</dt><dd>{stats.confirmed}</dd></div>
        <div><dt>Aguardando confirmação</dt><dd>{stats.pending}</dd></div>
        <div><dt>Cancelados</dt><dd>{stats.unsubscribed}</dd></div>
      </dl>
      {stats.issues.length > 0 && <div className="newsletter-admin-table"><table>
        <thead><tr><th scope="col">Edição</th><th scope="col">Aberta em</th><th scope="col">Enviados</th><th scope="col">Em andamento</th><th scope="col">Sem confirmação do provedor</th><th scope="col">Recusados</th><th scope="col">Concluída em</th></tr></thead>
        <tbody>{stats.issues.map(issue => <tr key={issue.key}><th scope="row">{issue.key}</th><td>{when(issue.createdAt)}</td><td>{issue.sent}</td><td>{issue.sending}</td><td>{issue.unconfirmed}</td><td>{issue.rejected}</td><td>{when(issue.finishedAt)}</td></tr>)}</tbody>
      </table></div>}
    </> : <p className="callout">Aplique a migração 008 (npm run db:migrate:newsletter) para ver inscritos e edições.</p>}
    <AdminNewsletterTest email={session?.user.email ?? ""} disabled={!settings || !session}/>
    {isEmptyDigest(content["pt-BR"]) && <p className="callout">As fontes não trouxeram publicações nos últimos sete dias. Com este conteúdo, a edição da semana não seria aberta.</p>}
    <div className="newsletter-previews">{previews.map(preview => <section key={preview.locale}>
      <h2>Prévia · {preview.locale}</h2>
      <p>Assunto: {preview.subject}</p>
      <iframe title={`Prévia da newsletter em ${preview.locale}`} srcDoc={preview.html} sandbox="allow-popups allow-popups-to-escape-sandbox" loading="lazy"/>
    </section>)}</div>
  </div>;
}

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { AcceptInvite } from "@/components/accept-invite";
export const metadata = { title: "Ativar administração", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams; const session = await getSession(); const valid = Boolean(token && /^[a-f0-9]{64}$/.test(token));
  return <div className="page-container"><section className="invite-card"><ShieldCheck size={30} className="pink"/><h1>Seu espaço de administração.</h1><p>{!valid ? "Abra o link privado do convite para ativar o acesso administrativo." : session ? `Você está na conta ${session.user.email}. O convite precisa estar vinculado a este e-mail para liberar a edição de aulas e a curadoria de notícias.` : "Entre ou crie sua conta com o e-mail ao qual o convite foi destinado. Depois você poderá ativar a edição de aulas e a curadoria de notícias."}</p>{valid && (session ? <AcceptInvite token={token!}/> : <Button asChild><Link href={`/entrar?next=${encodeURIComponent(`/admin/ativar?token=${token}`)}`}>Entrar ou criar conta</Link></Button>)}</section></div>;
}

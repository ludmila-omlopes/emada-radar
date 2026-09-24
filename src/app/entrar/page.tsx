import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { BookOpen, BookmarkCheck, ChartNoAxesCombined } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { authConfigured, googleAuthConfigured } from "@/lib/auth";
import { googleAuthError } from "@/lib/google-auth";
import { getSession } from "@/lib/session";
import { safeNextPath } from "@/lib/validation";
export const metadata = { title: "Entrar", robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; cadastro?: string; error?: string }> }) {
  const params = await searchParams; const next = safeNextPath(params.next);
  const googleConfigured = googleAuthConfigured();
  if (googleConfigured) {
    const canonical = new URL(process.env.BETTER_AUTH_URL!);
    const host = (await headers()).get("host");
    // OAuth state cookies must use the same loopback hostname as the callback.
    if (["localhost", "127.0.0.1"].includes(canonical.hostname) && host && /^(localhost|127\.0\.0\.1):\d+$/.test(host) && host !== canonical.host) {
      const target = new URL("/entrar", canonical);
      target.searchParams.set("next", next);
      if (params.cadastro === "1") target.searchParams.set("cadastro", "1");
      if (params.error) target.searchParams.set("error", params.error);
      redirect(target.toString());
    }
  }
  if (await getSession()) redirect(next);
  return <div className="page-container auth-layout"><div className="auth-intro"><h1>Seu próximo<br/>passo é <em>aqui.</em></h1><p>Aprenda IA com intenção. Pratique com exemplos do dia a dia e construa sua própria autonomia.</p><div className="auth-perks"><p><BookOpen size={18}/>Dois módulos completos e gratuitos</p><p><BookmarkCheck size={18}/>Seus exercícios salvos em um só lugar</p><p><ChartNoAxesCombined size={18}/>Progresso que acompanha seu ritmo</p></div></div><AuthForm configured={authConfigured()} googleConfigured={googleConfigured} next={next} initialSignup={params.cadastro === "1"} initialError={googleAuthError(params.error)}/></div>;
}

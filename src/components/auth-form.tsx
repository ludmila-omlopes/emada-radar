"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { GoogleAuthButton } from "./google-auth-button";
export function AuthForm({ configured, googleConfigured, next, initialSignup = false, initialError = "" }: { configured: boolean; googleConfigured: boolean; next: string; initialSignup?: boolean; initialError?: string }) {
  const [signup, setSignup] = useState(initialSignup); const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState(initialError); const [googleBusy, setGoogleBusy] = useState(false); const [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || googleBusy) return; setError(""); setBusy(true);
    const form = new FormData(event.currentTarget); const email = String(form.get("email")).trim(); const password = String(form.get("password"));
    try {
      const result = signup ? await authClient.signUp.email({ name: String(form.get("name")).trim(), email, password }) : await authClient.signIn.email({ email, password });
      if (result.error) { setError(result.error.status === 429 ? "Muitas tentativas. Aguarde um minuto e tente novamente." : signup ? "Não foi possível criar a conta. Confira os dados ou entre se você já tem cadastro." : "E-mail ou senha incorretos. Confira os dados e tente novamente."); return; }
      router.push(next); router.refresh();
    } catch { setError("Não foi possível conectar. Tente novamente em instantes."); }
    finally { setBusy(false); }
  }
  return <div className="auth-card"><h2>{signup ? "Crie seu espaço." : "Bom ter você por aqui."}</h2><p>{signup ? "É gratuito. Seu próximo passo começa agora." : "Entre para continuar de onde parou."}</p>
    {!configured && <div className="callout"><p>Estamos preparando o acesso às contas. O cadastro e a entrada serão liberados em breve.</p></div>}
    <GoogleAuthButton configured={googleConfigured} next={next} signup={signup} disabled={busy} onBusyChange={setGoogleBusy}/>
    <div className="auth-divider"><span>ou continue com e-mail</span></div>
    <form onSubmit={submit}>{signup && <div className="form-field"><label className="field-label" htmlFor="name">Como podemos chamar você?</label><Input id="name" name="name" placeholder="Seu nome" autoComplete="name" required minLength={2} maxLength={80} disabled={!configured || busy || googleBusy}/></div>}<div className="form-field"><label className="field-label" htmlFor="email">E-mail</label><Input id="email" name="email" type="email" placeholder="voce@exemplo.com" autoComplete="email" required maxLength={254} disabled={!configured || busy || googleBusy}/></div><div className="form-field"><label className="field-label" htmlFor="password">Senha</label><div className="password-input"><Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder={signup ? "Pelo menos 10 caracteres" : "Sua senha"} autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 10 : 1} maxLength={128} disabled={!configured || busy || googleBusy}/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>{error && <p role="alert" className="error-text">{error}</p>}<Button type="submit" disabled={busy || googleBusy || !configured}>{busy ? <LoaderCircle className="animate-spin" size={16}/> : signup ? "Criar minha conta gratuita" : "Entrar na minha conta"}{!busy && <ArrowUpRight size={16}/>}</Button></form>
    <div className="auth-switch">{signup ? "Já tem uma conta?" : "Primeira vez aqui?"}<button disabled={busy || googleBusy} onClick={() => { setSignup(!signup); setError(""); }}>{signup ? "Entrar" : "Criar conta gratuita"}</button></div><div className="auth-privacy">Seu nome, e-mail e exercícios ficam na sua conta para acompanhar o aprendizado. Não coloque dados sensíveis nos exercícios. Não enviamos suas respostas a modelos de IA.</div></div>;
}

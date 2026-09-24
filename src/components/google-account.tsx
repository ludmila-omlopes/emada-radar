import { headers } from "next/headers";
import { getAuth, googleAuthConfigured } from "@/lib/auth";
import { requireSession } from "@/lib/session";
import { googleAuthError } from "@/lib/google-auth";
import { GoogleAuthButton } from "./google-auth-button";

export async function GoogleAccount({ error }: { error?: string }) {
  const session = await requireSession();
  const accounts = await getAuth().api.listUserAccounts({ headers: await headers() });
  const connected = accounts.some(account => account.providerId === "google");
  return <section className="google-account" aria-labelledby="google-account-title">
    <div><h2 id="google-account-title">Acesso à sua conta</h2><p>{connected ? "Google conectado. Você pode entrar com Google e continuar usando esta mesma conta." : `Conecte a conta Google de ${session.user.email} para entrar sem digitar senha e manter seus exercícios.`}</p></div>
    {!connected && <GoogleAuthButton configured={googleAuthConfigured()} mode="link"/>}
    {error && <p role="alert" className="error-text">{googleAuthError(error)}</p>}
  </section>;
}

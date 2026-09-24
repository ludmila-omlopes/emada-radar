import { safeNextPath } from "./validation";

type GoogleEnvironment = { [key: string]: string | undefined; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };

export function googleProviderOptions(env: GoogleEnvironment) {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return undefined;
  return {
    clientId,
    clientSecret,
    prompt: "select_account" as const,
    accessType: "online" as const,
    includeGrantedScopes: false,
    disableSignUp: false,
    disableImplicitSignUp: false,
  };
}

export const googleAccountLinking = {
  enabled: true,
  requireLocalEmailVerified: true,
  allowDifferentEmails: false,
};

export function googleSignInPaths(next: string, signup: boolean) {
  const destination = safeNextPath(next);
  const query = new URLSearchParams({ next: destination });
  if (signup) query.set("cadastro", "1");
  return {
    callbackURL: destination,
    newUserCallbackURL: destination,
    errorCallbackURL: `/entrar?${query}`,
  };
}

export function googleAuthError(code?: string) {
  if (!code) return "";
  if (code === "access_denied") return "O acesso com Google foi cancelado. Você pode tentar novamente ou entrar com e-mail e senha.";
  if (code === "account_not_linked") return "Este e-mail já tem uma conta. Entre com sua senha e use Conectar Google em Meu progresso para manter seus exercícios.";
  if (["email_does_not_match", "LINKING_DIFFERENT_EMAILS_NOT_ALLOWED"].includes(code)) return "Escolha a conta Google com o mesmo e-mail da sua conta na Emada Academy.";
  if (code === "account_already_linked_to_different_user") return "Esta conta Google já está conectada a outra conta da Emada Academy.";
  if (["state_mismatch", "state_not_found", "state_expired", "invalid_state"].includes(code)) return "A tentativa de acesso expirou. Inicie o login com Google novamente.";
  return "Não foi possível concluir o acesso com Google. Tente novamente ou entre com e-mail e senha.";
}

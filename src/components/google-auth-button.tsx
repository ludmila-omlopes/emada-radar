"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { googleAuthError, googleSignInPaths } from "@/lib/google-auth";

type Props = {
  configured: boolean;
  next?: string;
  signup?: boolean;
  mode?: "signin" | "link";
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

export function GoogleAuthButton({ configured, next = "/progresso", signup = false, mode = "signin", disabled, onBusyChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function continueWithGoogle() {
    if (!configured || busy || disabled) return;
    setError(""); setBusy(true); onBusyChange?.(true);
    try {
      const result = mode === "link"
        ? await authClient.linkSocial({ provider: "google", callbackURL: "/progresso", errorCallbackURL: "/progresso" })
        : await authClient.signIn.social({ provider: "google", ...googleSignInPaths(next, signup) });
      if (result.error || !result.data?.url) {
        setError(result.error?.status === 429 ? "Muitas tentativas. Aguarde um minuto e tente novamente." : googleAuthError(result.error?.code ?? "unknown"));
        setBusy(false); onBusyChange?.(false);
      }
      // Better Auth navigates to Google's authorization URL on success.
    } catch {
      setError("Não foi possível conectar ao Google. Verifique sua conexão e tente novamente.");
      setBusy(false); onBusyChange?.(false);
    }
  }
  return <div className="google-auth">
    <Button type="button" variant="outline" className="google-auth-button" onClick={continueWithGoogle} disabled={!configured || disabled || busy} aria-describedby={!configured ? "google-unavailable" : undefined}>
      {busy && <LoaderCircle className="animate-spin" size={18} aria-hidden="true"/>}
      {busy ? "Abrindo Google…" : mode === "link" ? "Conectar Google" : "Continuar com Google"}
    </Button>
    {!configured && <p id="google-unavailable" className="help-text">O acesso com Google estará disponível em breve. Use e-mail e senha por enquanto.</p>}
    {error && <p role="alert" className="error-text">{error}</p>}
  </div>;
}

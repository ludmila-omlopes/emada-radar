"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acceptAdminInvite } from "@/app/actions/admin";
export function AcceptInvite({ token }: { token: string }) { const [error, setError] = useState(""); const [busy, startTransition] = useTransition(); return <><Button disabled={busy} onClick={() => startTransition(async () => { const result = await acceptAdminInvite(token); if (result) setError(result.error); })}>{busy ? "Ativando…" : "Ativar meu acesso de administradora"}</Button>{error && <p className="error-text mt-4" role="alert">{error}</p>}</>; }

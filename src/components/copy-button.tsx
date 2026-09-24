"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
export function CopyButton({ text, label = "Copiar prompt", disabled = false }: { text: string; label?: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false); const [error, setError] = useState(false);
  return <><Button variant="outline" size="sm" disabled={disabled} onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setError(false); setTimeout(() => setCopied(false), 2500); } catch { setError(true); } }}>{copied ? <Check size={14}/> : <Copy size={14}/>}<span aria-live="polite">{copied ? "Copiado!" : label}</span></Button>{error && <span role="alert" className="error-text">Não foi possível copiar. Selecione o texto da prévia e copie manualmente.</span>}</>;
}

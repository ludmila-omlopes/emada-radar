"use client";
import { useState, useTransition } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendNewsletterTest } from "@/app/actions/newsletter";

export function AdminNewsletterTest({ email, disabled }: { email: string; disabled: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();
  return <div className="newsletter-admin-test">
    <Button variant="outline" disabled={disabled || busy} onClick={() => startTransition(async () => { setMessage((await sendNewsletterTest()).message); })}>{busy ? <LoaderCircle size={15} className="animate-spin"/> : <Send size={15}/>}Enviar teste para {email}</Button>
    {message && <p className="admin-status" role="status">{message}</p>}
  </div>;
}

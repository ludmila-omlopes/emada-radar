import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen } from "lucide-react";
import { getSession } from "@/lib/session";
import { AcademyWaitlistForm } from "./academy-waitlist-form";

// Shown on Academy pages to everyone except the owner.
export async function AcademyWaitlist({ source, children }: { source: "modulos" | "aprender" | "progresso"; children?: React.ReactNode }) {
  const [t, session] = await Promise.all([getTranslations("Waitlist"), getSession()]);
  return <div className="page-container waitlist-page">
    <div className="page-heading">
      <p className="newsletter-eyebrow"><BookOpen size={14} aria-hidden="true"/>{t("eyebrow")}</p>
      <h1>{t("title")} <br/><em>{t("titleEmphasis")}</em></h1>
      <p>{t("description")}</p>
    </div>
    <AcademyWaitlistForm source={source} email={session?.user.email}/>
    <p className="waitlist-links">
      <Link className="text-link" href="/">{t("exploreRadar")}<ArrowRight size={15} aria-hidden="true"/></Link>
      {!session && <Link className="text-link" href={`/entrar?next=${encodeURIComponent("/modulos")}`}>{t("signIn")}<ArrowRight size={15} aria-hidden="true"/></Link>}
    </p>
    {children}
  </div>;
}

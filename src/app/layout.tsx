import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Geist, Space_Grotesk } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSession, isAdmin } from "@/lib/session";
import { getProgress } from "@/lib/progress";
import { getDayProgress } from "@/lib/learning-days";
import { getPublishedDays } from "@/lib/published-lessons";
import "./globals.css";
import "./portal.css";
import "./radar.css";
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", display: "swap" });
export const metadata: Metadata = { title: { default: "Emada · Seu radar de IA", template: "%s | Emada" }, description: "Um portal para profissionais de IA: rankings de modelos, notícias, vozes da comunidade e experimentos. Atualize seu repertório e compare resultados direto das fontes.", robots: { index: true, follow: true } };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const [session, progress, admin] = await Promise.all([getSession(), getProgress(), isAdmin()]);
  const lessons = (await getPublishedDays()).map(({ lesson: { slug, title, intro, minutes } }) => ({ slug, title, intro, minutes }));
  return <html lang={locale} data-scroll-behavior="smooth" className={`dark ${geist.variable} ${space.variable}`}><body><NextIntlClientProvider><TooltipProvider><AppShell user={session ? { name: session.user.name, email: session.user.email } : null} completed={getDayProgress(progress.map(p => p.lesson_slug)).count} admin={admin} lessons={lessons}>{children}</AppShell></TooltipProvider></NextIntlClientProvider></body></html>;
}

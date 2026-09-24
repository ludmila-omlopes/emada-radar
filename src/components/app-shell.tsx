"use client";
import { useTranslations, useLocale } from "next-intl";
import { stripLocale } from "@/i18n/config";
import { LanguageSelector } from "./language-selector";
import { LocaleSyncNotice } from "./locale-sync-notice";

import { useState } from "react";
import { PortalLink as Link } from "@/components/portal-link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, BookOpen, ChartNoAxesColumnIncreasing, ChevronRight, FlaskConical, Home, Library, LogOut, Menu, Newspaper, Search, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { authClient } from "@/lib/auth-client";
import { glossary, type Lesson } from "@/lib/curriculum";
import { cn } from "@/lib/utils";
export function Logo() {
    const t = useTranslations("Portal");
    return <Link href="/" className="brand" aria-label={t("homeLabel")}><span className="brand-mark">e<span>✳</span></span><span>emada<span className="brand-subtitle">{t("brandSubtitle")}</span></span></Link>;
}
export function AppShell({ children, user, completed, admin, lessons: allLessons }: {
    children: React.ReactNode;
    user: {
        name: string;
        email: string;
    } | null;
    completed: number;
    admin: boolean;
    lessons: Pick<Lesson, "slug" | "title" | "intro" | "minutes">[];
}) {
    const t = useTranslations("Portal");
    const locale = useLocale();
    const nav = [{ href: "/", label: t("radar"), icon: Home }, { href: "/modelos", label: t("models"), icon: ChartNoAxesColumnIncreasing }, { href: "/noticias", label: t("news"), icon: Newspaper }, { href: "/vozes", label: t("voices"), icon: Users }, { href: "/experimentos", label: t("experiments"), icon: FlaskConical }, { href: "/modulos", label: "Academy", icon: BookOpen }];
    const pathname = stripLocale(usePathname());
    const router = useRouter();
    const [mobile, setMobile] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [logoutError, setLogoutError] = useState("");
    const current = nav.find(item => item.href === pathname)?.label ?? (pathname.startsWith("/aprender") ? t("classroom") : pathname.startsWith("/admin") ? t("administration") : pathname === "/progresso" ? t("progress") : pathname === "/biblioteca" ? t("library") : pathname === "/laboratorio" ? t("lab") : t("account"));
    const normalize = (value: string) => value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const search = normalize(query.trim());
    const lessonResults = allLessons.filter(l => normalize(l.title + " " + l.intro).includes(search));
    const glossaryResults = search ? glossary.filter(g => normalize(g.term + " " + g.definition).includes(search)) : [];
    const active = (href: string) => pathname === href || (href === "/modulos" && pathname.startsWith("/aprender"));
    async function signOut() {
        try {
            const result = await authClient.signOut();
            if (result.error) {
                setLogoutError(t("logoutFailed"));
                return;
            }
            router.push(`/${locale}`);
            router.refresh();
        }
        catch {
            setLogoutError(t("logoutConnection"));
        }
    }
    if (pathname.startsWith("/aprender/"))
        return <div className="app-shell focus-shell">
    <a href="#main-content" className="skip-link">{t("skipContent")}</a>
    <header className="focus-header"><Logo /><Link className="text-link" href="/modulos">{t("leaveLesson")}</Link></header>
    <main id="main-content" tabIndex={-1}><LocaleSyncNotice/>{children}</main>
  </div>;
    return <div className="app-shell">
    <a href="#main-content" className="skip-link">{t("skipContent")}</a>
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label={t("mainNavigation")}>{nav.map(({ href, label }) => <Link key={href} href={href} className={cn("nav-link", active(href) && "active")} aria-current={active(href) ? "page" : undefined}>{label}</Link>)}</nav>
        <div className="header-actions">
<LanguageSelector className="desktop-language"/>
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild><Button variant="ghost" size="icon" aria-label={t("searchLessons")}><Search size={20}/></Button></DialogTrigger>
            <DialogContent className="search-dialog">
              <DialogTitle>{t("learnQuestion")}</DialogTitle>
              <DialogDescription>{t("findLessons")}</DialogDescription>
              <Input aria-label={t("searchLessons")} placeholder={t("lessonPlaceholder")} value={query} onChange={e => setQuery(e.target.value)}/>
              <div className="search-results">
                {lessonResults.length > 0 && <h3>{t("lessons")}</h3>}
                {lessonResults.map(l => <Link key={l.slug} href={`/aprender/${l.slug}`} onClick={() => setSearchOpen(false)}><BookOpen size={17}/><span>{l.title}</span><span className="muted">{l.minutes} min</span></Link>)}
                {glossaryResults.length > 0 && <h3>{t("concepts")}</h3>}
                {glossaryResults.map(g => <Link key={g.term} href={`/biblioteca?q=${encodeURIComponent(g.term)}`} onClick={() => setSearchOpen(false)}><Library size={17}/><span>{g.term}</span><ChevronRight size={15}/></Link>)}
                {!lessonResults.length && !glossaryResults.length && <p className="empty-text" role="status">{t("emptyLessons")}</p>}
              </div>
            </DialogContent>
          </Dialog>
          {user ? <Link href="/progresso" className="avatar" aria-label={t("userProgress", {name:user.name})}>{user.name.slice(0, 1).toUpperCase()}</Link> : <Button asChild variant="outline" className="header-login"><Link href="/entrar">{t("signIn")}<ArrowUpRight size={16}/></Link></Button>}
          <Dialog open={mobile} onOpenChange={setMobile}>
            <DialogTrigger asChild><Button className="mobile-only" variant="ghost" size="icon" aria-label={t("openMenu")}><Menu /></Button></DialogTrigger>
            <DialogContent className="mobile-menu">
              <DialogTitle>{t("homeTitle")}</DialogTitle>
              <DialogDescription>{t("menuDescription")}</DialogDescription>
              <LanguageSelector/>
<nav aria-label={t("mobileNavigation")}>{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobile(false)} className={cn("nav-link", active(href) && "active")} aria-current={active(href) ? "page" : undefined}><Icon size={20}/>{label}<ArrowUpRight size={17}/></Link>)}</nav>
              {user && <div className="menu-progress"><div><span>{t("journey")}</span><span>{Math.round(completed / allLessons.length * 100)}%</span></div><Progress value={completed / allLessons.length * 100} aria-label={t("journeyProgress")}/><p>{t("completedDays", {completed, total:allLessons.length})}</p><Link href="/progresso" onClick={() => setMobile(false)}>{t("viewProgress")}<ArrowRight size={16}/></Link></div>}
              {admin && <Link href="/admin/aulas" className="text-link" onClick={() => setMobile(false)}><BookOpen size={18}/>{t("editLessons")}</Link>}
              {admin && <Link href="/admin" className="text-link" onClick={() => setMobile(false)}><ShieldCheck size={18}/>{t("administration")}</Link>}
              {user && <Button variant="outline" onClick={signOut}><LogOut size={17}/>{t("signOut")}</Button>}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
    {!["/", "/modulos", "/progresso", "/modelos", "/noticias", "/vozes", "/experimentos"].includes(pathname) && <div className="context-bar"><div className="breadcrumb"><Link href="/">Emada</Link><ChevronRight size={15}/><span>{current}</span></div>{user && <Link href="/progresso" className="context-progress">{t("completedDays", {completed, total:allLessons.length})} <ArrowUpRight size={15}/></Link>}</div>}
    {logoutError && <p role="alert" className="error-text global-alert">{logoutError}</p>}
    <main id="main-content" tabIndex={-1}><LocaleSyncNotice/>{children}</main>
    <footer className="footer"><div className="footer-top"><Logo /><p>{t("footerDescription")}</p><div className="footer-links"><Link href="/biblioteca">{t("library")}<Library size={15}/></Link><Link href="/laboratorio">{t("lab")}<FlaskConical size={15}/></Link>{user && <Link href="/progresso">{t("progress")}<ArrowUpRight size={15}/></Link>}{admin && <Link href="/admin/aulas">{t("editLessons")}<BookOpen size={15}/></Link>}{admin && <Link href="/admin">{t("administration")}<ShieldCheck size={15}/></Link>}{user && <button onClick={signOut}>{t("signOut")}<LogOut size={15}/></button>}</div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Emada Academy</span><a href="https://ludylops.com" target="_blank" rel="noreferrer">{t("byLud")}<ArrowUpRight size={14}/></a></div></footer>
  </div>;
}

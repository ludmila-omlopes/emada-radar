"use client";
import { useTranslations } from "next-intl";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
export function PortalRefresh() {
    const t = useTranslations("Portal");
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    useEffect(() => {
        const interval = window.setInterval(() => {
            if (document.visibilityState === "visible")
                startTransition(() => router.refresh());
        }, 5 * 60000);
        return () => window.clearInterval(interval);
    }, [router]);
    return <button type="button" className="portal-refresh" disabled={pending} onClick={() => startTransition(() => router.refresh())} title={t("refreshHelp")}><RefreshCw size={15} aria-hidden="true" className={pending ? "refresh-pending" : ""}/><span aria-live="polite">{pending ? t("refreshing") : t("refresh")}</span></button>;
}

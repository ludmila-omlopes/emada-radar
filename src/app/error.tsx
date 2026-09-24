"use client";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
export default function ErrorPage({ reset }: { reset: () => void }) { const t = useTranslations("Portal"); return <div className="page-container empty-page"><h1>{t("loadFailed")}</h1><p>{t("retryHint")}</p><Button onClick={reset}>{t("retry")}</Button></div>; }

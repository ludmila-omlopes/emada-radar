import { PortalLink as Link } from "@/components/portal-link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function NotFound() { const t = useTranslations("Portal"); return <div className="page-container empty-page"><h1>{t("notFound")}</h1><p>{t("notFoundHint")}</p><Button asChild><Link href="/">{t("backHome")}</Link></Button></div>; }

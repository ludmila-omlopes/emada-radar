import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getTranslations } from "next-intl/server";
export const maxDuration = 60;
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Portal" });
  return { title: { default: t("homeTitle"), template: "%s | Emada" }, description: t("homeDescription") };
}
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  if (!isLocale((await params).locale)) notFound();
  return children;
}

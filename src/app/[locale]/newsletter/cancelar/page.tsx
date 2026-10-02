import { getTranslations } from "next-intl/server";
import { NewsletterTokenAction } from "@/components/newsletter-token-action";

export async function generateMetadata() {
  const t = await getTranslations("Newsletter");
  return { title: t("unsubscribeTitle"), robots: { index: false, follow: false } };
}
export default async function UnsubscribeNewsletterPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string | string[] }> }) {
  const [{ locale }, { token }] = await Promise.all([params, searchParams]);
  const t = await getTranslations("Newsletter");
  return <div className="page-container newsletter-page">
    <div className="page-heading"><p className="newsletter-eyebrow">{t("eyebrow")}</p><h1>{t("unsubscribeTitle")}</h1><p>{t("unsubscribeDescription")}</p></div>
    <NewsletterTokenAction kind="unsubscribe" locale={locale} token={typeof token === "string" ? token : ""}/>
  </div>;
}

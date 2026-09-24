import { getTranslations } from "next-intl/server";
import { TrainingDirectory } from "@/components/training-directory";

export async function generateMetadata() {
  const t = await getTranslations("Training");
  return { title: t("title"), description: t("description") };
}
export default async function TrainingPage() {
  const t = await getTranslations("Training");
  return <div className="page-container portal-page training-page">
    <header className="portal-heading"><div><h1>{t("title")}</h1><p>{t("description")}</p></div></header>
    <TrainingDirectory/>
  </div>;
}

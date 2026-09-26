import { getTranslations } from "next-intl/server";
import { TrainingDirectory } from "@/components/training-directory";
import { RadarHero, StatTiles } from "@/components/radar-kit";
import { aiTraining } from "@/data/ai-training";

export async function generateMetadata() {
  const t = await getTranslations("Training");
  return { title: t("title"), description: t("description") };
}
export default async function TrainingPage() {
  const t = await getTranslations("Training");
  return <div className="page-container portal-page radar-page training-page">
    <RadarHero title={t("title")} description={t("description")}/>
    <StatTiles label={t("statsLabel")} items={[
      { label: t("statOptions"), value: aiTraining.length, detail: t("statOptionsDetail") },
      { label: t("statCredentials"), value: aiTraining.filter(item => item.credential !== "unconfirmed").length, detail: t("statCredentialsDetail") },
      { label: t("statProviders"), value: new Set(aiTraining.map(item => item.provider)).size, detail: t("statProvidersDetail") },
    ]}/>
    <TrainingDirectory/>
  </div>;
}

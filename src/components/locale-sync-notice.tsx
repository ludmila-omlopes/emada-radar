"use client";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
const subscribe = () => () => {};
export function LocaleSyncNotice() {
  const t = useTranslations("Portal");
  const failed = useSyncExternalStore(subscribe, () => sessionStorage.getItem("localeSyncFailed") === "1", () => false);
  return failed ? <p className="page-container" role="status">{t("profileSaveFailed")}</p> : null;
}

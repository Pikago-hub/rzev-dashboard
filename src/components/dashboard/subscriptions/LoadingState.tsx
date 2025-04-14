"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

export function LoadingState() {
  const t = useTranslations("dashboard.subscriptions");

  return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2 text-lg">{t("loading")}</span>
    </div>
  );
}

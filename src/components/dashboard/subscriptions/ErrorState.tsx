"use client";

import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  type: "workspace" | "plans";
}

export function ErrorState({ type }: ErrorStateProps) {
  const t = useTranslations("dashboard.subscriptions");

  return (
    <div className="text-center py-8 space-y-4">
      <div className="flex justify-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>
      <h3 className="text-lg font-medium">{t("error.title")}</h3>
      <p>
        {type === "workspace"
          ? t("error.workspaceRequired")
          : t("error.fetchPlans")}
      </p>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { UsageMetrics } from "@/components/dashboard/usage";

export default function UsagePage() {
  const t = useTranslations("dashboard.usage");

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>

        <UsageMetrics />
      </div>
    </DashboardLayout>
  );
}

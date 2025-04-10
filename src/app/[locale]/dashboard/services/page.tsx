"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { ServiceList } from "@/components/dashboard/service/ServiceList";

export default function ServicesPage() {
  const t = useTranslations("dashboard.services");

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <ServiceList />
      </div>
    </DashboardLayout>
  );
}

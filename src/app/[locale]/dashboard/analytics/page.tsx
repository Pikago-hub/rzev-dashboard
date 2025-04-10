"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AnalyticsPage() {
  const t = useTranslations("dashboard.analytics");

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select defaultValue="30days">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("periods.selectPeriod")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">{t("periods.7days")}</SelectItem>
                <SelectItem value="30days">{t("periods.30days")}</SelectItem>
                <SelectItem value="90days">{t("periods.90days")}</SelectItem>
                <SelectItem value="year">{t("periods.year")}</SelectItem>
                <SelectItem value="custom">{t("periods.custom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="revenue">{t("tabs.revenue")}</TabsTrigger>
            <TabsTrigger value="appointments">
              {t("tabs.appointments")}
            </TabsTrigger>
            <TabsTrigger value="clients">{t("tabs.clients")}</TabsTrigger>
            <TabsTrigger value="team">{t("tabs.team")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("metrics.totalRevenue")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$45,231.89</div>
                  <p className="text-xs text-muted-foreground">
                    {t("metrics.fromLastPeriod", { percent: "20.1" })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("metrics.appointments")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,234</div>
                  <p className="text-xs text-muted-foreground">
                    {t("metrics.fromLastPeriod", { percent: "12.5" })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("metrics.newClients")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">145</div>
                  <p className="text-xs text-muted-foreground">
                    {t("metrics.fromLastPeriod", { percent: "32.1" })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("metrics.conversionRate")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24.8%</div>
                  <p className="text-xs text-muted-foreground">
                    {t("metrics.fromLastPeriod", { percent: "3.2" })}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>{t("charts.revenueTrend")}</CardTitle>
                  <CardDescription>
                    {t("charts.revenueTrendDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">
                    {t("charts.revenueChartComing")}
                  </p>
                </CardContent>
              </Card>
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>{t("charts.appointmentDistribution")}</CardTitle>
                  <CardDescription>
                    {t("charts.appointmentDistributionDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">
                    {t("charts.distributionChartComing")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent
            value="revenue"
            className="h-[400px] flex items-center justify-center"
          >
            <p className="text-muted-foreground">
              {t("charts.revenueAnalyticsComing")}
            </p>
          </TabsContent>

          <TabsContent
            value="appointments"
            className="h-[400px] flex items-center justify-center"
          >
            <p className="text-muted-foreground">
              {t("charts.appointmentAnalyticsComing")}
            </p>
          </TabsContent>

          <TabsContent
            value="clients"
            className="h-[400px] flex items-center justify-center"
          >
            <p className="text-muted-foreground">
              {t("charts.clientAnalyticsComing")}
            </p>
          </TabsContent>

          <TabsContent
            value="team"
            className="h-[400px] flex items-center justify-center"
          >
            <p className="text-muted-foreground">
              {t("charts.teamAnalyticsComing")}
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

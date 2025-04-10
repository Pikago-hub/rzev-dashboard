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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function SubscriptionsPage() {
  const t = useTranslations("dashboard.subscriptions");

  // Helper function to get features as an array
  const getFeatures = (path: string): string[] => {
    const features = t.raw(path);
    if (!features || typeof features !== "object") return [];

    const length = parseInt(features.length as string, 10) || 0;
    const result: string[] = [];

    for (let i = 0; i < length; i++) {
      const feature = features[i.toString()];
      if (feature) result.push(feature as string);
    }

    return result;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans">{t("tabs.plans")}</TabsTrigger>
            <TabsTrigger value="billing">{t("tabs.billing")}</TabsTrigger>
            <TabsTrigger value="settings">{t("tabs.settings")}</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Basic Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>{t("plans.basic.name")}</CardTitle>
                  <CardDescription>
                    {t("plans.basic.description")}
                  </CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {t("plans.basic.price")}
                    </span>
                    <span className="text-muted-foreground">
                      {t("plans.basic.period")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 mb-6 flex-1">
                    {getFeatures("plans.basic.features").map(
                      (feature, index) => (
                        <div key={index} className="flex items-center">
                          <Check className="mr-2 h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </div>
                      )
                    )}
                  </div>
                  <Button variant="outline" className="w-full">
                    {t("plans.basic.button")}
                  </Button>
                </CardContent>
              </Card>

              {/* Professional Plan */}
              <Card className="flex flex-col border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t("plans.professional.name")}</CardTitle>
                    <Badge>{t("plans.professional.badge")}</Badge>
                  </div>
                  <CardDescription>
                    {t("plans.professional.description")}
                  </CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {t("plans.professional.price")}
                    </span>
                    <span className="text-muted-foreground">
                      {t("plans.professional.period")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 mb-6 flex-1">
                    {getFeatures("plans.professional.features").map(
                      (feature, index) => (
                        <div key={index} className="flex items-center">
                          <Check className="mr-2 h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </div>
                      )
                    )}
                  </div>
                  <Button className="w-full">
                    {t("plans.professional.button")}
                  </Button>
                </CardContent>
              </Card>

              {/* Enterprise Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>{t("plans.enterprise.name")}</CardTitle>
                  <CardDescription>
                    {t("plans.enterprise.description")}
                  </CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {t("plans.enterprise.price")}
                    </span>
                    <span className="text-muted-foreground">
                      {t("plans.enterprise.period")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 mb-6 flex-1">
                    {getFeatures("plans.enterprise.features").map(
                      (feature, index) => (
                        <div key={index} className="flex items-center">
                          <Check className="mr-2 h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </div>
                      )
                    )}
                  </div>
                  <Button variant="outline" className="w-full">
                    {t("plans.enterprise.button")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent
            value="billing"
            className="h-[400px] flex items-center justify-center"
          >
            <p className="text-muted-foreground">{t("comingSoon.billing")}</p>
          </TabsContent>

          <TabsContent
            value="settings"
            className="h-[400px] flex items-center justify-center"
          >
            <p className="text-muted-foreground">{t("comingSoon.settings")}</p>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

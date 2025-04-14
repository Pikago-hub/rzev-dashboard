"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface EnterprisePlanCardProps {
  calendarUrl?: string;
}

export function EnterprisePlanCard({ calendarUrl = "https://cal.com/jerry-wu/30min" }: EnterprisePlanCardProps) {
  const t = useTranslations("dashboard.subscriptions");

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("enterprisePlan.name")}</CardTitle>
          <Badge variant="secondary">
            {t("enterprisePlan.badge")}
          </Badge>
        </div>
        <CardDescription>
          {t("enterprisePlan.description")}
        </CardDescription>
        <div className="mt-2">
          <span className="text-3xl font-bold">
            {t("enterprisePlan.price")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2">
          <div className="flex items-center">
            <Check className="mr-2 h-4 w-4 text-primary" />
            <span>{t("enterprisePlan.feature")}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => window.open(calendarUrl, "_blank")}
        >
          {t("enterprisePlan.button")}
        </Button>
      </CardFooter>
    </Card>
  );
}

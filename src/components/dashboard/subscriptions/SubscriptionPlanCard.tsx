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
import { Check, Loader2 } from "lucide-react";
import { BillingInterval, SubscriptionPlanWithPricing } from "@/types/subscription";

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlanWithPricing;
  billingInterval: BillingInterval;
  isPopular: boolean;
  isCurrentPlan: boolean;
  isProcessing: boolean;
  formatPrice: (plan: SubscriptionPlanWithPricing, interval: BillingInterval) => string;
  onSelectPlan: (planId: string, interval: BillingInterval) => void;
}

export function SubscriptionPlanCard({
  plan,
  billingInterval,
  isPopular,
  isCurrentPlan,
  isProcessing,
  formatPrice,
  onSelectPlan,
}: SubscriptionPlanCardProps) {
  const t = useTranslations("dashboard.subscriptions");
  
  // Helper function to get features as an array
  const getFeatures = (plan: SubscriptionPlanWithPricing): string[] => {
    const features = [];

    if (plan.included_seats) {
      features.push(`${plan.included_seats} ${t("features.teamMembers")}`);
    }

    if (plan.max_messages) {
      features.push(
        `${plan.max_messages.toLocaleString()} ${t("features.messages")}`
      );
    }

    if (plan.max_emails) {
      features.push(
        `${plan.max_emails.toLocaleString()} ${t("features.emails")}`
      );
    }

    if (plan.max_call_minutes) {
      features.push(
        `${plan.max_call_minutes.toLocaleString()} ${t("features.callMinutes")}`
      );
    }

    return features;
  };

  const features = getFeatures(plan);
  const price = formatPrice(plan, billingInterval);
  const period =
    billingInterval === "monthly"
      ? t("period.monthly")
      : t("period.yearly");

  return (
    <Card
      className={`flex flex-col ${isPopular ? "border-primary" : ""}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          {isPopular && <Badge>{t("popularBadge")}</Badge>}
        </div>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-2">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-muted-foreground">
            {period}
          </span>
        </div>
        {plan.trial_period_days && (
          <p className="text-sm text-muted-foreground mt-1">
            {t("trialPeriod", { days: plan.trial_period_days })}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-primary" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={isPopular ? "default" : "outline"}
          onClick={() => onSelectPlan(plan.id, billingInterval)}
          disabled={isProcessing || isCurrentPlan}
        >
          {isProcessing && isCurrentPlan ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {isCurrentPlan
            ? t("currentPlanButton")
            : isPopular
              ? t("upgradeButton")
              : t("selectButton")}
        </Button>
      </CardFooter>
    </Card>
  );
}

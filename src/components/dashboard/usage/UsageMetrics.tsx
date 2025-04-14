"use client";

import { useTranslations } from "next-intl";
import { UsageCard } from "./UsageCard";
import { useUsage } from "@/hooks/useUsage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UsageMetrics() {
  const t = useTranslations("dashboard.usage");
  const {
    usageData,
    isLoading,
    error,
    calculateUsagePercentage,
    isInTrialPeriod,
    getTrialDaysRemaining,
    getBillingPeriodDaysRemaining,
  } = useUsage();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !usageData) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error.title")}</AlertTitle>
        <AlertDescription>
          {error || t("error.failedToLoadUsage")}
        </AlertDescription>
      </Alert>
    );
  }

  const { usage, limits, subscription, plan } = usageData;
  const inTrial = isInTrialPeriod();
  const trialDaysRemaining = getTrialDaysRemaining();
  const billingPeriodDaysRemaining = getBillingPeriodDaysRemaining();

  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptionStatus")}</CardTitle>
          <CardDescription>
            {t("currentPlan", { planName: plan.name })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{t("status")}:</span>
              <span className="capitalize">{subscription.status}</span>
            </div>
            
            {inTrial ? (
              <div className="flex justify-between">
                <span className="font-medium">{t("trialEnds")}:</span>
                <span>
                  {subscription.trial_ends_at
                    ? new Date(subscription.trial_ends_at).toLocaleDateString()
                    : "-"}
                  {trialDaysRemaining > 0 && (
                    <span className="ml-2 text-blue-600">
                      ({t("daysRemaining", { days: trialDaysRemaining })})
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="font-medium">{t("currentPeriodEnds")}:</span>
                <span>
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString()
                    : "-"}
                  {billingPeriodDaysRemaining > 0 && (
                    <span className="ml-2 text-muted-foreground">
                      ({t("daysRemaining", { days: billingPeriodDaysRemaining })})
                    </span>
                  )}
                </span>
              </div>
            )}

            {subscription.cancel_at_period_end && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                {inTrial
                  ? t("cancelAtTrialEnd")
                  : t("cancelAtPeriodEnd")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <UsageCard
          title={t("resources.seats")}
          description={t("descriptions.seats")}
          current={usage.seats}
          limit={limits.seats}
          percentage={calculateUsagePercentage("seats")}
          isInTrial={inTrial}
        />
        <UsageCard
          title={t("resources.messages")}
          description={t("descriptions.messages")}
          current={usage.messages}
          limit={limits.messages}
          percentage={calculateUsagePercentage("messages")}
          isInTrial={inTrial}
        />
        <UsageCard
          title={t("resources.emails")}
          description={t("descriptions.emails")}
          current={usage.emails}
          limit={limits.emails}
          percentage={calculateUsagePercentage("emails")}
          isInTrial={inTrial}
        />
        <UsageCard
          title={t("resources.callMinutes")}
          description={t("descriptions.callMinutes")}
          current={usage.call_minutes}
          limit={limits.call_minutes}
          unit={t("units.minutes")}
          percentage={calculateUsagePercentage("call_minutes")}
          isInTrial={inTrial}
        />
      </div>

      {/* Usage Policy Information */}
      <Alert className="bg-muted">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("usagePolicy.title")}</AlertTitle>
        <AlertDescription>
          {inTrial
            ? t("usagePolicy.duringTrial")
            : t("usagePolicy.afterTrial")}
        </AlertDescription>
      </Alert>
    </div>
  );
}

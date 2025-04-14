"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Subscription,
  SubscriptionPlanWithPricing,
} from "@/types/subscription";
import { ManageSubscriptionButton } from "./ManageSubscriptionButton";

interface CurrentSubscriptionStatusProps {
  subscription: Subscription;
  plans: SubscriptionPlanWithPricing[];
  isCancelling: boolean;
  onCancelClick: () => void;
}

export function CurrentSubscriptionStatus({
  subscription,
  plans,
  isCancelling,
  onCancelClick,
}: CurrentSubscriptionStatusProps) {
  const t = useTranslations("dashboard.subscriptions");

  // Find the current plan name
  const currentPlanName =
    plans.find((p) => p.id === subscription.subscription_plan_id)?.name || "";

  return (
    <div className="mt-8 border rounded-lg p-6 bg-card">
      <h2 className="text-xl font-semibold mb-4">
        {t("currentPlanButton")}: {currentPlanName}
      </h2>
      <div className="flex flex-col space-y-2 mb-6">
        <p>
          <span className="font-medium">Status: </span>
          <Badge
            variant={
              subscription.status === "active" ||
              subscription.status === "trialing"
                ? "default"
                : "outline"
            }
          >
            {subscription.status === "trialing"
              ? subscription.cancel_at_period_end
                ? "Trial (Cancels at end)"
                : "Trial"
              : subscription.status === "active"
                ? subscription.cancel_at_period_end
                  ? "Active (Cancels at end)"
                  : "Active"
                : subscription.status === "canceled"
                  ? "Canceled"
                  : subscription.status}
          </Badge>
        </p>
        {subscription.current_period_end && (
          <p>
            <span className="font-medium">Current period ends: </span>
            {new Date(subscription.current_period_end).toLocaleDateString()}
          </p>
        )}
        {subscription.status === "trialing" && subscription.trial_ends_at && (
          <>
            <p>
              <span className="font-medium">Trial ends: </span>
              {new Date(subscription.trial_ends_at).toLocaleDateString()}
            </p>
            {/* Trial period time left */}
            {(() => {
              const trialEndsAt = new Date(subscription.trial_ends_at);
              const now = new Date();
              const diffTime = trialEndsAt.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays > 0) {
                return (
                  <div className="mt-2 p-3 bg-primary/10 rounded-md border border-primary/20">
                    <p className="font-medium text-primary">
                      {t("trialTimeLeft", { days: diffDays })}
                    </p>
                    <div className="w-full bg-muted h-2 rounded-full mt-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, 100 - (diffDays / (subscription.trial_period_days || 14)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </>
        )}
      </div>
      <div className="flex gap-4">
        {/* Manage Subscription Button */}
        {(subscription.status === "active" ||
          subscription.status === "trialing") && (
          <ManageSubscriptionButton workspaceId={subscription.workspace_id} />
        )}

        {/* Cancel Subscription Button */}
        {(subscription.status === "active" ||
          subscription.status === "trialing") &&
          !subscription.cancel_at_period_end && (
            <Button
              variant="destructive"
              onClick={onCancelClick}
              disabled={isCancelling}
              className="text-white"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                t("cancelSubscription.button")
              )}
            </Button>
          )}
      </div>
    </div>
  );
}

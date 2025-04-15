"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
// Removed tabs import
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { BillingInterval, Subscription } from "@/types/subscription";
import { useToast } from "@/components/ui/use-toast";

import { useWorkspace } from "@/lib/workspace-context";
import { getAuthToken } from "@/lib/auth-context";

// Import extracted components
import {
  BillingIntervalToggle,
  SubscriptionPlanCard,
  EnterprisePlanCard,
  CurrentSubscriptionStatus,
  CancelSubscriptionDialog,
  LoadingState,
  ErrorState,
} from "@/components/dashboard/subscriptions";

export default function SubscriptionsPage() {
  const t = useTranslations("dashboard.subscriptions");
  const { toast } = useToast();
  const { workspaceId, isLoading: isWorkspaceLoading } = useWorkspace();
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");
  const { plans, isLoading, error, formatPrice } = useSubscriptionPlans();
  const [currentSubscription, setCurrentSubscription] =
    useState<Subscription | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Show loading state while workspace is loading
  useEffect(() => {
    setIsLoadingSubscription(isWorkspaceLoading);
  }, [isWorkspaceLoading]);

  // Fetch current subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!workspaceId) return;

      try {
        setIsLoadingSubscription(true);

        // Get the auth token
        let token;
        try {
          token = await getAuthToken();
        } catch (authError) {
          console.error("Error getting auth token:", authError);
          return;
        }

        const response = await fetch(
          `/api/subscriptions/current?workspaceId=${workspaceId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch subscription: ${response.status}`);
        }

        const data = await response.json();
        setCurrentSubscription(data.subscription);
      } catch (err) {
        console.error("Error fetching subscription:", err);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchSubscription();
  }, [workspaceId]);

  // Handle plan selection
  const handleSelectPlan = async (
    planId: string,
    interval: BillingInterval
  ) => {
    if (!workspaceId) {
      toast({
        title: t("error.title"),
        description: t("error.noWorkspace"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Get the auth token
      let token;
      try {
        token = await getAuthToken();
      } catch (authError) {
        console.error("Error getting auth token:", authError);
        toast({
          title: t("error.title"),
          description: t("error.authRequired"),
          variant: "destructive",
        });
        // Redirect to auth page
        window.location.href = "/auth";
        return;
      }

      // Call the API to create a checkout session
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId,
          workspaceId,
          billingInterval: interval,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const data = await response.json();

      // Check if this is a direct update or a Stripe Checkout redirect
      if (data.updated && data.success && data.subscription) {
        // Direct update - update the subscription data locally
        setCurrentSubscription(data.subscription);

        // Show success toast
        toast({
          title: t("common.success"),
          description: data.message || t("updateSuccess"),
        });
      } else if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Error creating checkout session:", err);
      toast({
        title: t("error.title"),
        description: err instanceof Error ? err.message : t("error.checkout"),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!workspaceId) {
      toast({
        title: t("error.title"),
        description: t("error.noWorkspace"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCancelling(true);

      // Get the auth token
      let token;
      try {
        token = await getAuthToken();
      } catch (authError) {
        console.error("Error getting auth token:", authError);
        toast({
          title: t("error.title"),
          description: t("error.authRequired"),
          variant: "destructive",
        });
        // Redirect to auth page
        window.location.href = "/auth";
        return;
      }

      // Call the API to cancel the subscription
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel subscription");
      }

      // Update the subscription status locally
      setCurrentSubscription((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: "canceled",
        };
      });

      toast({
        title: t("common.success"),
        description: t("cancelSubscription.success"),
      });
    } catch (err) {
      console.error("Error cancelling subscription:", err);
      toast({
        title: t("error.title"),
        description:
          err instanceof Error ? err.message : t("cancelSubscription.error"),
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  // Show error toast if there's an error
  if (error) {
    toast({
      title: t("error.title"),
      description: t("error.fetchPlans"),
      variant: "destructive",
    });
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="space-y-4">
          {/* Billing interval toggle */}
          <BillingIntervalToggle
            value={billingInterval}
            onChange={(value) => setBillingInterval(value)}
          />

          {isLoading || isLoadingSubscription ? (
            <LoadingState />
          ) : !workspaceId ? (
            <ErrorState type="workspace" />
          ) : plans.length === 0 ? (
            <div className="text-center py-8">
              <p>{t("noPlans")}</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Dynamic subscription plans from Stripe */}
              {plans.map((plan, index) => {
                const isPopular = index === 1; // Mark the middle plan as popular
                const isCurrentPlan =
                  currentSubscription?.subscription_plan_id === plan.id;
                const isCurrentPlanProcessing = isProcessing && isCurrentPlan;

                return (
                  <SubscriptionPlanCard
                    key={plan.id}
                    plan={plan}
                    billingInterval={billingInterval}
                    isPopular={isPopular}
                    isCurrentPlan={isCurrentPlan}
                    isProcessing={isCurrentPlanProcessing}
                    formatPrice={formatPrice}
                    onSelectPlan={handleSelectPlan}
                  />
                );
              })}

              {/* Enterprise Plan - Custom, not from Stripe */}
              <EnterprisePlanCard calendarUrl="https://cal.com/jerry-wu/30min" />
            </div>
          )}
        </div>

        {/* Current Subscription Status */}
        {currentSubscription && (
          <CurrentSubscriptionStatus
            subscription={currentSubscription}
            plans={plans}
            isCancelling={isCancelling}
            onCancelClick={() => setShowCancelDialog(true)}
          />
        )}

        {/* Cancel Subscription Dialog */}
        <CancelSubscriptionDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          onConfirm={handleCancelSubscription}
          isTrialPeriod={currentSubscription?.status === "trialing"}
        />
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from "react";
import { useWorkspace } from "@/lib/workspace-context";
import { getAuthToken } from "@/lib/auth-context";

export interface UsageLimits {
  seats: number;
  messages: number;
  emails: number;
  call_minutes: number;
}

export interface UsageData {
  seats: number;
  messages: number;
  emails: number;
  call_minutes: number;
}

export interface SubscriptionDetails {
  id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  usage_billing_start: string | null;
  usage_billing_end: string | null;
  billing_interval: string | null;
  cancel_at_period_end: boolean;
}

export interface PlanDetails {
  id: string;
  name: string;
  included_seats: number;
  max_messages: number;
  max_emails: number;
  max_call_minutes: number;
}

export interface BillingPeriod {
  start: string | null;
  end: string | null;
}

export interface UsageResponse {
  subscription: SubscriptionDetails;
  plan: PlanDetails;
  limits: UsageLimits;
  usage: UsageData;
  billing_period: BillingPeriod;
}

export function useUsage() {
  const [usageData, setUsageData] = useState<UsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { workspaceId } = useWorkspace();

  useEffect(() => {
    const fetchUsageData = async () => {
      if (!workspaceId) {
        setIsLoading(false);
        setError("Workspace ID is required");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        const response = await fetch(
          `/api/usage/current?workspaceId=${workspaceId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch usage data");
        }

        const data = await response.json();
        setUsageData(data);
      } catch (err) {
        console.error("Error fetching usage data:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (workspaceId) {
      fetchUsageData();
    }
  }, [workspaceId]);

  // Function to record usage
  const recordUsage = async (resourceType: string, quantity: number) => {
    if (!workspaceId) {
      throw new Error("Workspace ID is required");
    }

    try {
      const token = await getAuthToken();
      const response = await fetch("/api/usage/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId,
          resourceType,
          quantity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to record usage");
      }

      return await response.json();
    } catch (err) {
      console.error("Error recording usage:", err);
      throw err;
    }
  };

  // Calculate percentage of usage for a resource type
  const calculateUsagePercentage = (resourceType: keyof UsageData) => {
    if (!usageData) return 0;

    const usage = usageData.usage[resourceType];
    const limit = usageData.limits[resourceType];

    if (!limit) return 0;
    return Math.min(Math.round((usage / limit) * 100), 100);
  };

  // Check if adding usage would exceed the limit
  const wouldExceedLimit = (
    resourceType: keyof UsageData,
    additionalQuantity: number
  ) => {
    if (!usageData) return false;

    const currentUsage = usageData.usage[resourceType];
    const limit = usageData.limits[resourceType];

    if (!limit) return false;
    return currentUsage + additionalQuantity > limit;
  };

  // Check if a resource is in trial period
  const isInTrialPeriod = () => {
    if (!usageData?.subscription.trial_ends_at) return false;

    const trialEndDate = new Date(usageData.subscription.trial_ends_at);
    const now = new Date();

    return now < trialEndDate;
  };

  // Get days remaining in trial
  const getTrialDaysRemaining = () => {
    if (!usageData?.subscription.trial_ends_at) return 0;

    const trialEndDate = new Date(usageData.subscription.trial_ends_at);
    const now = new Date();

    if (now >= trialEndDate) return 0;

    const diffTime = trialEndDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Get days remaining in current billing period
  const getBillingPeriodDaysRemaining = () => {
    if (!usageData?.subscription.current_period_end) return 0;

    const periodEndDate = new Date(usageData.subscription.current_period_end);
    const now = new Date();

    if (now >= periodEndDate) return 0;

    const diffTime = periodEndDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return {
    usageData,
    isLoading,
    error,
    recordUsage,
    calculateUsagePercentage,
    wouldExceedLimit,
    isInTrialPeriod,
    getTrialDaysRemaining,
    getBillingPeriodDaysRemaining,
  };
}

import { useState, useEffect } from "react";
import {
  SubscriptionPlanWithPricing,
  BillingInterval,
} from "@/types/subscription";
import { getAuthToken } from "@/lib/auth-context";

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlanWithPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the auth token
        let token;
        try {
          token = await getAuthToken();
        } catch (authError) {
          console.error("Error getting auth token:", authError);
          setError("Authentication required");
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/subscriptions/plans", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch subscription plans: ${response.status}`
          );
        }

        const data = await response.json();
        setPlans(data.plans || []);
      } catch (err) {
        console.error("Error fetching subscription plans:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch subscription plans"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Helper function to format price based on billing interval
  const formatPrice = (
    plan: SubscriptionPlanWithPricing,
    interval: BillingInterval
  ): string => {
    const price =
      interval === "monthly" ? plan.monthly_price : plan.yearly_price;

    if (price === null) {
      return "Contact Sales";
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: plan.currency || "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return {
    plans,
    isLoading,
    error,
    formatPrice,
  };
}

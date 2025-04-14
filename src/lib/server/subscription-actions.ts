import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  Subscription,
  SubscriptionPlanWithPricing,
} from "@/types/subscription";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Initialize Stripe with the latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-03-31.basil", // Latest stable version as of now
});

/**
 * Get the current subscription for a workspace
 */
export async function getCurrentSubscription(
  workspaceId: string
): Promise<Subscription | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching subscription:", error);
      return null;
    }

    return data as Subscription;
  } catch (err) {
    console.error("Error fetching subscription:", err);
    return null;
  }
}

/**
 * Get all subscription plans with pricing details
 */
export async function getSubscriptionPlans(
  includePrivate: boolean = false
): Promise<SubscriptionPlanWithPricing[]> {
  try {
    // Fetch subscription plans from the database
    const query = supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .order("included_seats", { ascending: true });

    // Filter to only public plans unless includePrivate is true
    if (!includePrivate) {
      query.eq("is_public", true);
    }

    const { data: plans, error } = await query;

    if (error) {
      console.error("Error fetching subscription plans:", error);
      return [];
    }

    // If no plans found, return empty array
    if (!plans || plans.length === 0) {
      return [];
    }

    // Fetch pricing details from Stripe for each plan
    const plansWithPricing = await Promise.all(
      plans.map(async (plan) => {
        let monthlyPrice = null;
        let yearlyPrice = null;
        let currency = "usd"; // Default currency

        // Fetch monthly price if available
        if (plan.stripe_price_id_monthly) {
          try {
            const monthlyPriceData = await stripe.prices.retrieve(
              plan.stripe_price_id_monthly
            );
            monthlyPrice = monthlyPriceData.unit_amount
              ? monthlyPriceData.unit_amount / 100
              : null;
            currency = monthlyPriceData.currency || "usd";
          } catch (stripeError) {
            console.error(
              `Error fetching monthly price for plan ${plan.id}:`,
              stripeError
            );
          }
        }

        // Fetch yearly price if available
        if (plan.stripe_price_id_yearly) {
          try {
            const yearlyPriceData = await stripe.prices.retrieve(
              plan.stripe_price_id_yearly
            );
            yearlyPrice = yearlyPriceData.unit_amount
              ? yearlyPriceData.unit_amount / 100
              : null;
            currency = yearlyPriceData.currency || "usd";
          } catch (stripeError) {
            console.error(
              `Error fetching yearly price for plan ${plan.id}:`,
              stripeError
            );
          }
        }

        // Return plan with pricing details
        return {
          ...plan,
          monthly_price: monthlyPrice,
          yearly_price: yearlyPrice,
          currency,
        };
      })
    );

    return plansWithPricing;
  } catch (error) {
    console.error("Server error:", error);
    return [];
  }
}

/**
 * Update a subscription plan for a workspace
 */
export async function updateSubscriptionPlan(
  workspaceId: string,
  planId: string,
  stripeSubscriptionId: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        subscription_plan_id: planId,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", stripeSubscriptionId);

    if (error) {
      console.error("Error updating subscription plan:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error updating subscription plan:", err);
    return false;
  }
}

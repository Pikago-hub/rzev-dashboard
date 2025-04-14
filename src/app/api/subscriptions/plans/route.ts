import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthUser } from "@/lib/server/auth-utils";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Initialize Stripe with the latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-03-31.basil", // Latest stable version as of now
});

// GET: Fetch all public subscription plans with pricing details from Stripe
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await getAuthUser(request);
    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Authentication required" },
        { status: 401 }
      );
    }

    // Get only public plans by default
    const { searchParams } = new URL(request.url);
    const includePrivate = searchParams.get("includePrivate") === "true";

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
      return NextResponse.json(
        { error: "Failed to fetch subscription plans" },
        { status: 500 }
      );
    }

    // If no plans found, return empty array
    if (!plans || plans.length === 0) {
      return NextResponse.json({ plans: [] });
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

    return NextResponse.json({
      plans: plansWithPricing,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthAndValidateWorkspaceAction } from "@/lib/server/workspace-actions";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Initialize Stripe with the latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-03-31.basil",
});

// POST: Add additional seats to an existing subscription
export async function POST(request: NextRequest) {
  try {
    const { workspaceId, seatsToAdd } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    if (!seatsToAdd || seatsToAdd < 1) {
      return NextResponse.json(
        { error: "Number of seats to add must be at least 1" },
        { status: 400 }
      );
    }

    // Get authorization and validate workspace access (owner required for subscription management)
    const auth = await getAuthAndValidateWorkspaceAction(
      request,
      workspaceId,
      "owner"
    );

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Fetch the current subscription
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("*, subscription_plans(*)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError || !subscription) {
      console.error("Error fetching subscription:", subscriptionError);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 }
      );
    }

    // Check if there's an active subscription
    if (
      !subscription.stripe_subscription_id ||
      (subscription.status !== "active" && subscription.status !== "trialing")
    ) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Fetch the additional seat plan
    const { data: additionalSeatPlan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .ilike("name", "%Additional Seat%")
      .single();

    if (planError || !additionalSeatPlan) {
      console.error("Error fetching additional seat plan:", planError);
      return NextResponse.json(
        { error: "Failed to fetch additional seat plan" },
        { status: 500 }
      );
    }

    // Get the appropriate price ID based on the current billing interval
    const billingInterval = subscription.billing_interval;
    const priceId =
      billingInterval === "year"
        ? additionalSeatPlan.stripe_price_id_yearly
        : additionalSeatPlan.stripe_price_id_monthly;

    if (!priceId) {
      return NextResponse.json(
        {
          error: `No price found for additional seats with billing interval: ${billingInterval}`,
        },
        { status: 400 }
      );
    }

    // Get the Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    // Check if there's already an additional seat item in the subscription
    const existingAdditionalSeatItem = stripeSubscription.items.data.find(
      (item) => item.price.product === additionalSeatPlan.stripe_product_id
    );

    if (existingAdditionalSeatItem) {
      // If there's already an additional seat item, update its quantity
      const newQuantity = existingAdditionalSeatItem.quantity + seatsToAdd;

      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [
          {
            id: existingAdditionalSeatItem.id,
            quantity: newQuantity,
          },
        ],
      });
    } else {
      // If there's no additional seat item, add a new one
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [
          {
            price: priceId,
            quantity: seatsToAdd,
          },
        ],
      });
    }

    // Calculate the new total of additional seats
    const currentAdditionalSeats = subscription.additional_seats || 0;
    const newAdditionalSeats = currentAdditionalSeats + seatsToAdd;

    // Update the subscription in our database
    const { error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update({
        additional_seats: newAdditionalSeats,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Error updating subscription:", updateError);
      return NextResponse.json(
        { error: "Failed to update subscription in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${seatsToAdd} additional seat(s)`,
      additional_seats: newAdditionalSeats,
    });
  } catch (error: Error | unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error adding seats:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to add seats" },
      { status: 500 }
    );
  }
}

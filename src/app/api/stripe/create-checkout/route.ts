import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthAndValidateWorkspaceAction } from "@/lib/server/workspace-actions";
import { getCurrentSubscription } from "@/lib/server/subscription-actions";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Initialize Stripe with the latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-03-31.basil", // Latest stable version as of now
});

// POST: Create a Stripe Checkout session for a subscription
export async function POST(request: NextRequest) {
  try {
    const { planId, workspaceId, billingInterval } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    if (!billingInterval || !["monthly", "yearly"].includes(billingInterval)) {
      return NextResponse.json(
        { error: "Valid billing interval (monthly or yearly) is required" },
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

    // Fetch the subscription plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError) {
      console.error("Error fetching subscription plan:", planError);
      return NextResponse.json(
        { error: "Failed to fetch subscription plan" },
        { status: 500 }
      );
    }

    // Get the appropriate price ID based on the billing interval
    const priceId =
      billingInterval === "monthly"
        ? plan.stripe_price_id_monthly
        : plan.stripe_price_id_yearly;

    if (!priceId) {
      return NextResponse.json(
        { error: `No ${billingInterval} price found for this plan` },
        { status: 400 }
      );
    }

    // Fetch the workspace to get or create a Stripe customer
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("stripe_customer_id, name, contact_email")
      .eq("id", workspaceId)
      .single();

    if (workspaceError) {
      console.error("Error fetching workspace:", workspaceError);
      return NextResponse.json(
        { error: "Failed to fetch workspace" },
        { status: 500 }
      );
    }

    let stripeCustomerId = workspace.stripe_customer_id;

    // If the workspace doesn't have a Stripe customer ID, create one
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: workspace.name || undefined,
        email: workspace.contact_email || undefined,
        metadata: {
          workspace_id: workspaceId,
        },
      });

      stripeCustomerId = customer.id;

      // Update the workspace with the Stripe customer ID
      const { error: updateError } = await supabaseAdmin
        .from("workspaces")
        .update({
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workspaceId);

      if (updateError) {
        console.error("Error updating workspace:", updateError);
        return NextResponse.json(
          { error: "Failed to update workspace" },
          { status: 500 }
        );
      }
    }

    // Check if the workspace already has an active subscription
    const currentSubscription = await getCurrentSubscription(workspaceId);

    // If there's an existing subscription with a Stripe subscription ID, update it instead of creating a new one
    if (currentSubscription?.stripe_subscription_id) {
      try {
        // Retrieve the existing subscription from Stripe
        const existingSubscription = await stripe.subscriptions.retrieve(
          currentSubscription.stripe_subscription_id
        );

        // If the subscription is active or trialing, update it instead of creating a new one
        if (["active", "trialing"].includes(existingSubscription.status)) {
          console.log(
            `Updating existing subscription ${existingSubscription.id} to plan ${planId}`
          );

          // Get the subscription item ID
          const subscriptionItemId = existingSubscription.items.data[0]?.id;

          if (!subscriptionItemId) {
            throw new Error("No subscription item found");
          }

          // Check if the billing interval is changing
          const currentBillingInterval = currentSubscription.billing_interval;
          const newBillingInterval =
            billingInterval === "monthly" ? "month" : "year";
          const isBillingIntervalChanging =
            currentBillingInterval !== newBillingInterval;

          // If the billing interval is changing, we need to create a new subscription
          // because Stripe resets the billing cycle anchor when the interval changes
          if (isBillingIntervalChanging) {
            console.log(
              `Billing interval changing from ${currentBillingInterval} to ${newBillingInterval}. Creating new subscription.`
            );

            // Check if the current subscription has additional seats
            const additionalSeats = currentSubscription.additional_seats || 0;

            // If there are additional seats, we need to include them in the new subscription
            if (additionalSeats > 0) {
              console.log(
                `Current subscription has ${additionalSeats} additional seats`
              );

              // Fetch the additional seat plan
              const { data: additionalSeatPlan, error: planError } =
                await supabaseAdmin
                  .from("subscription_plans")
                  .select("*")
                  .ilike("name", "%Additional Seat%")
                  .single();

              if (planError || !additionalSeatPlan) {
                console.error(
                  "Error fetching additional seat plan:",
                  planError
                );
                throw new Error("Failed to fetch additional seat plan");
              }

              // Get the appropriate price ID based on the new billing interval
              const additionalSeatPriceId =
                newBillingInterval === "year"
                  ? additionalSeatPlan.stripe_price_id_yearly
                  : additionalSeatPlan.stripe_price_id_monthly;

              if (!additionalSeatPriceId) {
                console.error(
                  `No price found for additional seats with billing interval: ${newBillingInterval}`
                );
                throw new Error(
                  `No price found for additional seats with billing interval: ${newBillingInterval}`
                );
              }

              // Create a new checkout session with both the new plan and the additional seats
              const session = await stripe.checkout.sessions.create({
                customer: stripeCustomerId,
                payment_method_types: ["card"],
                line_items: [
                  {
                    price: priceId,
                    quantity: 1,
                  },
                  {
                    price: additionalSeatPriceId,
                    quantity: additionalSeats,
                  },
                ],
                mode: "subscription",
                subscription_data: {
                  // Only apply trial period for new customers, not for existing customers changing plans
                  trial_period_days:
                    existingSubscription.status === "trialing" &&
                    existingSubscription.trial_end
                      ? // If still in trial, calculate remaining days
                        Math.ceil(
                          (existingSubscription.trial_end -
                            Math.floor(Date.now() / 1000)) /
                            (60 * 60 * 24)
                        )
                      : // If not in trial or trial ended, don't apply a new trial
                        undefined,
                  metadata: {
                    workspace_id: workspaceId,
                    plan_id: planId,
                    additional_seats: additionalSeats,
                    is_billing_interval_change: "true",
                    old_subscription_id:
                      currentSubscription.stripe_subscription_id,
                  },
                },
                success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions?checkout_success=true`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions`,
                metadata: {
                  workspace_id: workspaceId,
                  plan_id: planId,
                  billing_interval: newBillingInterval,
                  additional_seats: additionalSeats,
                  is_billing_interval_change: "true",
                  old_subscription_id:
                    currentSubscription.stripe_subscription_id,
                },
              });

              return NextResponse.json({ url: session.url });
            }

            // If no additional seats, create a new checkout session without additional seats
            const session = await stripe.checkout.sessions.create({
              customer: stripeCustomerId,
              payment_method_types: ["card"],
              line_items: [
                {
                  price: priceId,
                  quantity: 1,
                },
              ],
              mode: "subscription",
              subscription_data: {
                // Only apply trial period for new customers, not for existing customers changing plans
                trial_period_days:
                  existingSubscription.status === "trialing"
                    ? // If still in trial, calculate remaining days
                      Math.ceil(
                        (existingSubscription.trial_end
                          ? existingSubscription.trial_end -
                            Math.floor(Date.now() / 1000)
                          : 0) /
                          (60 * 60 * 24)
                      ) || undefined
                    : // If not in trial or trial ended, don't apply a new trial
                      undefined,
                metadata: {
                  workspace_id: workspaceId,
                  plan_id: planId,
                  is_billing_interval_change: "true",
                  old_subscription_id:
                    currentSubscription.stripe_subscription_id,
                },
              },
              success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions?checkout_success=true`,
              cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions`,
              metadata: {
                workspace_id: workspaceId,
                plan_id: planId,
                billing_interval: newBillingInterval,
                is_billing_interval_change: "true",
                old_subscription_id: currentSubscription.stripe_subscription_id,
              },
            });

            return NextResponse.json({ url: session.url });
          } else {
            // If the billing interval is not changing, update the existing subscription
            const updateParams: Stripe.SubscriptionUpdateParams = {
              items: [
                {
                  id: subscriptionItemId,
                  price: priceId,
                },
              ],
              metadata: {
                workspace_id: workspaceId,
                plan_id: planId,
              },
            };

            // Only set trial_end if the subscription is currently in trial
            if (existingSubscription.status === "trialing") {
              // Make sure trial_end is in the future
              const now = Math.floor(Date.now() / 1000);
              if (
                existingSubscription.trial_end &&
                existingSubscription.trial_end > now
              ) {
                updateParams.trial_end = existingSubscription.trial_end;
              } else {
                // If trial has ended or is invalid, end trial immediately
                updateParams.trial_end = "now";
              }
            }

            const updatedSubscription = await stripe.subscriptions.update(
              existingSubscription.id,
              updateParams
            );

            // Update the subscription in our database
            await supabaseAdmin
              .from("subscriptions")
              .update({
                subscription_plan_id: planId,
                billing_interval: newBillingInterval,
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", updatedSubscription.id);

            // Get the updated subscription data to return to the client
            const { data: updatedSubscriptionData } = await supabaseAdmin
              .from("subscriptions")
              .select("*, subscription_plans(*)")
              .eq("stripe_subscription_id", updatedSubscription.id)
              .single();

            // Return the updated subscription data directly instead of a URL
            return NextResponse.json({
              success: true,
              updated: true,
              subscription: updatedSubscriptionData,
              message: "Subscription updated successfully",
            });
          }
        }
      } catch (error) {
        console.error("Error updating existing subscription:", error);
        // If there's an error updating the subscription, fall back to creating a new one
      }
    }

    // If no existing subscription or it couldn't be updated, create a new checkout session

    // Check if the customer has had a subscription before
    const { data: previousSubscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1);

    // Only apply trial period for first-time subscribers
    const isFirstTimeSubscriber =
      !previousSubscriptions || previousSubscriptions.length === 0;

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        // Only apply trial period for first-time subscribers
        trial_period_days: isFirstTimeSubscriber
          ? plan.trial_period_days || undefined
          : undefined,
        metadata: {
          workspace_id: workspaceId,
          plan_id: planId,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions?checkout_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions`,
      metadata: {
        workspace_id: workspaceId,
        plan_id: planId,
        billing_interval:
          billingInterval === "monthly"
            ? "month"
            : billingInterval === "yearly"
              ? "year"
              : billingInterval,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

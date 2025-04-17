import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Initialize Stripe with the latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-03-31.basil",
});

// POST: Handle Stripe webhook events
export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    console.log(`Received webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error handling webhook event:", error);
    return NextResponse.json(
      { error: "Error handling webhook event" },
      { status: 500 }
    );
  }
}

// Handle subscription updated event
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Get the workspace ID from the subscription metadata
  const workspaceId = subscription.metadata?.workspace_id;
  // Get the plan ID from the subscription metadata
  const planId = subscription.metadata?.plan_id;

  if (!workspaceId) {
    console.error("No workspace ID found in subscription metadata");
    return;
  }

  // Define subscription update type
  type SubscriptionUpdateData = {
    status: string;
    trial_ends_at: string | null;
    current_period_start: string;
    current_period_end: string;
    billing_interval: "month" | "year";
    updated_at: string;
    cancel_at_period_end: boolean;
    usage_billing_start?: string;
    usage_billing_end?: string;
    subscription_plan_id?: string;
  };

  // Get the current billing interval from the Stripe subscription
  const newBillingInterval =
    subscription.items.data[0]?.plan.interval === "year" ? "year" : "month";

  // Prepare update data
  const updateData: SubscriptionUpdateData = {
    status: subscription.status,
    trial_ends_at: subscription.trial_end
      ? new Date(Number(subscription.trial_end) * 1000).toISOString()
      : null,
    // Use the actual period dates from Stripe with proper error handling
    current_period_start: subscription.items.data[0]?.current_period_start
      ? new Date(
          subscription.items.data[0].current_period_start * 1000
        ).toISOString()
      : new Date().toISOString(),
    current_period_end: subscription.items.data[0]?.current_period_end
      ? new Date(
          subscription.items.data[0].current_period_end * 1000
        ).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    // Set the billing interval
    billing_interval: newBillingInterval,
    updated_at: new Date().toISOString(),
    // Track whether the subscription is set to cancel at period end
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  // If we have a plan ID in the metadata, update the subscription plan ID
  if (planId) {
    updateData.subscription_plan_id = planId;
    console.log(`Updating subscription plan to ${planId}`);
  }

  // Get the current subscription record to check previous status and billing interval
  const { data: currentSubscription } = await supabaseAdmin
    .from("subscriptions")
    .select(
      "status, usage_billing_start, usage_billing_end, billing_interval, additional_seats"
    )
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  // If subscription status changed to active, set usage billing periods
  if (subscription.status === "active") {
    // Only set usage billing periods if they're not already set or status just changed to active
    if (
      !currentSubscription?.usage_billing_start ||
      currentSubscription.status !== "active"
    ) {
      updateData.usage_billing_start = new Date().toISOString();
      updateData.usage_billing_end = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(); // 30 days from now
      console.log(
        "Setting usage billing periods for newly active subscription"
      );
    }
  }

  // Check if billing interval has changed and there are additional seats
  if (
    currentSubscription &&
    currentSubscription.billing_interval !== newBillingInterval &&
    currentSubscription.additional_seats &&
    currentSubscription.additional_seats > 0
  ) {
    console.log(
      `Billing interval changed from ${currentSubscription.billing_interval} to ${newBillingInterval}`
    );
    console.log(
      `Subscription has ${currentSubscription.additional_seats} additional seats that need updating`
    );

    try {
      // Fetch the additional seat plan
      const { data: additionalSeatPlan, error: planError } = await supabaseAdmin
        .from("subscription_plans")
        .select("*")
        .ilike("name", "%Additional Seat%")
        .single();

      if (planError || !additionalSeatPlan) {
        console.error("Error fetching additional seat plan:", planError);
        throw new Error("Failed to fetch additional seat plan");
      }

      // Get the appropriate price ID based on the new billing interval
      const newPriceId =
        newBillingInterval === "year"
          ? additionalSeatPlan.stripe_price_id_yearly
          : additionalSeatPlan.stripe_price_id_monthly;

      if (!newPriceId) {
        console.error(
          `No price found for additional seats with billing interval: ${newBillingInterval}`
        );
        throw new Error(
          `No price found for additional seats with billing interval: ${newBillingInterval}`
        );
      }

      // Find the additional seat item in the subscription
      const additionalSeatItem = subscription.items.data.find(
        (item) => item.price.product === additionalSeatPlan.stripe_product_id
      );

      if (additionalSeatItem) {
        console.log(
          `Found additional seat item with ID ${additionalSeatItem.id}, updating to use price ${newPriceId}`
        );

        // Update the additional seat item to use the new price ID
        await stripe.subscriptions.update(subscription.id, {
          items: [
            {
              id: additionalSeatItem.id,
              price: newPriceId,
              quantity: additionalSeatItem.quantity,
            },
          ],
        });

        console.log(
          `Successfully updated additional seat price to match new billing interval`
        );
      } else {
        console.log(
          `No additional seat item found in the Stripe subscription, but database shows ${currentSubscription.additional_seats} seats`
        );
      }
    } catch (error) {
      console.error("Error updating additional seat price:", error);
      // Continue with the subscription update even if updating the additional seat price fails
    }
  }

  // Update the subscription record in the database
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update(updateData)
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error updating subscription record:", error);
    throw error;
  }

  // Update the workspace subscription status
  const { error: workspaceError } = await supabaseAdmin
    .from("workspaces")
    .update({
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  if (workspaceError) {
    console.error(
      "Error updating workspace subscription status:",
      workspaceError
    );
    throw workspaceError;
  }
}

// Handle subscription deleted event
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Get the workspace ID from the subscription metadata
  const workspaceId = subscription.metadata?.workspace_id;

  if (!workspaceId) {
    console.error("No workspace ID found in subscription metadata");
    return;
  }

  console.log(
    `Subscription ${subscription.id} has been deleted or has ended after being canceled`
  );

  // Update the subscription record in the database
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: subscription.status,
      updated_at: new Date().toISOString(),
      cancel_at_period_end: false, // Reset this flag since the subscription is now fully canceled
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error updating subscription record:", error);
    throw error;
  }

  // Update the workspace subscription status
  const { error: workspaceError } = await supabaseAdmin
    .from("workspaces")
    .update({
      subscription_status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  if (workspaceError) {
    console.error(
      "Error updating workspace subscription status:",
      workspaceError
    );
    throw workspaceError;
  }
}

// Handle invoice paid event
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // If this is a subscription invoice, update the subscription record
  if ("subscription" in invoice && invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    );

    // Get the workspace ID from the subscription metadata
    const workspaceId = subscription.metadata?.workspace_id;

    if (!workspaceId) {
      console.error("No workspace ID found in subscription metadata");
      return;
    }

    // Update the subscription record in the database
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: subscription.status,
        updated_at: new Date().toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Error updating subscription record:", error);
      throw error;
    }

    // Update the workspace subscription status
    const { error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .update({
        subscription_status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);

    if (workspaceError) {
      console.error(
        "Error updating workspace subscription status:",
        workspaceError
      );
      throw workspaceError;
    }
  }
}

// Handle checkout session completed event
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log("Processing checkout.session.completed event", session.id);

  // Get the workspace ID, plan ID, and additional seats from the session metadata
  const workspaceId = session.metadata?.workspace_id;
  const planId = session.metadata?.plan_id;
  const additionalSeats = session.metadata?.additional_seats
    ? parseInt(session.metadata.additional_seats)
    : 0;
  const isBillingIntervalChange =
    session.metadata?.is_billing_interval_change === "true";
  const oldSubscriptionId = session.metadata?.old_subscription_id;

  // Require workspace ID and plan ID in metadata
  if (!workspaceId || !planId) {
    console.error("Missing required metadata in checkout session", session.id);
    return;
  }

  // Get the subscription from the session
  if (!session.subscription) {
    console.error("No subscription found in checkout session", session.id);
    return;
  }

  // Retrieve the full subscription details
  const subscription = await stripe.subscriptions.retrieve(
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id
  );

  console.log("Retrieved subscription", subscription.id);

  // Check if we already have a subscription record for this workspace and subscription ID
  const { data: existingSubscriptionForStripeId } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  // Define subscription data type
  type SubscriptionData = {
    workspace_id: string;
    subscription_plan_id: string;
    stripe_subscription_id: string;
    status: string;
    trial_ends_at: string | null;
    current_period_start: string;
    current_period_end: string;
    billing_interval: "month" | "year";
    usage_billing_start: string | null;
    usage_billing_end: string | null;
    updated_at: string;
    cancel_at_period_end: boolean;
    created_at?: string;
    additional_seats?: number | null;
  };

  // Prepare the subscription data
  const subscriptionData: SubscriptionData = {
    workspace_id: workspaceId,
    subscription_plan_id: planId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    trial_ends_at: subscription.trial_end
      ? new Date(Number(subscription.trial_end) * 1000).toISOString()
      : null,
    // Use the actual period dates from Stripe with proper error handling
    current_period_start: subscription.items.data[0]?.current_period_start
      ? new Date(
          Number(subscription.items.data[0].current_period_start) * 1000
        ).toISOString()
      : new Date().toISOString(),
    current_period_end: subscription.items.data[0]?.current_period_end
      ? new Date(
          Number(subscription.items.data[0].current_period_end) * 1000
        ).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    // Get the billing interval from the Stripe subscription
    billing_interval:
      subscription.items.data[0]?.plan.interval === "year" ? "year" : "month",
    // Set usage billing periods based on subscription status
    usage_billing_start:
      subscription.status === "active" ? new Date().toISOString() : null,
    usage_billing_end:
      subscription.status === "active"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Always set to 30 days from now for usage tracking
        : null,
    updated_at: new Date().toISOString(),
    // Track whether the subscription is set to cancel at period end
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    // Include additional seats if specified in the metadata
    additional_seats: additionalSeats > 0 ? additionalSeats : null,
  };

  // If we already have a record for this Stripe subscription ID, update it
  if (existingSubscriptionForStripeId) {
    console.log("Updating existing subscription record for", subscription.id);

    const { error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update(subscriptionData)
      .eq("id", existingSubscriptionForStripeId.id);

    if (updateError) {
      console.error("Error updating subscription record:", updateError);
      throw updateError;
    }

    console.log("Successfully updated subscription record");
  } else {
    // If we don't have a record for this Stripe subscription ID, create a new one
    console.log("Creating new subscription record for", subscription.id);

    // Add created_at for new records
    subscriptionData.created_at = new Date().toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("subscriptions")
      .insert(subscriptionData);

    if (insertError) {
      console.error("Error creating subscription record:", insertError);
      throw insertError;
    }

    console.log("Successfully created subscription record");
  }

  // Update the workspace subscription status
  const { error: workspaceError } = await supabaseAdmin
    .from("workspaces")
    .update({
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  if (workspaceError) {
    console.error(
      "Error updating workspace subscription status:",
      workspaceError
    );
    throw workspaceError;
  }

  console.log("Successfully updated workspace subscription status");

  // If this is a billing interval change, cancel the old subscription
  if (isBillingIntervalChange && oldSubscriptionId) {
    try {
      console.log(
        `Canceling old subscription ${oldSubscriptionId} due to billing interval change`
      );

      // Cancel the old subscription at period end to avoid immediate cancellation
      await stripe.subscriptions.update(oldSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update the old subscription record in our database
      const { error: cancelError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", oldSubscriptionId);

      if (cancelError) {
        console.error("Error updating old subscription record:", cancelError);
        // Don't throw here, as we've already created the new subscription
      } else {
        console.log(
          `Successfully marked old subscription ${oldSubscriptionId} for cancellation`
        );
      }
    } catch (error) {
      console.error("Error canceling old subscription:", error);
      // Don't throw here, as we've already created the new subscription
    }
  }
}

// Handle invoice payment failed event
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // If this is a subscription invoice, update the subscription record
  if ("subscription" in invoice && invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    );

    // Get the workspace ID from the subscription metadata
    const workspaceId = subscription.metadata?.workspace_id;

    if (!workspaceId) {
      console.error("No workspace ID found in subscription metadata");
      return;
    }

    // Update the subscription record in the database
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: subscription.status,
        updated_at: new Date().toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Error updating subscription record:", error);
      throw error;
    }

    // Update the workspace subscription status
    const { error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .update({
        subscription_status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);

    if (workspaceError) {
      console.error(
        "Error updating workspace subscription status:",
        workspaceError
      );
      throw workspaceError;
    }
  }
}

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

// POST: Handle Stripe Connect webhook events
export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    // Use a dedicated secret for Connect webhooks
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET as string 
    );
  } catch (err) {
    console.error("Connect Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Connect Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    console.log(`Received Connect webhook event: ${event.type}`);

    switch (event.type) {
      case "account.updated":
        await handleConnectAccountUpdated(event.data.object as Stripe.Account);
        break;
      default:
        console.log(`Unhandled Connect event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error handling Connect webhook event:", error);
    return NextResponse.json(
      { error: "Error handling Connect webhook event" },
      { status: 500 }
    );
  }
}

// Handle Connect account updated event
async function handleConnectAccountUpdated(account: Stripe.Account) {
  // Find the workspace associated with this Connect account
  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from("workspaces")
    .select("id, stripe_connect_onboarding_complete")
    .eq("stripe_connect_account_id", account.id)
    .single();

  if (workspaceError || !workspace) {
    console.error(
      "Error finding workspace for Connect account:",
      workspaceError
    );
    // It's possible the event fires before the workspace record is fully updated,
    // so maybe don't throw an error, just log and return. Adjust as needed.
    return;
  }

  console.log(`Processing account.updated event for workspace ${workspace.id}`);

  // Check if the account has completed onboarding
  // For Standard accounts, we check if charges_enabled is true
  const onboardingComplete = account.charges_enabled === true;

  // Only update if the onboarding status has changed
  if (workspace.stripe_connect_onboarding_complete !== onboardingComplete) {
    console.log(`Updating Connect onboarding status to ${onboardingComplete}`);

    const { error: updateError } = await supabaseAdmin
      .from("workspaces")
      .update({
        stripe_connect_onboarding_complete: onboardingComplete,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspace.id);

    if (updateError) {
      console.error("Error updating workspace Connect status:", updateError);
      throw updateError;
    }

    console.log(
      `Successfully updated Connect onboarding status for workspace ${workspace.id}`
    );
  } else {
     console.log(`Connect onboarding status for workspace ${workspace.id} is already ${onboardingComplete}. No update needed.`);
  }
} 
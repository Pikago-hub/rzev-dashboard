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

// POST: Create a Stripe Connect account link for onboarding
export async function POST(request: NextRequest) {
  try {
    const { workspaceId } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    // Get authorization and validate workspace access (owner required for Connect account management)
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

    // Fetch the workspace to get the Connect account ID
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("stripe_connect_account_id, stripe_connect_onboarding_complete")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      console.error("Error fetching workspace:", workspaceError);
      return NextResponse.json(
        { error: "Failed to fetch workspace" },
        { status: 500 }
      );
    }

    // Check if the workspace has a Connect account ID
    if (!workspace.stripe_connect_account_id) {
      return NextResponse.json(
        { error: "No Stripe Connect account found for this workspace" },
        { status: 400 }
      );
    }

    // Determine the type of account link to create
    const linkType = workspace.stripe_connect_onboarding_complete
      ? "account_update" // For updating existing account information
      : "account_onboarding"; // For initial onboarding

    // Create an account link for the Connect account
    const accountLink = await stripe.accountLinks.create({
      account: workspace.stripe_connect_account_id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=business&refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=business&success=true`,
      type: linkType,
      collection_options: {
        fields: "eventually_due", // Collect all information upfront
      },
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Error creating account link:", error);
    return NextResponse.json(
      { error: "Failed to create account link" },
      { status: 500 }
    );
  }
}

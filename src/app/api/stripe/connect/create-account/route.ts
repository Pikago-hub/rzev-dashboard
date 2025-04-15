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

// POST: Create a Stripe Connect account for a workspace
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

    // Fetch the workspace to get business information
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      console.error("Error fetching workspace:", workspaceError);
      return NextResponse.json(
        { error: "Failed to fetch workspace" },
        { status: 500 }
      );
    }

    // Check if the workspace already has a Connect account
    if (workspace.stripe_connect_account_id) {
      // Fetch the account to check its status
      const account = await stripe.accounts.retrieve(
        workspace.stripe_connect_account_id
      );

      // If the account exists, return it
      return NextResponse.json({
        accountId: account.id,
        onboardingComplete:
          workspace.stripe_connect_onboarding_complete || false,
      });
    }

    // Create a new Connect account
    // Using Standard account type for full dashboard access
    const account = await stripe.accounts.create({
      type: "standard",
      business_type: "company", // Default to company, can be updated during onboarding
      business_profile: {
        name: workspace.name || undefined,
        url: workspace.website || undefined,
        support_email: workspace.contact_email || undefined,
        support_phone: workspace.contact_phone || undefined,
      },
      metadata: {
        workspace_id: workspaceId,
      },
    });

    // Update the workspace with the Connect account ID
    const { error: updateError } = await supabaseAdmin
      .from("workspaces")
      .update({
        stripe_connect_account_id: account.id,
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

    return NextResponse.json({
      accountId: account.id,
      onboardingComplete: false,
    });
  } catch (error) {
    console.error("Error creating Connect account:", error);
    return NextResponse.json(
      { error: "Failed to create Connect account" },
      { status: 500 }
    );
  }
}

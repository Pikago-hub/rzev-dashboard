import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthAndValidateWorkspaceAction } from "@/lib/server/workspace-actions";
import { createCustomerPortalSession } from "@/lib/stripe-utils";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// POST: Create a Stripe Customer Portal session
export async function POST(request: NextRequest) {
  try {
    const { workspaceId } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
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

    // Fetch the workspace to get the Stripe customer ID
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("stripe_customer_id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      console.error("Error fetching workspace:", workspaceError);
      return NextResponse.json(
        { error: "Failed to fetch workspace" },
        { status: 500 }
      );
    }

    // Check if the workspace has a Stripe customer ID
    if (!workspace.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found for this workspace" },
        { status: 400 }
      );
    }

    // Create a Stripe Customer Portal session
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions`;
    const session = await createCustomerPortalSession(
      workspace.stripe_customer_id,
      returnUrl
    );

    // Return the URL to redirect to
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

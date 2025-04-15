import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthAndValidateWorkspaceAction } from "@/lib/server/workspace-actions";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// POST: Create a Stripe login link for a connected account
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

    // Check if the Connect account has completed onboarding
    if (!workspace.stripe_connect_onboarding_complete) {
      return NextResponse.json(
        { error: "Stripe Connect onboarding is not complete" },
        { status: 400 }
      );
    }

    // Redirect users to the Stripe dashboard directly
    // Standard accounts can access their dashboard at https://dashboard.stripe.com/
    const dashboardUrl = `https://dashboard.stripe.com/${workspace.stripe_connect_account_id}`;

    return NextResponse.json({ url: dashboardUrl });
  } catch (error) {
    console.error("Error creating login link:", error);
    return NextResponse.json(
      { error: "Failed to create login link" },
      { status: 500 }
    );
  }
}

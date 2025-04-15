import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthAndValidateWorkspaceAction,
  getAuthUserWorkspace,
} from "@/lib/server/workspace-actions";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// GET: Check if a workspace is ready to go live
export async function GET(request: NextRequest) {
  try {
    // Get workspaceId from query params
    const url = new URL(request.url);
    let workspaceId = url.searchParams.get("workspaceId");

    // If no workspace ID is provided, try to get it from the authenticated user
    if (!workspaceId) {
      const authResult = await getAuthUserWorkspace(request);

      if (authResult.error || !authResult.workspaceId) {
        return NextResponse.json(
          { error: authResult.error || "Could not determine workspace ID" },
          { status: authResult.status || 400 }
        );
      }

      workspaceId = authResult.workspaceId;
    }

    // Get authorization and validate workspace access
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

    // Check if workspace is already live
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("active_status")
      .eq("id", workspaceId)
      .single();

    const isLive = workspace?.active_status === true;

    // Run validation checks
    const validationResults = await runGoLiveValidations(workspaceId);

    return NextResponse.json({
      isLive,
      isReadyToGoLive: validationResults.success,
      validationErrors: validationResults.errors,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Toggle a workspace's active status (activate or deactivate)
export async function POST(request: NextRequest) {
  try {
    // Try to get workspaceId from request body
    const body = await request.json().catch(() => ({}));
    let workspaceId = body.workspaceId;
    const forceDeactivate = body.deactivate === true;

    // If no workspace ID is provided, try to get it from the authenticated user
    if (!workspaceId) {
      const authResult = await getAuthUserWorkspace(request);

      if (authResult.error || !authResult.workspaceId) {
        return NextResponse.json(
          { error: authResult.error || "Could not determine workspace ID" },
          { status: authResult.status || 400 }
        );
      }

      workspaceId = authResult.workspaceId;
    }

    // Get authorization and validate workspace access (owner required)
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

    // Get current workspace status
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("active_status")
      .eq("id", workspaceId)
      .single();

    const isCurrentlyActive = workspace?.active_status === true;

    // If we're trying to activate and it's currently inactive, run validation checks
    if (!isCurrentlyActive && !forceDeactivate) {
      // Run validation checks
      const validationResults = await runGoLiveValidations(workspaceId);

      if (!validationResults.success) {
        return NextResponse.json(
          {
            error: "Workspace is not ready to go live",
            validationErrors: validationResults.errors,
          },
          { status: 400 }
        );
      }
    }

    // Toggle the active_status (or force deactivate if requested)
    const newActiveStatus = forceDeactivate ? false : !isCurrentlyActive;

    // Update workspace active_status
    const { error: updateError } = await supabaseAdmin
      .from("workspaces")
      .update({
        active_status: newActiveStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);

    if (updateError) {
      console.error("Error updating workspace:", updateError);
      return NextResponse.json(
        { error: "Failed to update workspace status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isActive: newActiveStatus,
      message: newActiveStatus
        ? "Workspace is now live and accepting bookings"
        : "Workspace has been deactivated and is no longer accepting bookings",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Function to run all validation checks
async function runGoLiveValidations(workspaceId: string) {
  const errors = [];

  // 1. Check for active services and variants
  const { data: services } = await supabaseAdmin
    .from("services")
    .select("id, active, service_variants(id, active)")
    .eq("workspace_id", workspaceId)
    .eq("active", true);

  const hasActiveServices = services && services.length > 0;
  const hasActiveVariants =
    services &&
    services.some(
      (service) =>
        service.service_variants &&
        service.service_variants.some((variant) => variant.active)
    );

  if (!hasActiveServices || !hasActiveVariants) {
    errors.push(
      "At least one active service with an active variant is required"
    );
  }

  // 2. Check subscription status
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("status, trial_ends_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const hasValidSubscription =
    subscription &&
    (subscription.status === "active" ||
      (subscription.status === "trialing" &&
        new Date(subscription.trial_ends_at) > new Date()));

  if (!hasValidSubscription) {
    errors.push("An active subscription or valid trial is required");
  }

  // 3. Check Stripe Connect status
  const { data: workspace } = await supabaseAdmin
    .from("workspaces")
    .select("stripe_connect_account_id, stripe_connect_onboarding_complete")
    .eq("id", workspaceId)
    .single();

  const hasStripeConnect =
    workspace &&
    workspace.stripe_connect_account_id &&
    workspace.stripe_connect_onboarding_complete;

  if (!hasStripeConnect) {
    errors.push("Stripe Connect onboarding must be completed");
  }

  // 4. Check operating hours
  const { data: workspaceWithHours } = await supabaseAdmin
    .from("workspaces")
    .select("operating_hours")
    .eq("id", workspaceId)
    .single();

  const hasOperatingHours =
    workspaceWithHours &&
    workspaceWithHours.operating_hours &&
    Object.keys(workspaceWithHours.operating_hours).length > 0;

  if (!hasOperatingHours) {
    errors.push("Operating hours must be defined");
  }

  // 5. Check essential business info
  const { data: workspaceInfo } = await supabaseAdmin
    .from("workspaces")
    .select("name, contact_email, contact_phone")
    .eq("id", workspaceId)
    .single();

  const hasEssentialInfo =
    workspaceInfo &&
    workspaceInfo.name &&
    workspaceInfo.contact_email &&
    workspaceInfo.contact_phone;

  if (!hasEssentialInfo) {
    errors.push(
      "Essential business information (name, email, phone) must be complete"
    );
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

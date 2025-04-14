import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/auth-utils";
import { getAuthAndValidateWorkspaceAction } from "@/lib/server/workspace-actions";

// GET: Fetch current usage for a workspace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
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

    // 1. Get the current subscription with plan details
    const { data: subscriptionData, error: subscriptionError } =
      await supabaseAdmin
        .from("subscriptions")
        .select("*, subscription_plans(*)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (subscriptionError) {
      console.error("Error fetching subscription:", subscriptionError);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 }
      );
    }

    if (!subscriptionData) {
      return NextResponse.json(
        { error: "No subscription found for this workspace" },
        { status: 404 }
      );
    }

    // Extract subscription and plan details
    const subscription = subscriptionData;
    const plan = subscription.subscription_plans;

    // Calculate total seats (included + additional)
    const totalSeats =
      (plan?.included_seats || 0) + (subscription.additional_seats || 0);

    // 2. Get the current usage billing period
    const now = new Date();
    const usageBillingStart = subscription.usage_billing_start
      ? new Date(subscription.usage_billing_start)
      : null;
    const usageBillingEnd = subscription.usage_billing_end
      ? new Date(subscription.usage_billing_end)
      : null;

    // 3. Get the current usage for each resource type within the billing period
    const resourceTypes = ["seats", "messages", "emails", "call_minutes"];
    const usageData: Record<string, number> = {};

    // Initialize with zeros
    resourceTypes.forEach((type) => {
      usageData[type] = 0;
    });

    // Always count the number of active workspace members for seats, regardless of billing period
    // This is important for trial periods where usage billing periods might not be set yet
    const { data: workspaceMembers, error: membersError } = await supabaseAdmin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("active", true);

    if (membersError) {
      console.error("Error fetching workspace members:", membersError);
    } else {
      usageData.seats = workspaceMembers?.length || 0;
    }

    // For other resource types, only count if we have a valid usage billing period
    if (usageBillingStart && usageBillingEnd && now >= usageBillingStart) {
      // For other resource types, sum up the usage records within the billing period
      for (const type of resourceTypes.filter((t) => t !== "seats")) {
        const { data: records, error: recordsError } = await supabaseAdmin
          .from("usage_records")
          .select("quantity_used")
          .eq("workspace_id", workspaceId)
          .eq("resource_type", type)
          .gte("recorded_at", usageBillingStart.toISOString())
          .lte("recorded_at", usageBillingEnd.toISOString());

        if (recordsError) {
          console.error(`Error fetching ${type} usage:`, recordsError);
        } else if (records && records.length > 0) {
          usageData[type] = records.reduce(
            (sum, record) => sum + (record.quantity_used || 0),
            0
          );
        }
      }
    }

    // 4. Prepare the response with limits and usage
    const response = {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trial_ends_at: subscription.trial_ends_at,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        usage_billing_start: subscription.usage_billing_start,
        usage_billing_end: subscription.usage_billing_end,
        billing_interval: subscription.billing_interval,
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
      plan: {
        id: plan?.id,
        name: plan?.name,
        included_seats: plan?.included_seats || 0,
        max_messages: plan?.max_messages || 0,
        max_emails: plan?.max_emails || 0,
        max_call_minutes: plan?.max_call_minutes || 0,
      },
      limits: {
        seats: totalSeats,
        messages: plan?.max_messages || 0,
        emails: plan?.max_emails || 0,
        call_minutes: plan?.max_call_minutes || 0,
      },
      usage: usageData,
      billing_period: {
        start: subscription.usage_billing_start,
        end: subscription.usage_billing_end,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

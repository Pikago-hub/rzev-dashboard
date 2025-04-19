import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/auth-utils";
import { getAuthAndValidateWorkspaceAction } from "@/lib/server/workspace-actions";

// POST: Record usage for a workspace
export async function POST(request: NextRequest) {
  try {
    const { workspaceId, resourceType, quantity, userId } =
      await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    if (!resourceType) {
      return NextResponse.json(
        { error: "Resource type is required" },
        { status: 400 }
      );
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      );
    }

    // Get authorization and validate workspace access
    const auth = await getAuthAndValidateWorkspaceAction(
      request,
      workspaceId,
      "staff" // Allow staff members to record usage
    );

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Validate resource type
    const validResourceTypes = ["messages", "emails", "call_minutes"];
    if (!validResourceTypes.includes(resourceType)) {
      return NextResponse.json(
        { error: "Invalid resource type" },
        { status: 400 }
      );
    }

    // Check if the workspace has an active subscription
    const { data: subscriptionData, error: subscriptionError } =
      await supabaseAdmin
        .from("subscriptions")
        .select("id, status, usage_billing_start, usage_billing_end")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    // We use a separate variable that can be reassigned
    let subscription = subscriptionData;

    if (subscriptionError) {
      console.error("Error fetching subscription:", subscriptionError);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 }
      );
    }

    // Only record usage if there's an active subscription with usage billing periods set
    if (
      !subscription ||
      (subscription.status !== "active" && subscription.status !== "trialing")
    ) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Check if usage billing period has expired and trigger an update if needed
    if (
      subscription.status === "active" &&
      subscription.usage_billing_end &&
      new Date(subscription.usage_billing_end) < new Date()
    ) {
      console.log(
        `Usage billing period has expired for subscription ${subscription.id}, triggering update`
      );

      try {
        // Call the Edge Function to process the expired billing period
        const functionUrl = `${process.env.SUPABASE_URL}/functions/v1/process-usage-billing`;
        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });

        if (response.ok) {
          console.log("Successfully triggered billing cycle update");

          // Refetch the subscription with updated billing periods
          const { data: updatedSubscription, error: refetchError } =
            await supabaseAdmin
              .from("subscriptions")
              .select("id, status, usage_billing_start, usage_billing_end")
              .eq("id", subscription.id)
              .single();

          if (!refetchError && updatedSubscription) {
            subscription = updatedSubscription;
          }
        } else {
          console.error(
            "Failed to trigger billing cycle update:",
            await response.text()
          );
        }
      } catch (error) {
        console.error("Error triggering billing cycle update:", error);
        // Continue with the request even if the update fails
      }
    }

    // Check if usage billing periods are set
    if (!subscription.usage_billing_start || !subscription.usage_billing_end) {
      return NextResponse.json(
        { error: "No usage billing periods found for the subscription" },
        { status: 400 }
      );
    }

    // Check if recording this usage would exceed the plan limits
    // This applies to both active and trial subscriptions
    if (resourceType !== "seats") {
      // Seats are handled separately in team/member endpoint
      // Get the subscription plan details to check limits
      const { data: subscriptionWithPlan, error: planError } =
        await supabaseAdmin
          .from("subscriptions")
          .select("*, subscription_plans(*)")
          .eq("id", subscription.id)
          .single();

      if (planError) {
        console.error("Error fetching subscription plan:", planError);
        return NextResponse.json(
          { error: "Failed to fetch subscription plan details" },
          { status: 500 }
        );
      }

      const plan = subscriptionWithPlan.subscription_plans;

      // Get the limit for this resource type
      const resourceLimit = plan[`max_${resourceType}`] || 0;

      // If there's no limit, we don't need to check usage
      if (resourceLimit <= 0) {
        // No limit set, allow the usage
      } else {
        // Check if we have valid usage billing periods
        if (
          !subscription.usage_billing_start ||
          !subscription.usage_billing_end
        ) {
          console.warn(
            `No usage billing periods set for subscription ${subscription.id}`
          );
          // Even without billing periods, we still enforce limits during trial
          // We'll use the current period instead (trial period)

          // Get current usage for this resource type in the current period
          const { data: currentUsage, error: usageError } = await supabaseAdmin
            .from("usage_records")
            .select("quantity_used")
            .eq("workspace_id", workspaceId)
            .eq("resource_type", resourceType);

          if (usageError) {
            console.error(
              `Error fetching current ${resourceType} usage:`,
              usageError
            );
            return NextResponse.json(
              { error: `Failed to fetch current ${resourceType} usage` },
              { status: 500 }
            );
          }

          // Calculate total current usage
          const totalCurrentUsage = currentUsage
            ? currentUsage.reduce(
                (sum, record) => sum + (record.quantity_used || 0),
                0
              )
            : 0;

          // Check if adding this usage would exceed the limit
          if (totalCurrentUsage + quantity > resourceLimit) {
            const isTrialing = subscription.status === "trialing";
            return NextResponse.json(
              {
                error: isTrialing
                  ? `Usage limit reached. Your trial plan has a limit of ${resourceLimit} ${resourceType.replace("_", " ")}.`
                  : `Usage limit reached for ${resourceType.replace("_", " ")}`,
                limitReached: true,
                currentUsage: totalCurrentUsage,
                limit: resourceLimit,
                isTrialing: isTrialing,
              },
              { status: 403 }
            );
          }
        } else {
          // We have valid usage billing periods, use them for checking
          // Get current usage for this resource type in the current billing period
          const { data: currentUsage, error: usageError } = await supabaseAdmin
            .from("usage_records")
            .select("quantity_used")
            .eq("workspace_id", workspaceId)
            .eq("resource_type", resourceType)
            .gte("recorded_at", subscription.usage_billing_start)
            .lte("recorded_at", subscription.usage_billing_end);

          if (usageError) {
            console.error(
              `Error fetching current ${resourceType} usage:`,
              usageError
            );
            return NextResponse.json(
              { error: `Failed to fetch current ${resourceType} usage` },
              { status: 500 }
            );
          }

          // Calculate total current usage
          const totalCurrentUsage = currentUsage
            ? currentUsage.reduce(
                (sum, record) => sum + (record.quantity_used || 0),
                0
              )
            : 0;

          // Check if adding this usage would exceed the limit
          if (totalCurrentUsage + quantity > resourceLimit) {
            const isTrialing = subscription.status === "trialing";
            return NextResponse.json(
              {
                error: isTrialing
                  ? `Usage limit reached. Your trial plan has a limit of ${resourceLimit} ${resourceType.replace("_", " ")}.`
                  : `Usage limit reached for ${resourceType.replace("_", " ")}`,
                limitReached: true,
                currentUsage: totalCurrentUsage,
                limit: resourceLimit,
                isTrialing: isTrialing,
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // Record the usage
    const { data, error } = await supabaseAdmin
      .from("usage_records")
      .insert({
        workspace_id: workspaceId,
        resource_type: resourceType,
        quantity_used: quantity,
        recorded_at: new Date().toISOString(),
        created_by: userId || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error recording usage:", error);
      return NextResponse.json(
        { error: "Failed to record usage" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Usage recorded successfully",
      record: data,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

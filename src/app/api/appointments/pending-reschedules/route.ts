import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, validateWorkspaceAccess } from "@/lib/server/auth-utils";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// GET: Fetch appointments with pending reschedules for a workspace
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    // Validate required parameters
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    // Verify authentication
    const authResult = await getAuthUser(request);
    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Authentication required" },
        { status: 401 }
      );
    }

    // Verify user has access to the workspace
    const accessResult = await validateWorkspaceAccess(
      authResult.user.id,
      workspaceId
    );

    if (accessResult.error) {
      return NextResponse.json(
        {
          error:
            accessResult.error ||
            "You don't have permission to view appointments in this workspace",
        },
        { status: accessResult.status || 403 }
      );
    }

    // Fetch appointments with pending reschedules
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select(
        `
        id,
        workspace_id,
        team_member_id,
        service_id,
        service_variant_id,
        customer_id,
        status,
        date,
        start_time,
        end_time,
        duration,
        customer_name,
        customer_email,
        customer_phone,
        price,
        payment_status,
        notes,
        customer_notes,
        internal_notes,
        notification_status,
        created_at,
        updated_at,
        cancelled_at,
        metadata
      `
      )
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .not("metadata->pending_reschedule", "is", null);

    if (error) {
      console.error("Error fetching pending reschedules:", error);
      return NextResponse.json(
        { error: "Failed to fetch pending reschedules" },
        { status: 500 }
      );
    }

    return NextResponse.json({ appointments: data });
  } catch (error) {
    console.error("Error in pending-reschedules GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUser,
  supabaseAdmin,
  validateWorkspaceAccess,
} from "@/lib/server/auth-utils";

// POST: Confirm an appointment
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await getAuthUser(request);
    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { appointmentId, workspaceId } = body;

    // Validate required parameters
    if (!appointmentId) {
      return NextResponse.json(
        { error: "Appointment ID is required" },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
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
            "You don't have permission to confirm appointments in this workspace",
        },
        { status: accessResult.status || 403 }
      );
    }

    // Get the current timestamp for updated_at
    const now = new Date().toISOString();

    // Update the appointment status to confirmed
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .update({
        status: "confirmed",
        updated_at: now,
      })
      .eq("id", appointmentId)
      .eq("workspace_id", workspaceId)
      .eq("status", "pending") // Only confirm if it's currently pending
      .select();

    if (error) {
      console.error("Error confirming appointment:", error);
      return NextResponse.json(
        { error: "Failed to confirm appointment" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Appointment not found or already confirmed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment confirmed successfully",
      appointment: data[0],
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

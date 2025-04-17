import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUser,
  supabaseAdmin,
  validateWorkspaceAccess,
} from "@/lib/server/auth-utils";

// POST: Cancel an appointment
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
            "You don't have permission to cancel appointments in this workspace",
        },
        { status: accessResult.status || 403 }
      );
    }

    // Get the current timestamp for cancelled_at
    const now = new Date().toISOString();

    // Update the appointment status to cancelled
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .update({
        status: "cancelled",
        cancelled_at: now,
        updated_at: now,
      })
      .eq("id", appointmentId)
      .eq("workspace_id", workspaceId)
      .select();

    if (error) {
      console.error("Error cancelling appointment:", error);
      return NextResponse.json(
        { error: "Failed to cancel appointment" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Appointment not found or already cancelled" },
        { status: 404 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Appointment cancelled successfully",
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

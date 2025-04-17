import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, validateWorkspaceAccess } from "@/lib/server/auth-utils";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// POST: Decline a reschedule request
export async function POST(request: NextRequest) {
  try {
    const { appointmentId, workspaceId } = await request.json();

    // Validate required parameters
    if (!appointmentId || !workspaceId) {
      return NextResponse.json(
        { error: "Appointment ID and Workspace ID are required" },
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
            "You don't have permission to decline reschedules in this workspace",
        },
        { status: accessResult.status || 403 }
      );
    }

    // Get the current timestamp
    const now = new Date().toISOString();

    // First, get the appointment to check if it has a pending reschedule
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !appointment) {
      console.error("Error fetching appointment:", fetchError);
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Check if there's a pending reschedule
    if (!appointment.metadata?.pending_reschedule) {
      return NextResponse.json(
        { error: "No pending reschedule found for this appointment" },
        { status: 400 }
      );
    }

    const rescheduleHistory = appointment.metadata.reschedule_history || [];

    // Define a type for reschedule history entries
    type RescheduleHistoryEntry = {
      status: string;
      requested_at?: string;
      confirmed_at?: string;
      rejected_at?: string;
      notes?: string;
      old_date?: string;
      old_time?: string;
      new_date?: string;
      new_time?: string;
      [key: string]: unknown; // For any other properties
    };

    // Find the latest reschedule request in history
    const latestRescheduleIndex = rescheduleHistory.findIndex(
      (r: RescheduleHistoryEntry) => r.status === "customer_confirmed"
    );

    if (latestRescheduleIndex === -1) {
      return NextResponse.json(
        { error: "No customer-confirmed reschedule found in history" },
        { status: 400 }
      );
    }

    // Update the reschedule history entry
    const updatedRescheduleHistory = [...rescheduleHistory];
    updatedRescheduleHistory[latestRescheduleIndex] = {
      ...updatedRescheduleHistory[latestRescheduleIndex],
      status: "rejected",
      rejected_at: now,
      notes: "Workspace declined reschedule request",
    };

    // Prepare the updated metadata
    const updatedMetadata = {
      ...appointment.metadata,
      pending_reschedule: null, // Clear the pending reschedule
      current_reschedule: null,
      reschedule_history: updatedRescheduleHistory,
    };

    // Update the appointment status back to confirmed if it was previously confirmed
    const newStatus =
      appointment.status === "pending" ? "confirmed" : appointment.status;

    // Update the appointment metadata and status
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .update({
        status: newStatus,
        updated_at: now,
        metadata: updatedMetadata,
      })
      .eq("id", appointmentId)
      .eq("workspace_id", workspaceId)
      .select();

    if (error) {
      console.error("Error declining reschedule:", error);
      return NextResponse.json(
        { error: "Failed to decline reschedule" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reschedule declined successfully",
      appointment: data[0],
    });
  } catch (error) {
    console.error("Error in decline-reschedule POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

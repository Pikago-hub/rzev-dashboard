import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, validateWorkspaceAccess } from "@/lib/server/auth-utils";
import { randomUUID } from "crypto";
import { sendAppointmentRescheduleRequestEmail } from "@/lib/email-utils";
import {
  sendAppointmentRescheduleRequestSMS,
  getCustomerPhoneNumberFromAppointment,
} from "@/lib/message-utils";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// POST: Request a reschedule for an appointment
export async function POST(request: NextRequest) {
  try {
    const {
      appointmentId,
      workspaceId,
      newDate,
      newTime,
      newEndTime,
      teamMemberId,
      teamMemberPreference,
    } = await request.json();

    // Validate required parameters
    if (!appointmentId || !workspaceId || !newDate || !newTime || !newEndTime) {
      return NextResponse.json(
        { error: "All fields are required" },
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
            "You don't have permission to reschedule appointments in this workspace",
        },
        { status: accessResult.status || 403 }
      );
    }

    // Get the current timestamp
    const now = new Date().toISOString();

    // First, get the appointment to check its current status and metadata
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select(
        `
        *,
        services(name),
        team_members(display_name)
      `
      )
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

    // Generate a unique reschedule ID
    const rescheduleId = randomUUID();

    // If team member preference is "any", we need to randomly select a team member
    let selectedTeamMemberId = teamMemberId;

    if (teamMemberPreference === "any") {
      // Fetch all active team members for this workspace through the workspace_members relationship
      const { data: workspaceMembers, error: teamMembersError } =
        await supabaseAdmin
          .from("workspace_members")
          .select("team_member_id")
          .eq("workspace_id", workspaceId)
          .eq("active", true);

      if (teamMembersError) {
        console.error("Error fetching team members:", teamMembersError);
        return NextResponse.json(
          { error: "Failed to fetch team members" },
          { status: 500 }
        );
      }

      if (workspaceMembers && workspaceMembers.length > 0) {
        // Randomly select a team member
        const randomIndex = Math.floor(Math.random() * workspaceMembers.length);
        selectedTeamMemberId = workspaceMembers[randomIndex].team_member_id;
      } else {
        // If no team members found, use the original team member ID
        selectedTeamMemberId = appointment.team_member_id;
      }
    }

    // Create or update the reschedule history
    const rescheduleHistory = appointment.metadata?.reschedule_history || [];

    // Create a new reschedule history entry
    const newRescheduleEntry = {
      status: "pending",
      initiated_at: now,
      initiated_by: "workspace",
      reschedule_id: rescheduleId,
      previous_date: appointment.date,
      previous_time: appointment.start_time,
      new_date: newDate,
      new_time: newTime,
      new_end_time: newEndTime,
      team_member_id: selectedTeamMemberId,
      team_member_preference: teamMemberPreference,
    };

    // Add the new entry to the history
    const updatedRescheduleHistory = [...rescheduleHistory, newRescheduleEntry];

    // Prepare the updated metadata
    const updatedMetadata = {
      ...appointment.metadata,
      // Use workspace_pending_reschedule instead of pending_reschedule to differentiate
      workspace_pending_reschedule: {
        new_date: newDate,
        new_time: newTime,
        new_end_time: newEndTime,
        team_member_id: selectedTeamMemberId,
        team_member_preference: teamMemberPreference,
        initiated_at: now,
      },
      current_reschedule: {
        initiated_at: now,
        initiated_by: "workspace",
        previous_date: appointment.date,
        previous_time: appointment.start_time,
        reschedule_id: rescheduleId,
      },
      reschedule_history: updatedRescheduleHistory,
      team_member_preference: teamMemberPreference,
      original_team_member_id:
        appointment.metadata?.original_team_member_id ||
        appointment.team_member_id,
    };

    // Update the appointment status to pending and update metadata
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .update({
        status: "pending", // Always set to pending regardless of previous status
        updated_at: now,
        metadata: updatedMetadata,
      })
      .eq("id", appointmentId)
      .eq("workspace_id", workspaceId)
      .select();

    if (error) {
      console.error("Error requesting reschedule:", error);
      return NextResponse.json(
        { error: "Failed to request reschedule" },
        { status: 500 }
      );
    }

    // Get workspace name for the email
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();

    if (workspaceError) {
      console.error("Error fetching workspace:", workspaceError);
      // Continue anyway, we'll just log the error
    }

    // Get the team member name if a specific team member was selected
    let teamMemberName = appointment.team_members?.display_name;
    if (
      selectedTeamMemberId &&
      selectedTeamMemberId !== appointment.team_member_id
    ) {
      const { data: teamMember, error: teamMemberError } = await supabaseAdmin
        .from("team_members")
        .select("display_name")
        .eq("id", selectedTeamMemberId)
        .single();

      if (!teamMemberError && teamMember) {
        teamMemberName = teamMember.display_name;
      }
    }

    // Send reschedule request email to customer if email is available
    if (appointment.customer_email) {
      try {
        await sendAppointmentRescheduleRequestEmail(
          appointment.customer_email,
          {
            customerName: appointment.customer_name || "Customer",
            workspaceName: workspace?.name || "Our Business",
            serviceName: appointment.services?.name || "Service",
            oldDate: appointment.date,
            oldTime: appointment.start_time,
            newDate: newDate,
            newTime: newTime,
            newEndTime: newEndTime,
            teamMemberName: teamMemberName,
          },
          workspaceId,
          authResult.user.id
        );
      } catch (emailError) {
        // Log the error but don't fail the request
        console.error("Error sending reschedule request email:", emailError);
      }
    }

    // Send reschedule request SMS to customer if phone number is available
    try {
      const customerPhone =
        await getCustomerPhoneNumberFromAppointment(appointment);
      if (customerPhone) {
        await sendAppointmentRescheduleRequestSMS(
          customerPhone,
          {
            customerName: appointment.customer_name || "Customer",
            workspaceName: workspace?.name || "Our Business",
            serviceName: appointment.services?.name || "Service",
            oldDate: appointment.date,
            oldTime: appointment.start_time,
            newDate: newDate,
            newTime: newTime,
            newEndTime: newEndTime,
          },
          workspaceId,
          authResult.user.id
        );
      }
    } catch (smsError) {
      // Log the error but don't fail the request
      console.error("Error sending reschedule request SMS:", smsError);
    }

    return NextResponse.json({
      success: true,
      message: "Reschedule requested successfully",
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

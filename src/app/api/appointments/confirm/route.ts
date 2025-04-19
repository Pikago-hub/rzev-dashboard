import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUser,
  supabaseAdmin,
  validateWorkspaceAccess,
} from "@/lib/server/auth-utils";
import {
  sendAppointmentConfirmationEmail,
  sendTeamMemberAppointmentNotificationEmail,
} from "@/lib/email-utils";
import {
  sendAppointmentConfirmationSMS,
  getCustomerPhoneNumberFromAppointment,
} from "@/lib/message-utils";

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

    // First, get the appointment details to use for the email
    const { data: appointmentData, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select(
        `
        *,
        services(name),
        team_members(display_name, email)
      `
      )
      .eq("id", appointmentId)
      .eq("workspace_id", workspaceId)
      .eq("status", "pending") // Only confirm if it's currently pending
      .single();

    if (fetchError || !appointmentData) {
      console.error("Error fetching appointment:", fetchError);
      return NextResponse.json(
        { error: "Appointment not found or already confirmed" },
        { status: 404 }
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
      return NextResponse.json(
        { error: "Failed to fetch workspace details" },
        { status: 500 }
      );
    }

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

    // Send confirmation email to customer if email is available
    if (appointmentData.customer_email) {
      try {
        await sendAppointmentConfirmationEmail(
          appointmentData.customer_email,
          {
            customerName: appointmentData.customer_name || "Customer",
            workspaceName: workspace.name,
            serviceName: appointmentData.services?.name || "Service",
            date: appointmentData.date,
            startTime: appointmentData.start_time,
            endTime: appointmentData.end_time,
            teamMemberName: appointmentData.team_members?.display_name,
            price: appointmentData.price,
            notes: appointmentData.notes,
          },
          workspaceId,
          authResult.user.id
        );
      } catch (emailError) {
        // Log the error but don't fail the request
        console.error("Error sending confirmation email:", emailError);
      }
    }

    // Send confirmation SMS to customer if phone number is available
    try {
      const customerPhone =
        await getCustomerPhoneNumberFromAppointment(appointmentData);
      if (customerPhone) {
        await sendAppointmentConfirmationSMS(
          customerPhone,
          {
            customerName: appointmentData.customer_name || "Customer",
            workspaceName: workspace.name,
            serviceName: appointmentData.services?.name || "Service",
            date: appointmentData.date,
            startTime: appointmentData.start_time,
            endTime: appointmentData.end_time,
            teamMemberName: appointmentData.team_members?.display_name,
          },
          workspaceId,
          authResult.user.id
        );
      }
    } catch (smsError) {
      // Log the error but don't fail the request
      console.error("Error sending confirmation SMS:", smsError);
    }

    // Send notification email to team member if assigned and email is available
    if (appointmentData.team_member_id && appointmentData.team_members?.email) {
      try {
        await sendTeamMemberAppointmentNotificationEmail(
          appointmentData.team_members.email,
          {
            teamMemberName:
              appointmentData.team_members.display_name || "Team Member",
            workspaceName: workspace.name,
            customerName: appointmentData.customer_name || "Customer",
            serviceName: appointmentData.services?.name || "Service",
            date: appointmentData.date,
            startTime: appointmentData.start_time,
            endTime: appointmentData.end_time,
            notes: appointmentData.notes,
          },
          workspaceId,
          authResult.user.id
        );
      } catch (emailError) {
        // Log the error but don't fail the request
        console.error(
          "Error sending team member notification email:",
          emailError
        );
      }
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

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUser,
  supabaseAdmin,
  validateWorkspaceAccess,
} from "@/lib/server/auth-utils";
import { sendAppointmentCancellationEmail } from "@/lib/email-utils";
import {
  sendAppointmentCancellationSMS,
  getCustomerPhoneNumberFromAppointment,
} from "@/lib/message-utils";

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

    // First, get the appointment details to use for the email
    const { data: appointmentData, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select(
        `
        *,
        services(name)
      `
      )
      .eq("id", appointmentId)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !appointmentData) {
      console.error("Error fetching appointment:", fetchError);
      return NextResponse.json(
        { error: "Appointment not found" },
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

    // Send cancellation email to customer if email is available
    if (appointmentData.customer_email) {
      try {
        await sendAppointmentCancellationEmail(
          appointmentData.customer_email,
          {
            customerName: appointmentData.customer_name || "Customer",
            workspaceName: workspace.name,
            serviceName: appointmentData.services?.name || "Service",
            date: appointmentData.date,
            startTime: appointmentData.start_time,
          },
          workspaceId,
          authResult.user.id
        );
      } catch (emailError) {
        // Log the error but don't fail the request
        console.error("Error sending cancellation email:", emailError);
      }
    }

    // Send cancellation SMS to customer if phone number is available
    try {
      const customerPhone =
        await getCustomerPhoneNumberFromAppointment(appointmentData);
      if (customerPhone) {
        await sendAppointmentCancellationSMS(
          customerPhone,
          {
            customerName: appointmentData.customer_name || "Customer",
            workspaceName: workspace.name,
            serviceName: appointmentData.services?.name || "Service",
            date: appointmentData.date,
            startTime: appointmentData.start_time,
          },
          workspaceId,
          authResult.user.id
        );
      }
    } catch (smsError) {
      // Log the error but don't fail the request
      console.error("Error sending cancellation SMS:", smsError);
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

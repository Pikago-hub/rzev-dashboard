import { Resend } from "resend";
import { format, parseISO } from "date-fns";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Initialize the Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Return type for email sending operations
interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Records email usage for a workspace
 * @param workspaceId The ID of the workspace
 * @param userId Optional ID of the user who triggered the email
 * @returns Promise that resolves when the usage is recorded
 */
async function recordEmailUsage(
  workspaceId: string,
  userId?: string
): Promise<void> {
  try {
    const now = new Date().toISOString();

    await supabaseAdmin.from("usage_records").insert({
      workspace_id: workspaceId,
      resource_type: "email",
      quantity_used: 1,
      recorded_at: now,
      created_by: userId || null,
      created_at: now,
    });
  } catch (error) {
    // Log the error but don't throw it to prevent disrupting the email flow
    console.error("Error recording email usage:", error);
  }
}

// Common email template wrapper
const emailTemplate = (content: string) => `
  <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    ${content}
    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
      Best regards,<br />The Rzev Team
    </p>
  </div>
`;

// Format date for email display (e.g., "Monday, January 1, 2023")
const formatEmailDate = (dateStr: string): string => {
  const date = parseISO(dateStr);
  return format(date, "EEEE, MMMM d, yyyy");
};

// Format time for email display (e.g., "9:00 AM")
const formatEmailTime = (timeStr: string): string => {
  const [hour, minute] = timeStr.split(":");
  const hourNum = parseInt(hour, 10);
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
};

/**
 * Sends a team invitation email
 * @param to Recipient email address
 * @param invitationData Data for the invitation email
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the email
 * @returns SendEmailResult with success status and optional error
 */
export async function sendTeamInvitationEmail(
  to: string,
  invitationData: {
    workspaceName: string;
    inviterName: string;
    invitationLink: string;
    role: string;
    expiresAt: string;
  },
  workspaceId: string,
  userId?: string
): Promise<SendEmailResult> {
  try {
    const { workspaceName, inviterName, invitationLink, role, expiresAt } =
      invitationData;

    const { error } = await resend.emails.send({
      from: "Rzev <noreply@rzev.ai>",
      to: [to],
      subject: `You've been invited to join ${workspaceName} on Rzev`,
      html: emailTemplate(`
        <h2>You've been invited to join ${workspaceName}</h2>
        <p>Hello,</p>
        <p>${inviterName} has invited you to join ${workspaceName} as a <strong>${role}</strong>.</p>
        <p>This invitation will expire on ${expiresAt}.</p>
        <p style="margin: 30px 0;">
          <a href="${invitationLink}" style="background-color: #4F46E5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Accept Invitation
          </a>
        </p>
        <p>If you don't know why you received this invitation, please ignore this email.</p>
      `),
    });

    if (error) {
      console.error("Error sending invitation email:", error);
      return { success: false, error: error.message };
    }

    // Record email usage
    await recordEmailUsage(workspaceId, userId);

    return { success: true };
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error sending invitation email",
    };
  }
}

/**
 * Sends an appointment confirmation email to the customer
 * @param to Customer email address
 * @param appointmentData Data for the appointment confirmation email
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the email
 * @returns SendEmailResult with success status and optional error
 */
export async function sendAppointmentConfirmationEmail(
  to: string,
  appointmentData: {
    customerName: string;
    workspaceName: string;
    serviceName: string;
    date: string; // ISO format date
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    teamMemberName?: string;
    price?: number;
    notes?: string;
  },
  workspaceId: string,
  userId?: string
): Promise<SendEmailResult> {
  try {
    const {
      customerName,
      workspaceName,
      serviceName,
      date,
      startTime,
      endTime,
      teamMemberName,
      price,
      notes,
    } = appointmentData;

    const formattedDate = formatEmailDate(date);
    const formattedStartTime = formatEmailTime(startTime);
    const formattedEndTime = formatEmailTime(endTime);

    const { error } = await resend.emails.send({
      from: "Rzev <noreply@rzev.ai>",
      to: [to],
      subject: `Your appointment with ${workspaceName} is confirmed`,
      html: emailTemplate(`
        <h2>Your appointment is confirmed!</h2>
        <p>Hello ${customerName},</p>
        <p>Your appointment with ${workspaceName} has been confirmed.</p>

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
          ${teamMemberName ? `<p style="margin: 5px 0;"><strong>Staff:</strong> ${teamMemberName}</p>` : ""}
          ${price ? `<p style="margin: 5px 0;"><strong>Price:</strong> $${price.toFixed(2)}</p>` : ""}
          ${notes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${notes}</p>` : ""}
        </div>

        <p>We look forward to seeing you!</p>
      `),
    });

    if (error) {
      console.error("Error sending appointment confirmation email:", error);
      return { success: false, error: error.message };
    }

    // Record email usage
    await recordEmailUsage(workspaceId, userId);

    return { success: true };
  } catch (error) {
    console.error("Error sending appointment confirmation email:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error sending appointment confirmation email",
    };
  }
}

/**
 * Sends an appointment cancellation email to the customer
 * @param to Customer email address
 * @param appointmentData Data for the appointment cancellation email
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the email
 * @returns SendEmailResult with success status and optional error
 */
export async function sendAppointmentCancellationEmail(
  to: string,
  appointmentData: {
    customerName: string;
    workspaceName: string;
    serviceName: string;
    date: string; // ISO format date
    startTime: string; // HH:MM format
  },
  workspaceId: string,
  userId?: string
): Promise<SendEmailResult> {
  try {
    const { customerName, workspaceName, serviceName, date, startTime } =
      appointmentData;

    const formattedDate = formatEmailDate(date);
    const formattedTime = formatEmailTime(startTime);

    const { error } = await resend.emails.send({
      from: "Rzev <noreply@rzev.ai>",
      to: [to],
      subject: `Your appointment with ${workspaceName} has been cancelled`,
      html: emailTemplate(`
        <h2>Your appointment has been cancelled</h2>
        <p>Hello ${customerName},</p>
        <p>Your appointment with ${workspaceName} has been cancelled.</p>

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
        </div>

        <p>If you would like to reschedule, please contact us or book a new appointment.</p>
      `),
    });

    if (error) {
      console.error("Error sending appointment cancellation email:", error);
      return { success: false, error: error.message };
    }

    // Record email usage
    await recordEmailUsage(workspaceId, userId);

    return { success: true };
  } catch (error) {
    console.error("Error sending appointment cancellation email:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error sending appointment cancellation email",
    };
  }
}

/**
 * Sends an appointment reschedule request email to the customer
 * @param to Customer email address
 * @param appointmentData Data for the appointment reschedule request email
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the email
 * @returns SendEmailResult with success status and optional error
 */
export async function sendAppointmentRescheduleRequestEmail(
  to: string,
  appointmentData: {
    customerName: string;
    workspaceName: string;
    serviceName: string;
    oldDate: string; // ISO format date
    oldTime: string; // HH:MM format
    newDate: string; // ISO format date
    newTime: string; // HH:MM format
    newEndTime: string; // HH:MM format
    teamMemberName?: string;
  },
  workspaceId: string,
  userId?: string
): Promise<SendEmailResult> {
  try {
    const {
      customerName,
      workspaceName,
      serviceName,
      oldDate,
      oldTime,
      newDate,
      newTime,
      newEndTime,
      teamMemberName,
    } = appointmentData;

    const formattedOldDate = formatEmailDate(oldDate);
    const formattedOldTime = formatEmailTime(oldTime);
    const formattedNewDate = formatEmailDate(newDate);
    const formattedNewStartTime = formatEmailTime(newTime);
    const formattedNewEndTime = formatEmailTime(newEndTime);

    const { error } = await resend.emails.send({
      from: "Rzev <noreply@rzev.ai>",
      to: [to],
      subject: `Appointment reschedule request from ${workspaceName}`,
      html: emailTemplate(`
        <h2>Appointment Reschedule Request</h2>
        <p>Hello ${customerName},</p>
        <p>${workspaceName} has requested to reschedule your appointment.</p>

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 5px 0;"><strong>Original Date:</strong> ${formattedOldDate}</p>
          <p style="margin: 5px 0;"><strong>Original Time:</strong> ${formattedOldTime}</p>
          <p style="margin: 10px 0 5px; font-weight: bold;">Proposed New Time:</p>
          <p style="margin: 5px 0;"><strong>New Date:</strong> ${formattedNewDate}</p>
          <p style="margin: 5px 0;"><strong>New Time:</strong> ${formattedNewStartTime} - ${formattedNewEndTime}</p>
          ${teamMemberName ? `<p style="margin: 5px 0;"><strong>Staff:</strong> ${teamMemberName}</p>` : ""}
        </div>

        <p>Please respond to this request by contacting ${workspaceName} directly.</p>
      `),
    });

    if (error) {
      console.error(
        "Error sending appointment reschedule request email:",
        error
      );
      return { success: false, error: error.message };
    }

    // Record email usage
    await recordEmailUsage(workspaceId, userId);

    return { success: true };
  } catch (error) {
    console.error("Error sending appointment reschedule request email:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error sending appointment reschedule request email",
    };
  }
}

/**
 * Sends an email to the customer when their reschedule request is confirmed
 * @param to Customer email address
 * @param appointmentData Data for the reschedule confirmation email
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the email
 * @returns SendEmailResult with success status and optional error
 */
export async function sendRescheduleConfirmationEmail(
  to: string,
  appointmentData: {
    customerName: string;
    workspaceName: string;
    serviceName: string;
    date: string; // ISO format date
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    teamMemberName?: string;
  },
  workspaceId: string,
  userId?: string
): Promise<SendEmailResult> {
  try {
    const {
      customerName,
      workspaceName,
      serviceName,
      date,
      startTime,
      endTime,
      teamMemberName,
    } = appointmentData;

    const formattedDate = formatEmailDate(date);
    const formattedStartTime = formatEmailTime(startTime);
    const formattedEndTime = formatEmailTime(endTime);

    const { error } = await resend.emails.send({
      from: "Rzev <noreply@rzev.ai>",
      to: [to],
      subject: `Your rescheduled appointment with ${workspaceName} is confirmed`,
      html: emailTemplate(`
        <h2>Your rescheduled appointment is confirmed!</h2>
        <p>Hello ${customerName},</p>
        <p>Your rescheduled appointment with ${workspaceName} has been confirmed.</p>

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
          ${teamMemberName ? `<p style="margin: 5px 0;"><strong>Staff:</strong> ${teamMemberName}</p>` : ""}
        </div>

        <p>We look forward to seeing you!</p>
      `),
    });

    if (error) {
      console.error("Error sending reschedule confirmation email:", error);
      return { success: false, error: error.message };
    }

    // Record email usage
    await recordEmailUsage(workspaceId, userId);

    return { success: true };
  } catch (error) {
    console.error("Error sending reschedule confirmation email:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error sending reschedule confirmation email",
    };
  }
}

/**
 * Sends an email to the customer when their reschedule request is declined
 * @param to Customer email address
 * @param appointmentData Data for the reschedule declined email
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the email
 * @returns SendEmailResult with success status and optional error
 */
export async function sendRescheduleDeclinedEmail(
  to: string,
  appointmentData: {
    customerName: string;
    workspaceName: string;
    serviceName: string;
    date: string; // ISO format date
    startTime: string; // HH:MM format
  },
  workspaceId: string,
  userId?: string
): Promise<SendEmailResult> {
  try {
    const { customerName, workspaceName, serviceName, date, startTime } =
      appointmentData;

    const formattedDate = formatEmailDate(date);
    const formattedTime = formatEmailTime(startTime);

    const { error } = await resend.emails.send({
      from: "Rzev <noreply@rzev.ai>",
      to: [to],
      subject: `Your reschedule request with ${workspaceName} was declined`,
      html: emailTemplate(`
        <h2>Reschedule Request Declined</h2>
        <p>Hello ${customerName},</p>
        <p>${workspaceName} was unable to accommodate your reschedule request. Your original appointment remains unchanged.</p>

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
        </div>

        <p>If you need to make changes to your appointment, please contact ${workspaceName} directly.</p>
      `),
    });

    if (error) {
      console.error("Error sending reschedule declined email:", error);
      return { success: false, error: error.message };
    }

    // Record email usage
    await recordEmailUsage(workspaceId, userId);

    return { success: true };
  } catch (error) {
    console.error("Error sending reschedule declined email:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error sending reschedule declined email",
    };
  }
}

/**
 * Sends an appointment notification email to a team member
 * @param to Team member email address
 * @param appointmentData Data for the team member notification email
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the email
 * @returns SendEmailResult with success status and optional error
 */
export async function sendTeamMemberAppointmentNotificationEmail(
  to: string,
  appointmentData: {
    teamMemberName: string;
    workspaceName: string;
    customerName: string;
    serviceName: string;
    date: string; // ISO format date
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    notes?: string;
  },
  workspaceId: string,
  userId?: string
): Promise<SendEmailResult> {
  try {
    const {
      teamMemberName,
      workspaceName,
      customerName,
      serviceName,
      date,
      startTime,
      endTime,
      notes,
    } = appointmentData;

    const formattedDate = formatEmailDate(date);
    const formattedStartTime = formatEmailTime(startTime);
    const formattedEndTime = formatEmailTime(endTime);

    const { error } = await resend.emails.send({
      from: "Rzev <noreply@rzev.ai>",
      to: [to],
      subject: `New appointment assigned to you at ${workspaceName}`,
      html: emailTemplate(`
        <h2>New Appointment Assigned</h2>
        <p>Hello ${teamMemberName},</p>
        <p>A new appointment has been assigned to you at ${workspaceName}.</p>

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Customer:</strong> ${customerName}</p>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
          ${notes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${notes}</p>` : ""}
        </div>

        <p>Please check your dashboard for more details.</p>
      `),
    });

    if (error) {
      console.error(
        "Error sending team member appointment notification email:",
        error
      );
      return { success: false, error: error.message };
    }

    // Record email usage
    await recordEmailUsage(workspaceId, userId);

    return { success: true };
  } catch (error) {
    console.error(
      "Error sending team member appointment notification email:",
      error
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error sending team member appointment notification email",
    };
  }
}

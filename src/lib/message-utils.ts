import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Sendo API configuration
const SENDO_API_URL = "https://api.sendo.dev/v1/message/send";
const SENDO_API_KEY = process.env.SENDO_API_KEY as string;
const SENDO_CAMPAIGN_ID = process.env.SENDO_CAMPAIGN_ID as string;
const SENDO_FROM_NUMBER = process.env.SENDO_FROM_NUMBER as string; // Optional

// Return type for message sending operations
interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Records SMS usage for a workspace
 * @param workspaceId The ID of the workspace
 * @param userId Optional ID of the user who triggered the SMS
 * @returns Promise that resolves when the usage is recorded
 */
async function recordSmsUsage(
  workspaceId: string,
  userId?: string
): Promise<void> {
  try {
    const now = new Date().toISOString();

    await supabaseAdmin.from("usage_records").insert({
      workspace_id: workspaceId,
      resource_type: "sms",
      quantity_used: 1,
      recorded_at: now,
      created_by: userId || null,
      created_at: now,
    });
  } catch (error) {
    // Log the error but don't throw it to prevent disrupting the SMS flow
    console.error("Error recording SMS usage:", error);
  }
}

/**
 * Get customer phone number from customer_profiles table
 * @param customerId The ID of the customer
 * @returns The customer's phone number or null if not found
 */
async function getCustomerPhoneNumber(
  customerId: string
): Promise<string | null> {
  if (!customerId) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from("customer_profiles")
      .select("phone_number")
      .eq("id", customerId)
      .single();

    if (error || !data) {
      console.error("Error fetching customer phone number:", error);
      return null;
    }

    return data.phone_number || null;
  } catch (error) {
    console.error("Error in getCustomerPhoneNumber:", error);
    return null;
  }
}

/**
 * Format phone number to E.164 format required by Sendo
 * @param phoneNumber Phone number to format
 * @returns Formatted phone number or null if invalid
 */
function formatPhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber) return null;

  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // If the number starts with a country code (e.g., +1), use it as is
  if (phoneNumber.startsWith("+")) {
    return "+" + digitsOnly;
  }

  // If the number is a US/Canada number (10 digits), add +1
  if (digitsOnly.length === 10) {
    return "+1" + digitsOnly;
  }

  // If the number already has a country code (11+ digits), add +
  if (digitsOnly.length >= 11) {
    return "+" + digitsOnly;
  }

  // If we can't determine the format, return null
  return null;
}

/**
 * Get customer phone number from appointment or customer_profiles table
 * @param appointment The appointment object with customer data
 * @returns The customer's phone number or null if not found
 */
export async function getCustomerPhoneNumberFromAppointment(appointment: {
  customer_phone?: string | null;
  customer_id?: string | null;
}): Promise<string | null> {
  // First try to get the phone number directly from the appointment
  if (appointment.customer_phone) {
    return appointment.customer_phone;
  }

  // If not available, try to get it from the customer_profiles table
  if (appointment.customer_id) {
    return await getCustomerPhoneNumber(appointment.customer_id);
  }

  return null;
}

/**
 * Sends an SMS message using Sendo API
 * @param to Recipient phone number
 * @param body Message body
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the message
 * @param metadata Optional metadata to include with the message
 * @returns SendMessageResult with success status and optional error
 */
async function sendSendoMessage(
  to: string,
  body: string,
  workspaceId: string,
  userId?: string,
  metadata?: Record<string, string>
): Promise<SendMessageResult> {
  try {
    // Format the phone number to E.164 format
    const formattedPhoneNumber = formatPhoneNumber(to);
    if (!formattedPhoneNumber) {
      return {
        success: false,
        error: "Invalid phone number format",
      };
    }

    // Prepare the request payload
    const payload = {
      campaign: SENDO_CAMPAIGN_ID,
      body,
      to: formattedPhoneNumber,
      ...(SENDO_FROM_NUMBER && { from: SENDO_FROM_NUMBER }),
      ...(metadata && { metadata }),
    };

    // Send the request to Sendo API
    const response = await fetch(SENDO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SENDO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    // Parse the response
    const data = await response.json();

    if (!response.ok) {
      console.error("Error sending SMS:", data);
      return {
        success: false,
        error: data.error || "Failed to send SMS",
      };
    }

    // Record SMS usage
    await recordSmsUsage(workspaceId, userId);

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error sending SMS",
    };
  }
}

/**
 * Sends an appointment confirmation SMS to the customer
 * @param to Customer phone number
 * @param appointmentData Data for the appointment confirmation SMS
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the SMS
 * @returns SendMessageResult with success status and optional error
 */
export async function sendAppointmentConfirmationSMS(
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
): Promise<SendMessageResult> {
  const {
    customerName,
    workspaceName,
    serviceName,
    date,
    startTime,
    endTime,
    teamMemberName,
  } = appointmentData;

  // Format date for display (e.g., "Monday, Jan 1")
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Format time for display (e.g., "9:00 AM")
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = formatTime(endTime);

  // Create the message body
  const messageBody = `Hi ${customerName}, your appointment with ${workspaceName} is confirmed! Service: ${serviceName}, Date: ${formattedDate}, Time: ${formattedStartTime} - ${formattedEndTime}${
    teamMemberName ? `, Staff: ${teamMemberName}` : ""
  }. We look forward to seeing you!`;

  // Send the message
  return sendSendoMessage(to, messageBody, workspaceId, userId);
}

/**
 * Sends an appointment cancellation SMS to the customer
 * @param to Customer phone number
 * @param appointmentData Data for the appointment cancellation SMS
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the SMS
 * @returns SendMessageResult with success status and optional error
 */
export async function sendAppointmentCancellationSMS(
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
): Promise<SendMessageResult> {
  const { customerName, workspaceName, serviceName, date, startTime } =
    appointmentData;

  // Format date for display
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Format time for display
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  const formattedTime = formatTime(startTime);

  // Create the message body
  const messageBody = `Hi ${customerName}, your appointment with ${workspaceName} for ${serviceName} on ${formattedDate} at ${formattedTime} has been cancelled. Please contact us if you would like to reschedule.`;

  // Send the message
  return sendSendoMessage(to, messageBody, workspaceId, userId);
}

/**
 * Sends an appointment reschedule request SMS to the customer
 * @param to Customer phone number
 * @param appointmentData Data for the appointment reschedule request SMS
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the SMS
 * @returns SendMessageResult with success status and optional error
 */
export async function sendAppointmentRescheduleRequestSMS(
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
  },
  workspaceId: string,
  userId?: string
): Promise<SendMessageResult> {
  const {
    customerName,
    workspaceName,
    serviceName,
    oldDate,
    oldTime,
    newDate,
    newTime,
    newEndTime,
  } = appointmentData;

  // Format dates for display
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

  const formattedOldDate = formatDate(oldDate);
  const formattedNewDate = formatDate(newDate);

  // Format times for display
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  const formattedOldTime = formatTime(oldTime);
  const formattedNewStartTime = formatTime(newTime);
  const formattedNewEndTime = formatTime(newEndTime);

  // Create the message body
  const messageBody = `Hi ${customerName}, ${workspaceName} needs to reschedule your appointment for ${serviceName}. Original: ${formattedOldDate} at ${formattedOldTime}. New proposed time: ${formattedNewDate} from ${formattedNewStartTime} to ${formattedNewEndTime}. Please contact us to confirm or request a different time.`;

  // Send the message
  return sendSendoMessage(to, messageBody, workspaceId, userId);
}

/**
 * Sends a reschedule confirmation SMS to the customer
 * @param to Customer phone number
 * @param appointmentData Data for the reschedule confirmation SMS
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the SMS
 * @returns SendMessageResult with success status and optional error
 */
export async function sendRescheduleConfirmationSMS(
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
): Promise<SendMessageResult> {
  const {
    customerName,
    workspaceName,
    serviceName,
    date,
    startTime,
    endTime,
    teamMemberName,
  } = appointmentData;

  // Format date for display
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Format time for display
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = formatTime(endTime);

  // Create the message body
  const messageBody = `Hi ${customerName}, your rescheduled appointment with ${workspaceName} is confirmed! Service: ${serviceName}, Date: ${formattedDate}, Time: ${formattedStartTime} - ${formattedEndTime}${
    teamMemberName ? `, Staff: ${teamMemberName}` : ""
  }. We look forward to seeing you!`;

  // Send the message
  return sendSendoMessage(to, messageBody, workspaceId, userId);
}

/**
 * Sends a reschedule declined SMS to the customer
 * @param to Customer phone number
 * @param appointmentData Data for the reschedule declined SMS
 * @param workspaceId ID of the workspace for usage tracking
 * @param userId Optional ID of the user who triggered the SMS
 * @returns SendMessageResult with success status and optional error
 */
export async function sendRescheduleDeclinedSMS(
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
): Promise<SendMessageResult> {
  const { customerName, workspaceName, serviceName, date, startTime } =
    appointmentData;

  // Format date for display
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Format time for display
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  const formattedTime = formatTime(startTime);

  // Create the message body
  const messageBody = `Hi ${customerName}, ${workspaceName} was unable to accommodate your reschedule request. Your original appointment for ${serviceName} on ${formattedDate} at ${formattedTime} remains unchanged. Please contact us if you need to make changes.`;

  // Send the message
  return sendSendoMessage(to, messageBody, workspaceId, userId);
}

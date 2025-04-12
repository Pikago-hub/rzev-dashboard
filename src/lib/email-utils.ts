import { Resend } from 'resend';

// Initialize the Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Return type for email sending operations
interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Sends a team invitation email
 * @param to Recipient email address
 * @param invitationData Data for the invitation email
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
  }
): Promise<SendEmailResult> {
  try {
    const { workspaceName, inviterName, invitationLink, role, expiresAt } = invitationData;
    
    const { error } = await resend.emails.send({
      from: 'Rzev <noreply@rzev.ai>',
      to: [to],
      subject: `You've been invited to join ${workspaceName} on Rzev`,
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
          <p>Best regards,<br />The Rzev Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error sending invitation email' 
    };
  }
} 
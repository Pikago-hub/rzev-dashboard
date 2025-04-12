import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import crypto from "crypto";
import { sendTeamInvitationEmail } from "@/lib/email-utils";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Helper function to validate user has admin access to the workspace
async function validateUserAndWorkspace(userId: string, workspaceId: string) {
  if (!userId) {
    return { error: "Authentication required", status: 401, user: null };
  }

  // Check if user is a member of the workspace
  const { data: workspaceMember, error: memberError } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("team_member_id", userId)
    .single();

  if (memberError || !workspaceMember) {
    return {
      error: "You don't have access to this workspace",
      status: 403,
      user: null,
    };
  }

  // Check if user has owner role (only owners can manage team members)
  if (workspaceMember.role !== "owner") {
    return {
      error: "You don't have permission to invite team members",
      status: 403,
      user: null,
    };
  }

  return { error: null, status: 200, user: userId };
}

// Create a team invitation
export async function POST(request: NextRequest) {
  try {
    const { email, role, workspaceId } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!role || !["owner", "staff"].includes(role)) {
      return NextResponse.json(
        { error: "Valid role is required (owner or staff)" },
        { status: 400 }
      );
    }

    // Get authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // Validate the token and get the user
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid authorization" },
        { status: 401 }
      );
    }

    // Check if the invitation email is the same as the inviter's email
    if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot invite yourself to this workspace" },
        { status: 400 }
      );
    }

    // Validate user has owner access to the workspace
    const validation = await validateUserAndWorkspace(user.id, workspaceId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Get workspace information
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if the email is already associated with a team member in any workspace
    const { data: existingTeamMember, error: existingTeamMemberError } =
      await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (existingTeamMemberError) {
      console.error(
        "Error checking existing team member:",
        existingTeamMemberError
      );
    }

    if (existingTeamMember) {
      // Check if this team member is already associated with this workspace
      const {
        data: existingWorkspaceMemberSameWs,
        error: existingWorkspaceMemberSameWsError,
      } = await supabaseAdmin
        .from("workspace_members")
        .select("team_member_id")
        .eq("team_member_id", existingTeamMember.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (existingWorkspaceMemberSameWsError) {
        console.error(
          "Error checking existing workspace membership in same workspace:",
          existingWorkspaceMemberSameWsError
        );
      }

      if (existingWorkspaceMemberSameWs) {
        return NextResponse.json(
          { error: "This email is already a member of this workspace" },
          { status: 400 }
        );
      }

      // Check if this team member is already associated with another workspace
      const {
        data: existingWorkspaceMember,
        error: existingWorkspaceMemberError,
      } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("team_member_id", existingTeamMember.id)
        .not("workspace_id", "eq", workspaceId)
        .maybeSingle();

      if (existingWorkspaceMemberError) {
        console.error(
          "Error checking existing workspace membership:",
          existingWorkspaceMemberError
        );
      }

      if (existingWorkspaceMember) {
        return NextResponse.json(
          { error: "This email is already associated with another workspace" },
          { status: 400 }
        );
      }
    }

    // Get inviter information
    const { data: inviter, error: inviterError } = await supabaseAdmin
      .from("team_members")
      .select("display_name")
      .eq("id", user.id)
      .single();

    if (inviterError) {
      console.error("Error fetching inviter details:", inviterError);
    }

    const inviterName =
      inviter?.display_name || user.email || "A workspace admin";

    // Check if the email already exists in workspace_invitations with status 'pending'
    const { data: existingInvitation, error: existingInvitationError } =
      await supabaseAdmin
        .from("workspace_invitations")
        .select("id, token")
        .eq("workspace_id", workspaceId)
        .eq("email", email)
        .eq("status", "pending")
        .maybeSingle();

    if (existingInvitationError) {
      console.error(
        "Error checking existing invitations:",
        existingInvitationError
      );
    }

    let invitationToken: string;
    let invitationId: string;

    if (existingInvitation) {
      // Update the existing invitation
      invitationToken = existingInvitation.token;
      invitationId = existingInvitation.id;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { error: updateError } = await supabaseAdmin
        .from("workspace_invitations")
        .update({
          role,
          invited_by: user.id,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitationId);

      if (updateError) {
        console.error("Error updating invitation:", updateError);
        return NextResponse.json(
          { error: "Failed to update invitation" },
          { status: 500 }
        );
      }
    } else {
      // Create a new invitation
      invitationToken = crypto.randomBytes(32).toString("hex");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { data: newInvitation, error: invitationError } =
        await supabaseAdmin
          .from("workspace_invitations")
          .insert({
            workspace_id: workspaceId,
            email,
            role,
            invited_by: user.id,
            token: invitationToken,
            status: "pending",
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

      if (invitationError || !newInvitation) {
        console.error("Error creating invitation:", invitationError);
        return NextResponse.json(
          { error: "Failed to create invitation" },
          { status: 500 }
        );
      }

      invitationId = newInvitation.id;
    }

    // Send invitation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const invitationLink = `${appUrl}/auth/accept-invitation?token=${invitationToken}`;

    const { data: invitation } = await supabaseAdmin
      .from("workspace_invitations")
      .select("expires_at")
      .eq("id", invitationId)
      .single();

    const expiresAt = invitation?.expires_at
      ? format(new Date(invitation.expires_at), "PPP")
      : "in 7 days";

    const emailResult = await sendTeamInvitationEmail(email, {
      workspaceName: workspace.name || "Your team",
      inviterName,
      invitationLink,
      role,
      expiresAt,
    });

    if (!emailResult.success) {
      console.error("Error sending invitation email:", emailResult.error);
      // Continue anyway, but log the error
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      invitationId,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

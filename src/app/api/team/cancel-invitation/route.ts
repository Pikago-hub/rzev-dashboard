import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Helper function to validate user has access to the workspace
async function validateUserAndWorkspace(userId: string, workspaceId: string) {
  // Check if the user exists and has access to the workspace
  const { data: workspaceMember, error: workspaceError } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("team_member_id", userId)
    .eq("workspace_id", workspaceId)
    .single();

  if (workspaceError || !workspaceMember) {
    return {
      error: "You don't have access to this workspace",
      status: 403,
    };
  }

  // Check if the user has owner role
  if (workspaceMember.role !== "owner") {
    return {
      error: "You don't have permission to manage team invitations",
      status: 403,
    };
  }

  return { error: null, status: 200 };
}

// Cancel a team invitation
export async function POST(request: NextRequest) {
  try {
    const { invitationId, workspaceId } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
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

    // Validate user has access to the workspace
    const validation = await validateUserAndWorkspace(user.id, workspaceId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Check if the invitation exists
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("workspace_invitations")
      .select("id, status")
      .eq("id", invitationId)
      .eq("workspace_id", workspaceId)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation is not in pending status" },
        { status: 400 }
      );
    }

    // Update the invitation status to expired (which is used for cancelled invitations)
    const { error: updateError } = await supabaseAdmin
      .from("workspace_invitations")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      console.error("Error cancelling invitation:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

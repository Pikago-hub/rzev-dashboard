import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // First check if the user has a team_member record
    const { data: teamMember, error: teamMemberError } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    // Handle case when team member doesn't exist
    if (!teamMember || teamMemberError) {
      // Only log unexpected errors
      if (teamMemberError && teamMemberError.code !== 'PGRST116') {
        console.error("Error finding team member:", teamMemberError);
      }
      
      // Instead of returning error immediately, check for pending invitations
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (user?.user?.email) {
        const { data: pendingInvitations } = await supabaseAdmin
          .from("workspace_invitations")
          .select("id, workspace_id, role, token")
          .eq("email", user.user.email)
          .eq("status", "pending");
          
        if (pendingInvitations && pendingInvitations.length > 0) {
          console.log(`Found pending invitation for ${user.user.email}`);
          
          // Get the token from the invitation (not the ID)
          const invitationToken = pendingInvitations[0].token || pendingInvitations[0].id;
          
          // Return a special message indicating an invitation needs to be processed
          return NextResponse.json({
            status: "invitation_pending",
            redirectUrl: `/auth/accept-invitation?token=${invitationToken}`,
            message: "Pending invitation found"
          });
        }
      }
      
      // If no invitations found, then redirect to workspace choice
      return NextResponse.json({
        status: "error",
        redirectUrl: "/onboarding/workspace-choice",
        message: "No team member record found for this user"
      });
    }

    // Get the user's workspace member record
    const { data: workspaceMember, error: workspaceMemberError } =
      await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("team_member_id", userId)
        .maybeSingle();

    // Handle case when workspace member doesn't exist
    if (!workspaceMember || workspaceMemberError) {
      // Only log unexpected errors
      if (workspaceMemberError && workspaceMemberError.code !== 'PGRST116') {
        console.error("Error finding workspace member:", workspaceMemberError);
      }
      
      // Check if there are any pending invitations for this user 
      // This helps users who signed up, logged out, and then clicked on an invitation link
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (user?.user?.email) {
        const { data: pendingInvitations } = await supabaseAdmin
          .from("workspace_invitations")
          .select("id, workspace_id, role, token")
          .eq("email", user.user.email)
          .eq("status", "pending");
          
        if (pendingInvitations && pendingInvitations.length > 0) {
          console.log(`Found pending invitation for ${user.user.email}`);
          
          // Get the token from the invitation (not the ID)
          const invitationToken = pendingInvitations[0].token || pendingInvitations[0].id;
          
          // Return a special message indicating an invitation needs to be processed
          return NextResponse.json({
            status: "invitation_pending",
            redirectUrl: `/auth/accept-invitation?token=${invitationToken}`,
            message: "Pending invitation found"
          });
        }
      }
      
      return NextResponse.json({
        status: "error",
        redirectUrl: "/onboarding/workspace-choice",
        message: "No workspace associated with this user"
      });
    }

    // Check if onboarding is complete for this workspace
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("onboarding_complete")
      .eq("id", workspaceMember.workspace_id)
      .maybeSingle();

    if (!workspace || workspaceError) {
      // Only log unexpected errors
      if (workspaceError && workspaceError.code !== 'PGRST116') {
        console.error("Error fetching workspace:", workspaceError);
      }
      
      return NextResponse.json({
        status: "error",
        redirectUrl: "/onboarding/workspace-choice",
        message: "Error fetching workspace details"
      });
    }

    if (!workspace?.onboarding_complete) {
      return NextResponse.json({
        status: "incomplete",
        redirectUrl: "/onboarding/workspace-choice",
        message: "Workspace onboarding is not complete"
      });
    }

    // If we reach here, the user has a workspace and onboarding is complete
    return NextResponse.json({
      status: "success",
      redirectUrl: "/dashboard",
      message: "Workspace onboarding is complete"
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        status: "error",
        redirectUrl: "/onboarding/workspace-choice"
      },
      { status: 500 }
    );
  }
}

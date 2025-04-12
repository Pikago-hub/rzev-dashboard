import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { invitationId, workspaceId, userId, role } = await request.json();

    // Validate required parameters
    if (!invitationId || !workspaceId || !userId || !role) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify that the token matches the userId (simple check)
    if (token !== userId) {
      return NextResponse.json(
        { error: "Invalid authorization" },
        { status: 401 }
      );
    }

    // Get the user information
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: "Invalid user" },
        { status: 404 }
      );
    }
    
    const user = userData.user;

    // Check if the invitation exists and is valid
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('workspace_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('workspace_id', workspaceId)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: "Invalid invitation" },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (invitation.status === "expired" || new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if invitation is already accepted
    if (invitation.status === "accepted") {
      return NextResponse.json(
        { error: "Invitation has already been accepted" },
        { status: 400 }
      );
    }

    // Check if the user is already a member of the workspace
    const { data: existingMember } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('team_member_id', userId)
      .maybeSingle();

    if (existingMember) {
      // User is already a member, update invitation status anyway
      await supabaseAdmin
        .from('workspace_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      return NextResponse.json({
        success: true,
        message: "You are already a member of this workspace",
        alreadyMember: true
      });
    }

    // Check if the user already exists in team_members
    const { data: existingTeamMember } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    
    // If the team member doesn't exist, create one
    if (!existingTeamMember) {
      const userMetadata = user.user_metadata || {};
      
      // Insert the team member
      const { error: createTeamMemberError } = await supabaseAdmin
        .from("team_members")
        .insert({
          id: userId,
          display_name: userMetadata.full_name || user.email,
          email: user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      if (createTeamMemberError) {
        console.error("Error creating team member:", createTeamMemberError);
        return NextResponse.json(
          { error: "Failed to create team member profile" },
          { status: 500 }
        );
      }
    }

    // Update invitation status to accepted
    const { error: updateError } = await supabaseAdmin
      .from('workspace_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error("Error updating invitation status:", updateError);
      return NextResponse.json(
        { error: "Failed to update invitation status" },
        { status: 500 }
      );
    }

    // Add user to workspace_members
    const { error: insertError } = await supabaseAdmin
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        team_member_id: userId,
        role: role,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error adding user to workspace:", insertError);
      return NextResponse.json(
        { error: "Failed to add user to workspace" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully"
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
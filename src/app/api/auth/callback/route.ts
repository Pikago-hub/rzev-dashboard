import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken } = await request.json();
    
    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: "Access token and refresh token are required" },
        { status: 400 }
      );
    }

    // Verify the tokens and get the user
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData.user) {
      console.error("Error verifying user tokens:", userError);
      return NextResponse.json(
        { error: "Invalid tokens", status: "error" },
        { status: 401 }
      );
    }

    const user = userData.user;

    // Check if user exists and if is_professional flag is not set, update it
    const isOAuthUser =
      user.app_metadata?.provider === "google" ||
      user.app_metadata?.provider === "apple";
    const needsProfessionalFlagUpdate = !user.user_metadata?.is_professional;

    if (needsProfessionalFlagUpdate || isOAuthUser) {
      console.log("Setting user as professional for OAuth user");
      
      // Update user metadata to include is_professional flag
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            is_professional: true,
            // Preserve existing metadata
            ...user.user_metadata,
          },
        }
      );

      if (updateError) {
        console.error("Error updating user metadata:", updateError);
        // Continue with the process even if this fails
      } else {
        console.log("User metadata updated successfully");
      }
    }

    // Check for any pending workspace invitations for this user's email
    if (user.email) {
      const { data: pendingInvitations, error: invitationsError } = await supabaseAdmin
        .from("workspace_invitations")
        .select("id, workspace_id, role")
        .eq("email", user.email)
        .eq("status", "pending");
        
      if (!invitationsError && pendingInvitations && pendingInvitations.length > 0) {
        console.log(`Found ${pendingInvitations.length} pending invitations for ${user.email}`);
        
        // Process the first pending invitation
        const invitation = pendingInvitations[0];
        
        // Check if user is already a member of this workspace
        const { data: existingMember } = await supabaseAdmin
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", invitation.workspace_id)
          .eq("team_member_id", user.id)
          .maybeSingle();
          
        // If member doesn't exist (either no error but null data, or not found error)
        if (!existingMember) {
          // Add user to workspace_members
          const { error: insertError } = await supabaseAdmin
            .from("workspace_members")
            .insert({
              workspace_id: invitation.workspace_id,
              team_member_id: user.id,
              role: invitation.role,
              active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            
          if (insertError) {
            console.error("Error automatically adding user to workspace:", insertError);
          } else {
            console.log("User automatically added to workspace from pending invitation");
            
            // Update invitation status to accepted
            await supabaseAdmin
              .from("workspace_invitations")
              .update({ 
                status: "accepted",
                accepted_at: new Date().toISOString()
              })
              .eq("id", invitation.id);
          }
        } else {
          console.log("User is already a member of the invited workspace");
        }
      }
    }

    // Ensure the user has a team_member record
    // Check if the user already exists in the team_members table
    const { data: existingTeamMember, error: teamMemberError } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("id", user.id)
      .single();

    if (teamMemberError) {
      console.error("Error checking team member:", teamMemberError);
      // Continue with the process even if this fails
    }

    // If the team member doesn't exist, create one
    const isNotFoundError = teamMemberError && 
      typeof teamMemberError === 'object' && 
      'message' in teamMemberError && 
      teamMemberError.message.includes('no rows');
      
    if (!existingTeamMember || isNotFoundError) {
      // Extract user information from metadata
      const firstName = user.user_metadata?.first_name || "";
      const lastName = user.user_metadata?.last_name || "";
      const displayName = user.user_metadata?.display_name || `${firstName} ${lastName}`.trim() || user.email;
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
      const phone = user.user_metadata?.phone || user.phone || null;

      // Create the team member
      const { error: createError } = await supabaseAdmin
        .from("team_members")
        .insert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          email: user.email,
          phone: phone,
          avatar_url: avatarUrl,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (createError) {
        console.error("Error creating team member:", createError);
        // Continue with the process even if this fails
      } else {
        console.log("Team member created successfully");
      }
    }

    // Check if the user is associated with any workspace
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("team_member_id", user.id)
      .maybeSingle();

    let redirectUrl = "/dashboard"; // Default redirect

    // For newly signed up users without a workspace, check if they have pending invitations
    if (!workspaceData || workspaceError) {
      // Check for pending invitations
      if (user.email) {
        const { data: pendingInvitations } = await supabaseAdmin
          .from("workspace_invitations")
          .select("id, token")
          .eq("email", user.email)
          .eq("status", "pending");
          
        if (pendingInvitations && pendingInvitations.length > 0) {
          // If they have a pending invitation, redirect them to accept it
          const inviteToken = pendingInvitations[0].token || pendingInvitations[0].id;
          redirectUrl = `/auth/accept-invitation?token=${inviteToken}`;
          console.log(`User has pending invitation. Redirecting to: ${redirectUrl}`);
          
          return NextResponse.json({
            status: "success",
            redirectUrl,
          });
        }
      }
      
      // If no pending invitations, redirect to workspace choice
      redirectUrl = "/onboarding/workspace-choice";
    } else if (workspaceData && workspaceData.workspace_id) {
      // User is already associated with a workspace
      // Check if onboarding is complete
      const { data: workspace, error: workspaceDetailsError } = await supabaseAdmin
        .from("workspaces")
        .select("onboarding_complete")
        .eq("id", workspaceData.workspace_id)
        .maybeSingle();

      if (!workspaceDetailsError && workspace && workspace.onboarding_complete) {
        redirectUrl = "/dashboard";
      } else {
        redirectUrl = "/onboarding/workspace-choice";
      }
    }

    return NextResponse.json({
      status: "success",
      redirectUrl,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error", status: "error" },
      { status: 500 }
    );
  }
}

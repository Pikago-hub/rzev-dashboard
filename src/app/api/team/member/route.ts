import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Helper function to get the auth token and user
async function getAuth(request: NextRequest) {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    // Use token to get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (!userError && user) {
      return { token, user };
    }
  }
  
  // Try cookie-based auth with normal supabase client
  const cookieStore = await cookies();
  
  // Debug cookies
  console.log("All cookies:", cookieStore.getAll().map(c => c.name));
  
  // Create a supabase client using cookieStore
  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          cookie: cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')
        }
      }
    }
  );
  
  // Try to get session directly
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  console.log("Session result:", !!session, "Error:", !!sessionError);
  
  if (sessionError || !session) {
    return { token: null, user: null };
  }
  
  return { token: session.access_token, user: session.user };
}

// Helper function to validate user has admin access to the workspace
async function validateUserAndWorkspace(
  userId: string, 
  workspaceId: string
) {
  if (!userId) {
    return { error: "Authentication required", status: 401, user: null };
  }

  // Check if user is a member of the workspace
  const { data: workspaceMember, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('team_member_id', userId)
    .single();

  if (memberError || !workspaceMember) {
    return { error: "You don't have access to this workspace", status: 403, user: null };
  }

  // Check if user has admin role (only admins can manage team members)
  if (workspaceMember.role !== 'admin' && workspaceMember.role !== 'owner') {
    return { error: "You don't have permission to manage team members", status: 403, user: null };
  }

  return { error: null, status: 200, user: userId };
}

// Create or update a team member
export async function POST(request: NextRequest) {
  try {
    const { 
      teamMemberId,
      name,
      email,
      role,
      active,
      workspaceId 
    } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    // Get authorization and user
    const { user } = await getAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }
    
    // Validate user has admin access to the workspace
    const validation = await validateUserAndWorkspace(user.id, workspaceId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    let teamMemberToUpdate = teamMemberId;

    // If no teamMemberId, we're creating a new member
    if (!teamMemberToUpdate) {
      // Check if a team member with this email already exists
      if (email) {
        const { data: existingUser, error: existingUserError } = await supabaseAdmin
          .from('team_members')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingUserError) {
          console.error("Error checking existing user:", existingUserError);
          return NextResponse.json(
            { error: "Failed to check existing user" },
            { status: 500 }
          );
        }

        if (existingUser) {
          teamMemberToUpdate = existingUser.id;
        }
      }
      
      if (!teamMemberToUpdate) {
        // Create a new team member
        const { data: newTeamMember, error: createError } = await supabaseAdmin
          .from('team_members')
          .insert({
            display_name: name,
            email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (createError) {
          console.error("Error creating team member:", createError);
          return NextResponse.json(
            { error: "Failed to create team member" },
            { status: 500 }
          );
        }

        teamMemberToUpdate = newTeamMember.id;
      }
    } else {
      // Update existing team member info
      const { error: updateError } = await supabaseAdmin
        .from('team_members')
        .update({
          display_name: name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', teamMemberToUpdate);

      if (updateError) {
        console.error("Error updating team member:", updateError);
        return NextResponse.json(
          { error: "Failed to update team member" },
          { status: 500 }
        );
      }
    }

    // Check if this member is already associated with the workspace
    const { data: existingWorkspaceMember, error: existingError } = await supabaseAdmin
      .from('workspace_members')
      .select('team_member_id')
      .eq('workspace_id', workspaceId)
      .eq('team_member_id', teamMemberToUpdate)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking workspace membership:", existingError);
      return NextResponse.json(
        { error: "Failed to check workspace membership" },
        { status: 500 }
      );
    }

    if (existingWorkspaceMember) {
      // Update existing workspace member
      const { error: updateError } = await supabaseAdmin
        .from('workspace_members')
        .update({
          role,
          active,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId)
        .eq('team_member_id', teamMemberToUpdate);

      if (updateError) {
        console.error("Error updating workspace member:", updateError);
        return NextResponse.json(
          { error: "Failed to update workspace member" },
          { status: 500 }
        );
      }
    } else {
      // Add to workspace_members
      const { error: memberError } = await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          team_member_id: teamMemberToUpdate,
          role,
          active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (memberError) {
        console.error("Error adding workspace member:", memberError);
        return NextResponse.json(
          { error: "Failed to add team member to workspace" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Team member updated successfully",
      teamMemberId: teamMemberToUpdate
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete a team member
export async function DELETE(request: NextRequest) {
  try {
    // Get the workspace ID and team member ID from the query string
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const teamMemberId = searchParams.get('teamMemberId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    if (!teamMemberId) {
      return NextResponse.json(
        { error: "Team member ID is required" },
        { status: 400 }
      );
    }

    // Get authorization and user
    const { user } = await getAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }
    
    // Validate user has admin access to the workspace
    const validation = await validateUserAndWorkspace(user.id, workspaceId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Can't delete yourself
    if (user.id === teamMemberId) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the workspace" },
        { status: 400 }
      );
    }

    // Remove the team member from the workspace
    const { error: deleteError } = await supabaseAdmin
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('team_member_id', teamMemberId);

    if (deleteError) {
      console.error("Error deleting team member:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete team member" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Team member removed from workspace successfully"
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
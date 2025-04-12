import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // First check if the user has a team_member record
    const { error: teamMemberError } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("id", userId)
      .single();

    if (teamMemberError) {
      console.error("Error finding team member:", teamMemberError);

      // If the team member doesn't exist, create one
      if (teamMemberError.code === "PGRST116") {
        // Get user data from auth.users
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.admin.getUserById(userId);

        if (userError) {
          console.error("Error fetching user data:", userError);
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        const userEmail = userData.user?.email;

        // Create team member record
        const { error: createError } = await supabaseAdmin
          .from("team_members")
          .insert({
            id: userId,
            email: userEmail,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (createError) {
          console.error("Error creating team member:", createError);
          return NextResponse.json(
            { error: "Failed to create team member" },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Team member not found" },
          { status: 404 }
        );
      }
    }

    // Now get the workspace member - using admin client bypasses RLS policies
    const { data: workspaceMember, error: workspaceMemberError } =
      await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("team_member_id", userId)
        .single();

    if (workspaceMemberError) {
      console.error("Error finding workspace member:", workspaceMemberError);

      // If the user doesn't have a workspace yet, return a specific error
      if (workspaceMemberError.code === "PGRST116") {
        return NextResponse.json({
          success: false,
          error: "No workspace associated with this user",
          code: "NO_WORKSPACE",
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: "Workspace member not found",
          code: workspaceMemberError.code,
          details: workspaceMemberError,
        },
        { status: 404 }
      );
    }

    // We already handle the case where workspaceMember is null in the error check above
    const workspaceId = workspaceMember.workspace_id;

    // Get workspace data
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("name, website")
      .eq("id", workspaceId)
      .single();

    if (workspaceError) {
      console.error("Error fetching workspace:", workspaceError);
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspaceId,
        name: workspace.name,
        website: workspace.website,
      },
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

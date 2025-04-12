import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/auth-utils";
import { getAuthAndValidateWorkspaceAction } from "@/lib/server/workspace-actions";

// The final transformed team member format
interface FormattedTeamMember {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  active: boolean;
}

// Auth user structure
interface AuthUser {
  id: string;
  email: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // Get the workspace ID from the query string
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    // Get authorization and validate workspace access
    const auth = await getAuthAndValidateWorkspaceAction(request, workspaceId);

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Check user's role - staff can only see themselves
    const isStaff = auth.isStaff || false;

    // Build the query for team members
    let query = supabaseAdmin
      .from("workspace_members")
      .select(
        `
        team_member_id,
        role,
        active,
        team_members:team_member_id (id, display_name, email)
      `
      )
      .eq("workspace_id", workspaceId);

    // If user is staff, only fetch their own record
    if (isStaff) {
      query = query.eq("team_member_id", auth.user?.id || "");
    }

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching team members:", error);
      return NextResponse.json(
        { error: "Failed to fetch team members" },
        { status: 500 }
      );
    }

    // If no team members found in the workspace
    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        teamMembers: [],
      });
    }

    // Get auth user emails as a backup
    const memberIds = data.map((member) => member.team_member_id);

    // Use a direct SQL query with the service role key
    const { data: authUsers, error: authError } = await supabaseAdmin
      .from("team_members")
      .select("id, email")
      .in("id", memberIds);

    if (authError) {
      console.error("Error fetching auth users:", authError);
    }

    // Create a map of user IDs to emails from auth.users
    const userEmailMap = new Map<string, string>();
    if (authUsers && authUsers.length > 0) {
      (authUsers as AuthUser[]).forEach((user) => {
        if (user.id && user.email) {
          userEmailMap.set(user.id, user.email);
        }
      });
    }

    // Transform the data with email fallback logic
    const formattedMembers: FormattedTeamMember[] = data.map((item) => {
      let teamMemberData: {
        id: string;
        display_name: string;
        email: string | null;
      } = {
        id: item.team_member_id,
        display_name: "Team Member",
        email: null,
      };

      // Handle both array and direct object format for team_members
      if (item.team_members) {
        if (Array.isArray(item.team_members) && item.team_members.length > 0) {
          teamMemberData = item.team_members[0];
        } else if (!Array.isArray(item.team_members)) {
          teamMemberData = item.team_members;
        }
      }

      // First try to get email from team_members, then from auth.users
      const email =
        teamMemberData.email || userEmailMap.get(item.team_member_id) || null;

      return {
        id: item.team_member_id,
        display_name: teamMemberData.display_name || "Team Member",
        email: email,
        role: item.role,
        active: item.active,
      };
    });

    return NextResponse.json({
      success: true,
      teamMembers: formattedMembers,
      isStaff: isStaff, // Include this flag so frontend knows if user is staff
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

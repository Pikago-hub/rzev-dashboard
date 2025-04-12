import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Define types for the data structure returned by Supabase
interface TeamMember {
  id: string;
  display_name: string;
  email: string | null;
}

interface WorkspaceMember {
  team_member_id: string;
  role: string;
  active: boolean;
  team_members: TeamMember[] | null;
}

export async function GET(request: NextRequest) {
  try {
    // Get the workspace ID from the query string
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
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
    
    // Validate the token and get the user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid authorization" },
        { status: 401 }
      );
    }

    // Check if user is a member of the workspace
    const { data: workspaceMember, error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('team_member_id', user.id)
      .single();

    if (memberError || !workspaceMember) {
      return NextResponse.json(
        { error: "You don't have access to this workspace" },
        { status: 403 }
      );
    }

    // Fetch team members
    const { data, error } = await supabaseAdmin
      .from('workspace_members')
      .select(`
        team_member_id,
        role,
        active,
        team_members(id, display_name, email)
      `)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error("Error fetching team members:", error);
      return NextResponse.json(
        { error: "Failed to fetch team members" },
        { status: 500 }
      );
    }

    // Transform the data
    const formattedMembers = (data as unknown as WorkspaceMember[]).map(item => ({
      id: item.team_member_id,
      display_name: item.team_members && item.team_members[0]?.display_name || "Team Member",
      email: item.team_members && item.team_members[0]?.email || null,
      role: item.role,
      active: item.active
    }));

    return NextResponse.json({
      success: true,
      teamMembers: formattedMembers
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
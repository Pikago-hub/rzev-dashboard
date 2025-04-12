import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Helper function to validate user has access to the workspace
async function validateUserAccess(token: string, teamMemberId: string) {
  if (!token) {
    return { error: "Authentication required", status: 401 };
  }

  // Validate the token and get the user
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  
  if (userError || !user) {
    return { error: "Invalid authorization", status: 401 };
  }

  // Get workspace ID for the team member
  const { data: workspaceMember, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('team_member_id', teamMemberId)
    .maybeSingle();

  if (memberError || !workspaceMember) {
    return { error: "Team member not found", status: 404 };
  }

  // Check if user is a member of the same workspace
  const { data: userWorkspace, error: workspaceError } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceMember.workspace_id)
    .eq('team_member_id', user.id)
    .maybeSingle();

  if (workspaceError || !userWorkspace) {
    return { error: "You don't have access to this team member", status: 403 };
  }

  return { error: null, status: 200 };
}

// Get availabilities for a team member
export async function GET(request: NextRequest) {
  try {
    // Get the team member ID from the query string
    const { searchParams } = new URL(request.url);
    const teamMemberId = searchParams.get('teamMemberId');

    if (!teamMemberId) {
      return NextResponse.json(
        { error: "Team member ID is required" },
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
    
    // Validate user access
    const validation = await validateUserAccess(token, teamMemberId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Fetch availabilities for this team member
    const { data, error } = await supabaseAdmin
      .from("team_member_availability")
      .select("*")
      .eq("team_member_id", teamMemberId)
      .order("day_of_week");

    if (error) {
      console.error("Error fetching availabilities:", error);
      return NextResponse.json(
        { error: "Failed to fetch availabilities" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      availabilities: data
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add or update availability
export async function POST(request: NextRequest) {
  try {
    const { 
      id,
      teamMemberId,
      dayOfWeek,
      startTime,
      endTime
    } = await request.json();

    if (!teamMemberId) {
      return NextResponse.json(
        { error: "Team member ID is required" },
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
    
    // Validate user access
    const validation = await validateUserAccess(token, teamMemberId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    if (id) {
      // Update existing availability
      const { error } = await supabaseAdmin
        .from("team_member_availability")
        .update({
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error updating availability:", error);
        return NextResponse.json(
          { error: "Failed to update availability" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Availability updated successfully"
      });
    } else {
      // Add new availability
      const { data, error } = await supabaseAdmin
        .from("team_member_availability")
        .insert({
          team_member_id: teamMemberId,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding availability:", error);
        return NextResponse.json(
          { error: "Failed to add availability" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        availability: data,
        message: "Availability added successfully"
      });
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete an availability
export async function DELETE(request: NextRequest) {
  try {
    // Get the availability ID and team member ID from the query string
    const { searchParams } = new URL(request.url);
    const availabilityId = searchParams.get('id');
    const teamMemberId = searchParams.get('teamMemberId');

    if (!availabilityId) {
      return NextResponse.json(
        { error: "Availability ID is required" },
        { status: 400 }
      );
    }

    if (!teamMemberId) {
      return NextResponse.json(
        { error: "Team member ID is required" },
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
    
    // Validate user access
    const validation = await validateUserAccess(token, teamMemberId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Delete the availability
    const { error } = await supabaseAdmin
      .from("team_member_availability")
      .delete()
      .eq("id", availabilityId)
      .eq("team_member_id", teamMemberId);

    if (error) {
      console.error("Error deleting availability:", error);
      return NextResponse.json(
        { error: "Failed to delete availability" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Availability deleted successfully"
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
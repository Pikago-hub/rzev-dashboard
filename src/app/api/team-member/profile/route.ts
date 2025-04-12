import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Create or update a team member profile
export async function POST(request: NextRequest) {
  try {
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

    // Get request body
    const { userId, profileData } = await request.json();

    // Verify userId matches authenticated user
    if (userId !== user.id) {
      return NextResponse.json(
        { error: "You can only update your own profile" },
        { status: 403 }
      );
    }

    // Check if the user exists in the team_members table
    const { data: existingTeamMember, error: teamMemberError } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("id", userId)
      .single();

    if (teamMemberError && teamMemberError.code !== "PGRST116") { // PGRST116 is "not found" error
      console.error("Error checking team member:", teamMemberError);
      return NextResponse.json(
        { error: "Failed to check if team member exists" },
        { status: 500 }
      );
    }

    // Prepare the profile data to update
    const updateData = {
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      display_name: profileData.display_name,
      phone: profileData.phone,
      updated_at: new Date().toISOString(),
    };

    if (!existingTeamMember) {
      // If the team member doesn't exist, create one
      const { error: createError } = await supabaseAdmin
        .from("team_members")
        .insert({
          id: userId,
          ...updateData,
          email: user.email,
          active: true,
          created_at: new Date().toISOString(),
        });

      if (createError) {
        console.error("Error creating team member profile:", createError);
        return NextResponse.json(
          { error: "Failed to create team member profile" },
          { status: 500 }
        );
      }
    } else {
      // Update existing team member
      const { error: updateError } = await supabaseAdmin
        .from("team_members")
        .update(updateData)
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating team member profile:", updateError);
        return NextResponse.json(
          { error: "Failed to update team member profile" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
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
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get the user from Supabase
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      console.error("Error fetching user:", userError);
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      );
    }

    const user = userData.user;
    
    // Check if the user is a professional
    const isProfessional = user.user_metadata?.is_professional === true;
    
    if (!isProfessional) {
      return NextResponse.json({ 
        success: false,
        message: "User is not a professional" 
      });
    }

    // Check if the user already exists in the team_members table
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

    // If the team member doesn't exist, create one
    if (!existingTeamMember) {
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
          id: userId,
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
        return NextResponse.json(
          { error: "Failed to create team member" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Team member populated successfully",
      teamMemberId: userId
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

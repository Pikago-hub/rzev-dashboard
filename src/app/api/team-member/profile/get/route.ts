import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Get a team member's profile
export async function GET(request: NextRequest) {
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

    // Fetch the team member profile
    const { data: teamMember, error: teamMemberError } = await supabaseAdmin
      .from("team_members")
      .select("id, first_name, last_name, display_name, email, phone, avatar_url")
      .eq("id", user.id)
      .single();

    if (teamMemberError && teamMemberError.code !== "PGRST116") { // PGRST116 is "not found" error
      console.error("Error fetching team member:", teamMemberError);
      return NextResponse.json(
        { error: "Failed to fetch team member profile" },
        { status: 500 }
      );
    }

    // If team member doesn't exist, return default structure
    if (!teamMember) {
      // Return minimal user data from auth
      return NextResponse.json({
        success: true,
        profile: {
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || "",
          last_name: user.user_metadata?.last_name || "",
          display_name: user.user_metadata?.display_name || user.email,
          phone: user.phone || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        }
      });
    }

    return NextResponse.json({
      success: true,
      profile: teamMember
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
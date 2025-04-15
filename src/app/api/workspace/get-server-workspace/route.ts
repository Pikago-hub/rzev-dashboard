import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function GET(request: NextRequest) {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get("Authorization");
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // If no token in header, try to get from cookies as fallback
    if (!token) {
      // Get the session cookie directly from the request - async version
      const cookieStore = await cookies();
      const supabaseAuthCookie = cookieStore.get("supabase-auth");

      if (!supabaseAuthCookie?.value) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      token = supabaseAuthCookie.value;
    }

    // Use the token to get the user's session
    const {
      data: { user },
      error: sessionError,
    } = await supabaseAdmin.auth.getUser(token);

    if (sessionError || !user) {
      console.error("Session error:", sessionError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the user's workspace member record using admin client (bypasses RLS)
    const { data: workspaceMember, error: workspaceMemberError } =
      await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id, role, active")
        .eq("team_member_id", user.id)
        .single();

    if (workspaceMemberError) {
      console.error("Error finding workspace member:", workspaceMemberError);
      return NextResponse.json(
        { error: "No workspace associated with this user" },
        { status: 404 }
      );
    }

    // Get the workspace details using admin client (bypasses RLS)
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("*")
      .eq("id", workspaceMember.workspace_id)
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
      workspaceProfile: workspace,
      userRole: workspaceMember.role,
      isActive: workspaceMember.active,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

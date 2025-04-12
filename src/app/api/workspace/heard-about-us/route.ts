import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// GET: Fetch heard about us data for a user's workspace
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

    // Get the user's workspace
    const { data: workspaceMember, error: workspaceMemberError } =
      await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("team_member_id", userId)
        .single();

    if (workspaceMemberError) {
      console.error("Error finding workspace member:", workspaceMemberError);
      return NextResponse.json(
        { error: "Workspace not found for this user" },
        { status: 404 }
      );
    }

    // Get the workspace heard_about_us data
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("heard_about_us")
      .eq("id", workspaceMember.workspace_id)
      .single();

    if (workspaceError) {
      console.error("Error fetching workspace:", workspaceError);
      return NextResponse.json(
        { error: "Failed to fetch workspace data" },
        { status: 500 }
      );
    }

    // Return the heard_about_us data
    return NextResponse.json({
      success: true,
      heardAboutUs: workspace.heard_about_us || null,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Update heard about us data for a user's workspace
export async function POST(request: NextRequest) {
  try {
    const { userId, source, otherSource } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!source) {
      return NextResponse.json(
        { error: "Source is required" },
        { status: 400 }
      );
    }

    // If "other" is selected, validate that a value is provided
    if (source === "other" && !otherSource?.trim()) {
      return NextResponse.json(
        { error: "Other source value is required when 'other' is selected" },
        { status: 400 }
      );
    }

    // Get the user's workspace
    const { data: workspaceMember, error: workspaceMemberError } =
      await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("team_member_id", userId)
        .single();

    if (workspaceMemberError) {
      console.error("Error finding workspace member:", workspaceMemberError);
      return NextResponse.json(
        { error: "Workspace not found for this user" },
        { status: 404 }
      );
    }

    // Prepare data to save
    let heardAboutUsValue;

    if (source === "other") {
      // Format as "other: [value]" for "other" selection
      heardAboutUsValue = `other: ${otherSource.trim()}`;
    } else {
      // Just use the selected source for other options
      heardAboutUsValue = source;
    }

    // Update the workspace heard_about_us data and mark onboarding as complete
    const { error: updateError } = await supabaseAdmin
      .from("workspaces")
      .update({
        heard_about_us: heardAboutUsValue,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceMember.workspace_id);

    if (updateError) {
      console.error("Error updating heard about us data:", updateError);
      return NextResponse.json(
        { error: "Failed to update heard about us data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Heard about us data updated successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

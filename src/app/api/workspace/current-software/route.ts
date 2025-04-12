import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// GET: Fetch current software data for a user's workspace
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

    // Get the workspace current_software data
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("current_software")
      .eq("id", workspaceMember.workspace_id)
      .single();

    if (workspaceError) {
      console.error("Error fetching workspace:", workspaceError);
      return NextResponse.json(
        { error: "Failed to fetch workspace data" },
        { status: 500 }
      );
    }

    // Return the current_software data
    return NextResponse.json({
      success: true,
      currentSoftware: workspace.current_software || null,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Update current software data for a user's workspace
export async function POST(request: NextRequest) {
  try {
    const { userId, software, otherSoftware } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!software) {
      return NextResponse.json(
        { error: "Software selection is required" },
        { status: 400 }
      );
    }

    // If "other" is selected, validate that a value is provided
    if (software === "other" && !otherSoftware?.trim()) {
      return NextResponse.json(
        { error: "Other software value is required when 'other' is selected" },
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
    let softwareValue;

    if (software === "other") {
      // Format as "other: [value]" for "other" selection
      softwareValue = `other: ${otherSoftware.trim()}`;
    } else {
      // Just use the selected software for other options
      softwareValue = software;
    }

    // Update the workspace current_software data
    const { error: updateError } = await supabaseAdmin
      .from("workspaces")
      .update({
        current_software: softwareValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceMember.workspace_id);

    if (updateError) {
      console.error("Error updating current software data:", updateError);
      return NextResponse.json(
        { error: "Failed to update current software data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Current software data updated successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// GET: Fetch business location data for a user's workspace
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

    // Get the workspace address, lat, lng data
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("address, lat, lng")
      .eq("id", workspaceMember.workspace_id)
      .single();

    if (workspaceError) {
      console.error("Error fetching workspace:", workspaceError);
      return NextResponse.json(
        { error: "Failed to fetch workspace data" },
        { status: 500 }
      );
    }

    // Return the address data
    return NextResponse.json({
      success: true,
      address: workspace.address || null,
      lat: workspace.lat || null,
      lng: workspace.lng || null,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Update business location data for a user's workspace
export async function POST(request: NextRequest) {
  try {
    const { userId, address, lat, lng } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!address || typeof address !== "object") {
      return NextResponse.json(
        { error: "Address object is required" },
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

    // Update the workspace address, lat, lng
    const { error: updateError } = await supabaseAdmin
      .from("workspaces")
      .update({
        address: address,
        lat: lat || null,
        lng: lng || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceMember.workspace_id);

    if (updateError) {
      console.error("Error updating business location:", updateError);
      return NextResponse.json(
        { error: "Failed to update business location" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Business location updated successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

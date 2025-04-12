import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// GET: Fetch service locations for a user's workspace
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

    // Get the workspace service_locations
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("service_locations")
      .eq("id", workspaceMember.workspace_id)
      .single();

    if (workspaceError) {
      console.error("Error fetching workspace:", workspaceError);
      return NextResponse.json(
        { error: "Failed to fetch workspace data" },
        { status: 500 }
      );
    }

    // Return the service_locations data
    return NextResponse.json({
      success: true,
      serviceLocations: workspace.service_locations || null,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Update service locations for a user's workspace
export async function POST(request: NextRequest) {
  try {
    const { userId, serviceLocations } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!serviceLocations || !Array.isArray(serviceLocations)) {
      return NextResponse.json(
        { error: "Service locations array is required" },
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

    // Ensure case sensitivity is preserved in service locations
    console.log("Original service locations:", serviceLocations);

    // Make sure the case is correct for service locations
    const normalizedServiceLocations = serviceLocations.map(
      (location: string) => {
        if (location.toLowerCase() === "instore") return "inStore";
        if (location.toLowerCase() === "clientlocation")
          return "clientLocation";
        return location;
      }
    );

    console.log("Normalized service locations:", normalizedServiceLocations);

    // Update the workspace service_locations
    const { error: updateError } = await supabaseAdmin
      .from("workspaces")
      .update({
        service_locations: normalizedServiceLocations,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceMember.workspace_id);

    if (updateError) {
      console.error("Error updating service locations:", updateError);
      return NextResponse.json(
        { error: "Failed to update service locations" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Service locations updated successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

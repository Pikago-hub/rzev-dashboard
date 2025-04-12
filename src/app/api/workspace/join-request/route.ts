import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function POST(request: NextRequest) {
  try {
    const { userId, workspaceId, message } = await request.json();

    if (!userId || !workspaceId) {
      return NextResponse.json({ 
        error: "User ID and Workspace ID are required" 
      }, { status: 400 });
    }

    // Check if the workspace exists
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      console.error("Error finding workspace:", workspaceError);
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if the user already has a pending request for this workspace
    const { data: existingRequest, error: requestError } = await supabaseAdmin
      .from("workspace_join_requests")
      .select("id, status")
      .eq("team_member_id", userId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (requestError) {
      console.error("Error checking existing requests:", requestError);
      return NextResponse.json(
        { error: "Failed to check existing requests" },
        { status: 500 }
      );
    }

    // If there's a pending request, don't create a new one
    if (existingRequest && existingRequest.length > 0 && existingRequest[0].status === "pending") {
      return NextResponse.json({
        success: false,
        message: "A pending request already exists",
        requestId: existingRequest[0].id
      });
    }

    // Create a new join request
    const { data: joinRequest, error: joinError } = await supabaseAdmin
      .from("workspace_join_requests")
      .insert({
        workspace_id: workspaceId,
        team_member_id: userId,
        message: message || null,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (joinError) {
      console.error("Error creating join request:", joinError);
      return NextResponse.json(
        { error: "Failed to create join request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Join request sent successfully",
      requestId: joinRequest.id
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

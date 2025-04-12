import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch service offerings for a user's workspace
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

    // Get the workspace business_type which contains services
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("business_type")
      .eq("id", workspaceMember.workspace_id)
      .single();

    if (workspaceError) {
      console.error("Error fetching workspace:", workspaceError);
      return NextResponse.json(
        { error: "Failed to fetch workspace data" },
        { status: 500 }
      );
    }

    // Return the business_type data which contains services
    return NextResponse.json({
      success: true,
      businessType: workspace.business_type || {},
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Update service offerings for a user's workspace
export async function POST(request: NextRequest) {
  try {
    const { userId, services, otherService } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!services || !Array.isArray(services)) {
      return NextResponse.json(
        { error: "Services array is required" },
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

    // Prepare the business_type data
    const businessTypeData = {
      services: services,
      ...(services.includes("other") && otherService
        ? { otherService: otherService }
        : {}),
    };

    // Update the workspace business_type
    const { error: updateError } = await supabaseAdmin
      .from("workspaces")
      .update({
        business_type: businessTypeData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceMember.workspace_id);

    if (updateError) {
      console.error("Error updating workspace services:", updateError);
      return NextResponse.json(
        { error: "Failed to update services" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Services updated successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

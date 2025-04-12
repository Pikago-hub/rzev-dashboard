import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/auth-utils";
import { getAuthAndValidateWorkspaceAction } from "@/lib/server/workspace-actions";

// GET: List all services for a workspace
export async function GET(request: NextRequest) {
  try {
    // Get the workspace ID from the query string
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const includeVariants = searchParams.get("includeVariants") === "true";

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    // Get authorization and validate workspace access
    const auth = await getAuthAndValidateWorkspaceAction(request, workspaceId);

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Fetch services for the workspace
    const query = supabaseAdmin
      .from("services")
      .select(
        includeVariants
          ? "id, workspace_id, name, description, color, active, created_at, updated_at, variants:service_variants(*)"
          : "*"
      )
      .eq("workspace_id", workspaceId)
      .order("name");

    const { data: services, error: servicesError } = await query;

    if (servicesError) {
      console.error("Error fetching services:", servicesError);
      return NextResponse.json(
        { error: "Failed to fetch services" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      services,
      isStaff: auth.isStaff,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new service
export async function POST(request: NextRequest) {
  try {
    const { name, description, color, active, workspaceId } =
      await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Service name is required" },
        { status: 400 }
      );
    }

    // Get authorization and validate workspace access (owner required for creating services)
    const auth = await getAuthAndValidateWorkspaceAction(
      request,
      workspaceId,
      "owner"
    );

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Staff cannot create services (this is redundant now with the admin role check above, but keeping for clarity)
    if (auth.isStaff) {
      return NextResponse.json(
        { error: "Staff members cannot create services" },
        { status: 403 }
      );
    }

    // Create the service
    const { data: service, error: createError } = await supabaseAdmin
      .from("services")
      .insert({
        workspace_id: workspaceId,
        name,
        description: description || null,
        color: color || null,
        active: active !== undefined ? active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating service:", createError);
      return NextResponse.json(
        { error: "Failed to create service" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      service,
      message: "Service created successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

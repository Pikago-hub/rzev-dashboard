import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/auth-utils";
import { getAuthAndValidateServiceAction } from "@/lib/server/workspace-actions";

// GET: Get a single service by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before accessing properties
    const p = await params;
    const serviceId = p.id;
    const { searchParams } = new URL(request.url);
    const includeVariants = searchParams.get("includeVariants") === "true";

    // Get authorization and validate service access
    const auth = await getAuthAndValidateServiceAction(request, serviceId);

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Fetch the service
    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select(
        includeVariants
          ? "id, workspace_id, name, description, color, active, created_at, updated_at, variants:service_variants(*)"
          : "*"
      )
      .eq("id", serviceId)
      .single();

    if (serviceError) {
      console.error("Error fetching service:", serviceError);
      return NextResponse.json(
        { error: "Failed to fetch service" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      service,
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

// PATCH: Update a service
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before accessing properties
    const p = await params;
    const serviceId = p.id;
    const { name, description, color, active } = await request.json();

    // Get authorization and validate service access (owner required for updating services)
    const auth = await getAuthAndValidateServiceAction(
      request,
      serviceId,
      "owner"
    );

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Staff cannot update services (redundant with admin role check, but keeping for clarity)
    if (auth.isStaff) {
      return NextResponse.json(
        { error: "Staff members cannot update services" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: Record<string, string | boolean | null> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (active !== undefined) updateData.active = active;

    // Update the service
    const { data: service, error: updateError } = await supabaseAdmin
      .from("services")
      .update(updateData)
      .eq("id", serviceId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating service:", updateError);
      return NextResponse.json(
        { error: "Failed to update service" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      service,
      message: "Service updated successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to access its properties
    const p = await params;
    const serviceId = p.id;

    // Get authorization and validate service access (owner required for deleting services)
    const auth = await getAuthAndValidateServiceAction(
      request,
      serviceId,
      "owner"
    );

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Staff cannot delete services (redundant with admin role check, but keeping for clarity)
    if (auth.isStaff) {
      return NextResponse.json(
        { error: "Staff members cannot delete services" },
        { status: 403 }
      );
    }

    // First delete all service variants
    const { error: deleteVariantsError } = await supabaseAdmin
      .from("service_variants")
      .delete()
      .eq("service_id", serviceId);

    if (deleteVariantsError) {
      console.error("Error deleting service variants:", deleteVariantsError);
      return NextResponse.json(
        { error: "Failed to delete service variants" },
        { status: 500 }
      );
    }

    // Then delete the service
    const { error: deleteError } = await supabaseAdmin
      .from("services")
      .delete()
      .eq("id", serviceId);

    if (deleteError) {
      console.error("Error deleting service:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete service" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

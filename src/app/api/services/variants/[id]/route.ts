import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Helper function to get user from auth header
async function getAuth(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Authorization required" };
  }

  const token = authHeader.split(" ")[1];
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "Invalid authorization" };
  }

  return { user, error: null };
}

// Helper function to validate user has access to service variant
async function validateUserAndVariant(userId: string, variantId: string) {
  // Get the variant to find its service
  const { data: variant, error: variantError } = await supabaseAdmin
    .from("service_variants")
    .select("service_id")
    .eq("id", variantId)
    .single();

  if (variantError || !variant) {
    return { error: "Service variant not found", status: 404 };
  }

  // Get the service to find its workspace
  const { data: service, error: serviceError } = await supabaseAdmin
    .from("services")
    .select("workspace_id")
    .eq("id", variant.service_id)
    .single();

  if (serviceError || !service) {
    return { error: "Service not found", status: 404 };
  }

  // Check if user is a member of the workspace
  const { data: workspaceMember, error: memberError } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", service.workspace_id)
    .eq("team_member_id", userId)
    .single();

  if (memberError || !workspaceMember) {
    return {
      error: "You don't have access to this service variant",
      status: 403,
    };
  }

  // Staff can view but not modify
  const isStaff = workspaceMember.role === "staff";

  return {
    error: null,
    status: 200,
    isStaff,
    workspaceId: service.workspace_id,
    serviceId: variant.service_id,
  };
}

// GET: Get a single service variant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before accessing properties
    const p = await params;
    const variantId = p.id;

    // Get authorization and user
    const { user, error: authError } = await getAuth(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Authorization required" },
        { status: 401 }
      );
    }

    // Validate user has access to the service variant
    const validation = await validateUserAndVariant(user.id, variantId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Fetch the service variant
    const { data: variant, error: variantError } = await supabaseAdmin
      .from("service_variants")
      .select("*")
      .eq("id", variantId)
      .single();

    if (variantError) {
      console.error("Error fetching service variant:", variantError);
      return NextResponse.json(
        { error: "Failed to fetch service variant" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      variant,
      isStaff: validation.isStaff,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH: Update a service variant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before accessing properties
    const p = await params;
    const variantId = p.id;
    const { name, description, duration, price, active } = await request.json();

    // Get authorization and user
    const { user, error: authError } = await getAuth(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Authorization required" },
        { status: 401 }
      );
    }

    // Validate user has access to the service variant
    const validation = await validateUserAndVariant(user.id, variantId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Staff cannot update service variants
    if (validation.isStaff) {
      return NextResponse.json(
        { error: "Staff members cannot update service variants" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: Record<string, string | number | boolean | null> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (duration !== undefined) updateData.duration = duration;
    if (price !== undefined) updateData.price = price;
    if (active !== undefined) updateData.active = active;

    // Update the service variant
    const { data: variant, error: updateError } = await supabaseAdmin
      .from("service_variants")
      .update(updateData)
      .eq("id", variantId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating service variant:", updateError);
      return NextResponse.json(
        { error: "Failed to update service variant" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      variant,
      message: "Service variant updated successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a service variant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before accessing properties
    const p = await params;
    const variantId = p.id;

    // Get authorization and user
    const { user, error: authError } = await getAuth(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Authorization required" },
        { status: 401 }
      );
    }

    // Validate user has access to the service variant
    const validation = await validateUserAndVariant(user.id, variantId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Staff cannot delete service variants
    if (validation.isStaff) {
      return NextResponse.json(
        { error: "Staff members cannot delete service variants" },
        { status: 403 }
      );
    }

    // Delete the service variant
    const { error: deleteError } = await supabaseAdmin
      .from("service_variants")
      .delete()
      .eq("id", variantId);

    if (deleteError) {
      console.error("Error deleting service variant:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete service variant" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Service variant deleted successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Helper function to get user from auth header
async function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: "Authorization required" };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    return { user: null, error: "Invalid authorization" };
  }

  return { user, error: null };
}

// Helper function to validate user has access to service
async function validateUserAndService(userId: string, serviceId: string) {
  // Get the service to find its workspace
  const { data: service, error: serviceError } = await supabaseAdmin
    .from('services')
    .select('workspace_id')
    .eq('id', serviceId)
    .single();

  if (serviceError || !service) {
    return { error: "Service not found", status: 404 };
  }

  // Check if user is a member of the workspace
  const { data: workspaceMember, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', service.workspace_id)
    .eq('team_member_id', userId)
    .single();

  if (memberError || !workspaceMember) {
    return { error: "You don't have access to this service", status: 403 };
  }

  // Staff can view but not modify
  const isStaff = workspaceMember.role === 'staff';

  return { error: null, status: 200, isStaff, workspaceId: service.workspace_id };
}

// GET: List all variants for a service
export async function GET(request: NextRequest) {
  try {
    // Get the service ID from the query string
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    // Get authorization and user
    const { user, error: authError } = await getAuth(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Authorization required" },
        { status: 401 }
      );
    }
    
    // Validate user has access to the service
    const validation = await validateUserAndService(user.id, serviceId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Fetch variants for the service
    const { data: variants, error: variantsError } = await supabaseAdmin
      .from('service_variants')
      .select('*')
      .eq('service_id', serviceId)
      .order('name');

    if (variantsError) {
      console.error("Error fetching service variants:", variantsError);
      return NextResponse.json(
        { error: "Failed to fetch service variants" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      variants,
      isStaff: validation.isStaff
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new service variant
export async function POST(request: NextRequest) {
  try {
    const { 
      serviceId,
      name,
      description,
      duration,
      price,
      active
    } = await request.json();

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Variant name is required" },
        { status: 400 }
      );
    }

    // Get authorization and user
    const { user, error: authError } = await getAuth(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Authorization required" },
        { status: 401 }
      );
    }
    
    // Validate user has access to the service
    const validation = await validateUserAndService(user.id, serviceId);
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Staff cannot create service variants
    if (validation.isStaff) {
      return NextResponse.json(
        { error: "Staff members cannot create service variants" },
        { status: 403 }
      );
    }

    // Create the service variant
    const { data: variant, error: createError } = await supabaseAdmin
      .from('service_variants')
      .insert({
        service_id: serviceId,
        name,
        description: description || null,
        duration: duration || null,
        price: price || null,
        active: active !== undefined ? active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating service variant:", createError);
      return NextResponse.json(
        { error: "Failed to create service variant" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      variant,
      message: "Service variant created successfully"
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

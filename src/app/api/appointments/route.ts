import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server/auth-utils";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// GET: Fetch appointments for a workspace
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const teamMemberId = searchParams.get("teamMemberId");

    // Validate required parameters
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    // Verify authentication
    const authResult = await getAuthUser(request);
    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has access to this workspace
    const { data: workspaceMember, error: workspaceMemberError } =
      await supabaseAdmin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("team_member_id", authResult.user.id)
        .single();

    if (workspaceMemberError || !workspaceMember) {
      return NextResponse.json(
        { error: "You don't have access to this workspace" },
        { status: 403 }
      );
    }

    // Build the query
    let query = supabaseAdmin
      .from("appointments")
      .select(
        `
        id,
        workspace_id,
        team_member_id,
        service_id,
        service_variant_id,
        customer_id,
        status,
        date,
        start_time,
        end_time,
        duration,
        customer_name,
        customer_email,
        customer_phone,
        price,
        payment_status,
        notes,
        customer_notes,
        internal_notes,
        notification_status,
        created_at,
        updated_at,
        cancelled_at,
        metadata,
        services(name, color),
        service_variants(name)
      `
      )
      .eq("workspace_id", workspaceId)
      // Exclude cancelled appointments
      .not("status", "eq", "cancelled");

    // Add date range filter if provided
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    // Add team member filter if provided
    if (teamMemberId && teamMemberId !== "all") {
      query = query.eq("team_member_id", teamMemberId);
    }

    // Execute the query
    const { data: appointments, error } = await query;

    if (error) {
      console.error("Error fetching appointments:", error);
      return NextResponse.json(
        { error: "Failed to fetch appointments" },
        { status: 500 }
      );
    }

    // Get team member information for the appointments
    const teamMemberIds = Array.from(
      new Set(appointments.map((apt) => apt.team_member_id))
    );

    const { data: teamMembers, error: teamMembersError } = await supabaseAdmin
      .from("team_members")
      .select("id, display_name, first_name, last_name, avatar_url")
      .in("id", teamMemberIds);

    if (teamMembersError) {
      console.error("Error fetching team members:", teamMembersError);
      // Continue without team member details
    }

    // Create a map of team members for easy lookup
    const teamMemberMap = new Map();
    if (teamMembers) {
      teamMembers.forEach((member) => {
        teamMemberMap.set(member.id, member);
      });
    }

    // Enhance appointments with team member details
    const enhancedAppointments = appointments.map((appointment) => {
      const teamMember = teamMemberMap.get(appointment.team_member_id);
      return {
        ...appointment,
        team_member: teamMember || null,
      };
    });

    return NextResponse.json({
      success: true,
      appointments: enhancedAppointments,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

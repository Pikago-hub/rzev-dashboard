import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/auth-utils";
import { getAuthAndValidateWorkspaceAction } from "@/lib/server/workspace-actions";

// GET: Fetch service assignments for a team member
export async function GET(request: NextRequest) {
  try {
    // Get the team member ID from the query string
    const { searchParams } = new URL(request.url);
    const teamMemberId = searchParams.get("teamMemberId");
    const workspaceId = searchParams.get("workspaceId");

    if (!teamMemberId) {
      return NextResponse.json(
        { error: "Team member ID is required" },
        { status: 400 }
      );
    }

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

    // Staff can only view their own assignments
    if (auth.isStaff && auth.user?.id !== teamMemberId) {
      return NextResponse.json(
        { error: "You can only view your own service assignments" },
        { status: 403 }
      );
    }

    // Fetch service assignments for this team member
    const { data: assignedServices, error: assignmentError } =
      await supabaseAdmin
        .from("team_member_services")
        .select(
          `
        id,
        service_id,
        self_assigned,
        assigned_by,
        assigned_at,
        active,
        services:service_id (
          id,
          name,
          description,
          color
        )
      `
        )
        .eq("team_member_id", teamMemberId)
        .order("created_at", { ascending: false });

    if (assignmentError) {
      console.error("Error fetching service assignments:", assignmentError);
      return NextResponse.json(
        { error: "Failed to fetch service assignments" },
        { status: 500 }
      );
    }

    // Fetch all available services for the workspace
    const { data: allServices, error: servicesError } = await supabaseAdmin
      .from("services")
      .select("id, name, description, color")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .order("name");

    if (servicesError) {
      console.error("Error fetching services:", servicesError);
      return NextResponse.json(
        { error: "Failed to fetch available services" },
        { status: 500 }
      );
    }

    // Format the response
    const formattedAssignments = assignedServices.map((item) => {
      // Handle services as an array or single object
      const serviceData = Array.isArray(item.services)
        ? item.services[0]
        : item.services;

      return {
        id: item.id,
        serviceId: item.service_id,
        serviceName: serviceData?.name || "Unknown Service",
        serviceDescription: serviceData?.description || null,
        serviceColor: serviceData?.color || null,
        selfAssigned: item.self_assigned,
        assignedBy: item.assigned_by,
        assignedAt: item.assigned_at,
        active: item.active,
      };
    });

    return NextResponse.json({
      success: true,
      assignments: formattedAssignments,
      availableServices: allServices,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Assign a service to a team member
export async function POST(request: NextRequest) {
  try {
    const { teamMemberId, serviceId, workspaceId } = await request.json();

    if (!teamMemberId) {
      return NextResponse.json(
        { error: "Team member ID is required" },
        { status: 400 }
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

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

    // Verify the service belongs to the workspace
    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .eq("workspace_id", workspaceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: "Service not found in this workspace" },
        { status: 404 }
      );
    }

    // Verify the team member belongs to the workspace
    const { data: workspaceMember, error: memberError } = await supabaseAdmin
      .from("workspace_members")
      .select("team_member_id")
      .eq("team_member_id", teamMemberId)
      .eq("workspace_id", workspaceId)
      .single();

    if (memberError || !workspaceMember) {
      return NextResponse.json(
        { error: "Team member not found in this workspace" },
        { status: 404 }
      );
    }

    // Check if staff is trying to assign a service to someone else
    const isSelfAssignment = auth.user?.id === teamMemberId;
    if (auth.isStaff && !isSelfAssignment) {
      return NextResponse.json(
        { error: "Staff members can only assign services to themselves" },
        { status: 403 }
      );
    }

    // Check if the assignment already exists
    const { data: existingAssignment, error: checkError } = await supabaseAdmin
      .from("team_member_services")
      .select("id, active")
      .eq("team_member_id", teamMemberId)
      .eq("service_id", serviceId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing assignment:", checkError);
      return NextResponse.json(
        { error: "Failed to check existing assignment" },
        { status: 500 }
      );
    }

    let result;

    if (existingAssignment) {
      // If assignment exists but is inactive, reactivate it
      if (!existingAssignment.active) {
        const { data, error: updateError } = await supabaseAdmin
          .from("team_member_services")
          .update({
            active: true,
            self_assigned: isSelfAssignment,
            assigned_by: auth.user?.id,
            assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAssignment.id)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating assignment:", updateError);
          return NextResponse.json(
            { error: "Failed to update service assignment" },
            { status: 500 }
          );
        }

        result = data;
      } else {
        // Assignment already exists and is active
        return NextResponse.json({
          success: true,
          message: "Service is already assigned to this team member",
          assignment: existingAssignment,
        });
      }
    } else {
      // Create new assignment
      const { data, error: insertError } = await supabaseAdmin
        .from("team_member_services")
        .insert({
          team_member_id: teamMemberId,
          service_id: serviceId,
          self_assigned: isSelfAssignment,
          assigned_by: auth.user?.id,
          assigned_at: new Date().toISOString(),
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating assignment:", insertError);
        return NextResponse.json(
          { error: "Failed to create service assignment" },
          { status: 500 }
        );
      }

      result = data;
    }

    return NextResponse.json({
      success: true,
      message: "Service assigned successfully",
      assignment: result,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a service assignment
export async function DELETE(request: NextRequest) {
  try {
    // Get the assignment ID and team member ID from the query string
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");
    const teamMemberId = searchParams.get("teamMemberId");
    const workspaceId = searchParams.get("workspaceId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    if (!teamMemberId) {
      return NextResponse.json(
        { error: "Team member ID is required" },
        { status: 400 }
      );
    }

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

    // Get the assignment to check if it's self-assigned
    const { data: assignment, error: getError } = await supabaseAdmin
      .from("team_member_services")
      .select("self_assigned, service_id")
      .eq("id", assignmentId)
      .eq("team_member_id", teamMemberId)
      .single();

    if (getError) {
      console.error("Error fetching assignment:", getError);
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Verify the service belongs to the workspace
    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("workspace_id")
      .eq("id", assignment.service_id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if (service.workspace_id !== workspaceId) {
      return NextResponse.json(
        { error: "Service does not belong to this workspace" },
        { status: 403 }
      );
    }

    // Staff can only remove their own self-assigned services
    const isSelfRemoval = auth.user?.id === teamMemberId;
    if (auth.isStaff && (!isSelfRemoval || !assignment.self_assigned)) {
      return NextResponse.json(
        {
          error:
            "Staff members can only remove their own self-assigned services",
        },
        { status: 403 }
      );
    }

    // Soft delete by setting active to false
    const { error: updateError } = await supabaseAdmin
      .from("team_member_services")
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .eq("team_member_id", teamMemberId);

    if (updateError) {
      console.error("Error removing assignment:", updateError);
      return NextResponse.json(
        { error: "Failed to remove service assignment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Service assignment removed successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

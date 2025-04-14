import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/auth-utils";
import { getAuthAndValidateWorkspaceAction } from "@/lib/server/workspace-actions";

// Create or update a team member
export async function POST(request: NextRequest) {
  try {
    const { teamMemberId, name, email, role, active, workspaceId } =
      await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    // Get authorization and validate workspace access (owner required for managing team members)
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

    let teamMemberToUpdate = teamMemberId;

    // If no teamMemberId, we're creating a new member
    if (!teamMemberToUpdate) {
      // Check if a team member with this email already exists
      if (email) {
        const { data: existingUser, error: existingUserError } =
          await supabaseAdmin
            .from("team_members")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (existingUserError) {
          console.error("Error checking existing user:", existingUserError);
          return NextResponse.json(
            { error: "Failed to check existing user" },
            { status: 500 }
          );
        }

        if (existingUser) {
          teamMemberToUpdate = existingUser.id;
        }
      }

      if (!teamMemberToUpdate) {
        // Create a new team member
        const { data: newTeamMember, error: createError } = await supabaseAdmin
          .from("team_members")
          .insert({
            display_name: name,
            email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (createError) {
          console.error("Error creating team member:", createError);
          return NextResponse.json(
            { error: "Failed to create team member" },
            { status: 500 }
          );
        }

        teamMemberToUpdate = newTeamMember.id;
      }
    } else {
      // Update existing team member info
      const { error: updateError } = await supabaseAdmin
        .from("team_members")
        .update({
          display_name: name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamMemberToUpdate);

      if (updateError) {
        console.error("Error updating team member:", updateError);
        return NextResponse.json(
          { error: "Failed to update team member" },
          { status: 500 }
        );
      }
    }

    // Check if this member is already associated with the workspace
    const { data: existingWorkspaceMember, error: existingError } =
      await supabaseAdmin
        .from("workspace_members")
        .select("team_member_id")
        .eq("workspace_id", workspaceId)
        .eq("team_member_id", teamMemberToUpdate)
        .maybeSingle();

    // If creating a new workspace member, check seat limitations
    if (!existingWorkspaceMember && !teamMemberId) {
      // Get current active workspace members count
      const { count: currentMembersCount, error: countError } =
        await supabaseAdmin
          .from("workspace_members")
          .select("id", { count: "exact" })
          .eq("workspace_id", workspaceId)
          .eq("active", true);

      if (countError) {
        console.error("Error counting workspace members:", countError);
        return NextResponse.json(
          { error: "Failed to check workspace members count" },
          { status: 500 }
        );
      }

      // Get subscription plan details
      const { data: subscriptionData, error: subscriptionError } =
        await supabaseAdmin
          .from("subscriptions")
          .select("*, subscription_plans(*)")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (subscriptionError) {
        console.error("Error fetching subscription:", subscriptionError);
        return NextResponse.json(
          { error: "Failed to check subscription limits" },
          { status: 500 }
        );
      }

      if (subscriptionData) {
        const plan = subscriptionData.subscription_plans;
        const totalSeats =
          (plan?.included_seats || 0) +
          (subscriptionData.additional_seats || 0);

        // Check if adding a new member would exceed the seat limit
        // This applies to both active and trial subscriptions
        if (currentMembersCount && currentMembersCount >= totalSeats) {
          // Get subscription status for better error messaging
          const isTrialing = subscriptionData.status === "trialing";

          return NextResponse.json(
            {
              error: isTrialing
                ? "Seat limit reached. Your trial plan has a limit of " +
                  totalSeats +
                  " seats."
                : "Seat limit reached",
              seatLimitReached: true,
              currentSeats: currentMembersCount,
              totalSeats: totalSeats,
              isTrialing: isTrialing,
            },
            { status: 403 }
          );
        }
      }
    }

    if (existingError) {
      console.error("Error checking workspace membership:", existingError);
      return NextResponse.json(
        { error: "Failed to check workspace membership" },
        { status: 500 }
      );
    }

    if (existingWorkspaceMember) {
      // Update existing workspace member
      const { error: updateError } = await supabaseAdmin
        .from("workspace_members")
        .update({
          role,
          active,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId)
        .eq("team_member_id", teamMemberToUpdate);

      if (updateError) {
        console.error("Error updating workspace member:", updateError);
        return NextResponse.json(
          { error: "Failed to update workspace member" },
          { status: 500 }
        );
      }
    } else {
      // Add to workspace_members
      const { error: memberError } = await supabaseAdmin
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          team_member_id: teamMemberToUpdate,
          role,
          active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (memberError) {
        console.error("Error adding workspace member:", memberError);
        return NextResponse.json(
          { error: "Failed to add team member to workspace" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Team member updated successfully",
      teamMemberId: teamMemberToUpdate,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete a team member
export async function DELETE(request: NextRequest) {
  try {
    // Get the workspace ID and team member ID from the query string
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const teamMemberId = searchParams.get("teamMemberId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    if (!teamMemberId) {
      return NextResponse.json(
        { error: "Team member ID is required" },
        { status: 400 }
      );
    }

    // Get authorization and validate workspace access (owner required for managing team members)
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

    // Can't delete yourself
    if (auth.user?.id === teamMemberId) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the workspace" },
        { status: 400 }
      );
    }

    // Remove the team member from the workspace
    const { error: deleteError } = await supabaseAdmin
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("team_member_id", teamMemberId);

    if (deleteError) {
      console.error("Error deleting team member:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete team member" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Team member removed from workspace successfully",
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

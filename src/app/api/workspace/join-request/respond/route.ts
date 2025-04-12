import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key (not the anon key)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function POST(request: NextRequest) {
  try {
    const { requestId, response, responderId } = await request.json();

    if (!requestId || !response || !responderId) {
      return NextResponse.json({ 
        error: "Request ID, response, and responder ID are required" 
      }, { status: 400 });
    }

    if (response !== "approved" && response !== "rejected") {
      return NextResponse.json({ 
        error: "Response must be 'approved' or 'rejected'" 
      }, { status: 400 });
    }

    // Get the join request
    const { data: joinRequest, error: requestError } = await supabaseAdmin
      .from("workspace_join_requests")
      .select("id, workspace_id, team_member_id, status")
      .eq("id", requestId)
      .single();

    if (requestError || !joinRequest) {
      console.error("Error finding join request:", requestError);
      return NextResponse.json(
        { error: "Join request not found" },
        { status: 404 }
      );
    }

    // Check if the request is already processed
    if (joinRequest.status !== "pending") {
      return NextResponse.json({
        success: false,
        message: `This request has already been ${joinRequest.status}`
      });
    }

    // Check if the responder is an owner of the workspace
    const { data: responderRole, error: roleError } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", joinRequest.workspace_id)
      .eq("team_member_id", responderId)
      .single();

    if (roleError || !responderRole || responderRole.role !== "owner") {
      console.error("Error checking responder role:", roleError);
      return NextResponse.json(
        { error: "Only workspace owners can respond to join requests" },
        { status: 403 }
      );
    }

    // Update the join request status
    const { error: updateError } = await supabaseAdmin
      .from("workspace_join_requests")
      .update({
        status: response,
        responded_by: responderId,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Error updating join request:", updateError);
      return NextResponse.json(
        { error: "Failed to update join request" },
        { status: 500 }
      );
    }

    // If approved, add the user to the workspace
    if (response === "approved") {
      const { error: memberError } = await supabaseAdmin
        .from("workspace_members")
        .insert({
          workspace_id: joinRequest.workspace_id,
          team_member_id: joinRequest.team_member_id,
          role: "staff", // Default role for new members
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (memberError) {
        console.error("Error adding workspace member:", memberError);
        // Revert the join request status
        await supabaseAdmin
          .from("workspace_join_requests")
          .update({
            status: "pending",
            responded_by: null,
            responded_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);
          
        return NextResponse.json(
          { error: "Failed to add user to workspace" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Join request ${response}`,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

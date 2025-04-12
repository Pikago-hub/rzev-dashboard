"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { WorkspaceProfile } from "@/types/workspace";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

type WorkspaceData = {
  workspaceProfile: WorkspaceProfile | null;
  userRole: string | null;
  isActive: boolean;
  error?: string;
};

/**
 * Server-side function to get the workspace profile only
 * This should be used in Server Components that don't need role information
 */
export async function getServerWorkspaceProfile(): Promise<{
  workspaceProfile: WorkspaceProfile | null;
  error: string | null;
}> {
  try {
    // Get the session cookie directly from the request - async version
    const cookieStore = await cookies();
    const supabaseAuthCookie = cookieStore.get("supabase-auth");

    if (!supabaseAuthCookie?.value) {
      return {
        workspaceProfile: null,
        error: "Authentication required",
      };
    }

    // Use the auth cookie to get the user's session
    const {
      data: { user },
      error: sessionError,
    } = await supabaseAdmin.auth.getUser(supabaseAuthCookie.value);

    if (sessionError || !user) {
      console.error("Session error:", sessionError);
      return {
        workspaceProfile: null,
        error: "Authentication required",
      };
    }

    // Get the user's workspace member record using admin client (bypasses RLS)
    const { data: workspaceMember, error: workspaceMemberError } =
      await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("team_member_id", user.id)
        .single();

    if (workspaceMemberError) {
      console.error("Error finding workspace member:", workspaceMemberError);
      return {
        workspaceProfile: null,
        error: "No workspace associated with this user",
      };
    }

    // Get the workspace details using admin client (bypasses RLS)
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("*")
      .eq("id", workspaceMember.workspace_id)
      .single();

    if (workspaceError) {
      console.error("Error fetching workspace:", workspaceError);
      return {
        workspaceProfile: null,
        error: "Workspace not found",
      };
    }

    return {
      workspaceProfile: workspace as WorkspaceProfile,
      error: null,
    };
  } catch (error) {
    console.error("Server error:", error);
    return {
      workspaceProfile: null,
      error: "Internal server error",
    };
  }
}

/**
 * Server-side function to get the workspace data with role information
 * This should be used in Server Components that need role information
 */
export async function getServerWorkspace(): Promise<WorkspaceData> {
  try {
    // Get auth cookie from the request
    const cookieStore = await cookies();
    const supabaseCookie = cookieStore.get(
      "sb-dzqaafvpxtrplgkuxtjo-auth-token"
    );

    if (!supabaseCookie?.value) {
      return {
        workspaceProfile: null,
        userRole: null,
        isActive: false,
        error: "Not authenticated",
      };
    }

    // Parse the cookie to get the access token
    let token: string;
    try {
      // The cookie value is a JSON string
      const parsedCookie = JSON.parse(supabaseCookie.value);
      token = parsedCookie.access_token;
    } catch (error: unknown) {
      console.error("Error parsing authentication cookie:", error);
      return {
        workspaceProfile: null,
        userRole: null,
        isActive: false,
        error: "Invalid authentication cookie",
      };
    }

    // Get the user from the token
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return {
        workspaceProfile: null,
        userRole: null,
        isActive: false,
        error: "Authentication failed",
      };
    }

    // Get user's workspace membership with role
    const { data: workspaceMember, error: memberError } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id, role, active")
      .eq("team_member_id", user.id)
      .single();

    if (memberError) {
      return {
        workspaceProfile: null,
        userRole: null,
        isActive: false,
        error: "No workspace associated with user",
      };
    }

    // Get workspace details
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("*")
      .eq("id", workspaceMember.workspace_id)
      .single();

    if (workspaceError) {
      return {
        workspaceProfile: null,
        userRole: workspaceMember.role,
        isActive: !!workspaceMember.active,
        error: "Workspace not found",
      };
    }

    return {
      workspaceProfile: workspace as WorkspaceProfile,
      userRole: workspaceMember.role,
      isActive: !!workspaceMember.active,
    };
  } catch (error: unknown) {
    console.error("Server error fetching workspace:", error);
    return {
      workspaceProfile: null,
      userRole: null,
      isActive: false,
      error: "Server error",
    };
  }
}

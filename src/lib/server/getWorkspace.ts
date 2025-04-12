'use server';

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { WorkspaceProfile } from "@/types/workspace";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

type WorkspaceData = {
  workspaceProfile: WorkspaceProfile | null;
  userRole: string | null;
  isActive: boolean;
  error?: string;
};

export async function getServerWorkspace(): Promise<WorkspaceData> {
  try {
    // Get auth cookie from the request
    const cookieStore = await cookies();
    const supabaseCookie = cookieStore.get('sb-dzqaafvpxtrplgkuxtjo-auth-token');
    
    if (!supabaseCookie?.value) {
      return {
        workspaceProfile: null,
        userRole: null,
        isActive: false,
        error: "Not authenticated"
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
        error: "Invalid authentication cookie"
      };
    }

    // Initialize admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

    // Get the user from the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return {
        workspaceProfile: null,
        userRole: null,
        isActive: false,
        error: "Authentication failed"
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
        error: "No workspace associated with user"
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
        error: "Workspace not found"
      };
    }

    return {
      workspaceProfile: workspace as WorkspaceProfile,
      userRole: workspaceMember.role,
      isActive: !!workspaceMember.active
    };
  } catch (error: unknown) {
    console.error("Server error fetching workspace:", error);
    return {
      workspaceProfile: null,
      userRole: null,
      isActive: false,
      error: "Server error"
    };
  }
} 
'use server';

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { WorkspaceProfile } from '@/types/workspace';

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

/**
 * Server-side function to get the workspace profile
 * This should be used in Server Components
 */
export async function getServerWorkspaceProfile(): Promise<{
  workspaceProfile: WorkspaceProfile | null;
  error: string | null;
}> {
  try {
    // Get the session cookie directly from the request - async version
    const cookieStore = await cookies();
    const supabaseAuthCookie = cookieStore.get('supabase-auth');
    
    if (!supabaseAuthCookie?.value) {
      return {
        workspaceProfile: null,
        error: "Authentication required"
      };
    }

    // Use the auth cookie to get the user's session
    const { data: { user }, error: sessionError } = await supabaseAdmin.auth.getUser(supabaseAuthCookie.value);

    if (sessionError || !user) {
      console.error("Session error:", sessionError);
      return {
        workspaceProfile: null,
        error: "Authentication required"
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
        error: "No workspace associated with this user"
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
        error: "Workspace not found"
      };
    }

    return {
      workspaceProfile: workspace as WorkspaceProfile,
      error: null
    };
  } catch (error) {
    console.error("Server error:", error);
    return {
      workspaceProfile: null,
      error: "Internal server error"
    };
  }
} 
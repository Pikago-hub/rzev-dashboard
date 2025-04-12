import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Initialize the admin client with service role key
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Types for auth responses
export type AuthUser = {
  id: string;
  email: string | null | undefined;
};

export type AuthResponse = {
  user: AuthUser | null;
  error: string | null;
  status?: number;
};

export type WorkspaceAccessResponse = {
  error: string | null;
  status: number;
  role?: string;
  isStaff?: boolean;
  isOwner?: boolean;
  workspaceId?: string;
};

export type ServiceAccessResponse = {
  error: string | null;
  status: number;
  role?: string;
  isStaff?: boolean;
  isOwner?: boolean;
  workspaceId?: string;
};

/**
 * Get authenticated user from request
 * Tries both Authorization header and cookies
 */
export async function getAuthUser(request: NextRequest): Promise<AuthResponse> {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    // Use token to get user
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (!userError && user) {
      return {
        user: {
          id: user.id,
          email: user.email || null,
        },
        error: null,
      };
    }
  }

  // Try cookie-based auth as fallback
  const cookieStore = await cookies();
  const supabaseAuthCookie = cookieStore.get("supabase-auth");

  if (!supabaseAuthCookie?.value) {
    return { user: null, error: "Authentication required" };
  }

  // Use the cookie value to get the user
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(supabaseAuthCookie.value);

  if (userError || !user) {
    return { user: null, error: "Invalid authentication" };
  }

  return {
    user: {
      id: user.id,
      email: user.email || null,
    },
    error: null,
  };
}

/**
 * Validate user has access to a workspace
 * Optionally checks for specific role requirements
 */
export async function validateWorkspaceAccess(
  userId: string,
  workspaceId: string,
  requiredRole?: "staff" | "owner"
): Promise<WorkspaceAccessResponse> {
  if (!userId) {
    return { error: "Authentication required", status: 401 };
  }

  // Check if user is a member of the workspace
  const { data: workspaceMember, error: memberError } = await supabaseAdmin
    .from("workspace_members")
    .select("role, active")
    .eq("workspace_id", workspaceId)
    .eq("team_member_id", userId)
    .single();

  if (memberError || !workspaceMember) {
    return { error: "You don't have access to this workspace", status: 403 };
  }

  // Check if the member is active
  if (!workspaceMember.active) {
    return {
      error: "Your account is inactive for this workspace",
      status: 403,
    };
  }

  const role = workspaceMember.role;
  const isStaff = role === "staff";
  const isOwner = role === "owner";

  // If a specific role is required, check for it
  if (requiredRole) {
    let hasAccess = false;

    if (requiredRole === "staff") {
      // Any role can access staff-level resources
      hasAccess = true;
    } else if (requiredRole === "owner") {
      // Only owner can access owner-level resources
      hasAccess = isOwner;
    }

    if (!hasAccess) {
      return {
        error: `You need ${requiredRole} permissions to access this resource`,
        status: 403,
      };
    }
  }

  return {
    error: null,
    status: 200,
    role,
    isStaff,
    isOwner,
    workspaceId,
  };
}

/**
 * Validate user has access to a service
 * First gets the workspace for the service, then checks workspace access
 */
export async function validateServiceAccess(
  userId: string,
  serviceId: string,
  requiredRole?: "staff" | "owner"
): Promise<ServiceAccessResponse> {
  if (!userId) {
    return { error: "Authentication required", status: 401 };
  }

  // Get the service to find its workspace
  const { data: service, error: serviceError } = await supabaseAdmin
    .from("services")
    .select("workspace_id")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    return { error: "Service not found", status: 404 };
  }

  // Use the workspace validation function
  return validateWorkspaceAccess(userId, service.workspace_id, requiredRole);
}

// Note: The convenience functions for combining auth and validation have been moved to workspace-actions.ts
// as server actions with the 'use server' directive

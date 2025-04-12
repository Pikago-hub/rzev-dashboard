"use server";

import { NextRequest } from "next/server";
import {
  getAuthUser,
  validateWorkspaceAccess,
  validateServiceAccess,
  AuthResponse,
  WorkspaceAccessResponse,
  ServiceAccessResponse,
} from "./auth-utils";

/**
 * Server action to get auth user and validate workspace access in one call
 */
export async function getAuthAndValidateWorkspaceAction(
  request: NextRequest,
  workspaceId: string,
  requiredRole?: "staff" | "owner"
): Promise<AuthResponse & WorkspaceAccessResponse> {
  const authResult = await getAuthUser(request);

  if (authResult.error || !authResult.user) {
    return {
      ...authResult,
      error: authResult.error || "Authentication required",
      status: 401,
    };
  }

  const accessResult = await validateWorkspaceAccess(
    authResult.user.id,
    workspaceId,
    requiredRole
  );

  return {
    ...authResult,
    ...accessResult,
  };
}

/**
 * Server action to get auth user and validate service access in one call
 */
export async function getAuthAndValidateServiceAction(
  request: NextRequest,
  serviceId: string,
  requiredRole?: "staff" | "owner"
): Promise<AuthResponse & ServiceAccessResponse> {
  const authResult = await getAuthUser(request);

  if (authResult.error || !authResult.user) {
    return {
      ...authResult,
      error: authResult.error || "Authentication required",
      status: 401,
    };
  }

  const accessResult = await validateServiceAccess(
    authResult.user.id,
    serviceId,
    requiredRole
  );

  return {
    ...authResult,
    ...accessResult,
  };
}

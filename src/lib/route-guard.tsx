"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";

type RouteGuardProps = {
  children: React.ReactNode;
  requiredRole?: "staff" | "owner" | null;
  redirectPath?: string;
};

export default function RouteGuard({
  children,
  requiredRole = null,
  redirectPath = "/dashboard",
}: RouteGuardProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { userRole, isLoading: isWorkspaceLoading } = useWorkspace();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push({
        pathname: "/auth",
      });
      return;
    }

    // If we're checking roles, and we have the workspace data
    if (requiredRole && !isWorkspaceLoading && userRole) {
      let hasAccess = false;

      // Check if user has the required role
      if (requiredRole === "staff") {
        hasAccess = userRole === "staff";
      } else if (requiredRole === "owner") {
        hasAccess = userRole === "owner";
      }

      // If user doesn't have the required role, redirect
      if (!hasAccess) {
        // Determine where to redirect based on user's actual role
        if (userRole === "staff") {
          router.push({
            pathname: "/dashboard/staff",
          });
        } else if (userRole === "owner") {
          router.push({
            pathname: "/dashboard/admin",
          });
        } else {
          router.push({
            pathname: "/dashboard",
          });
        }
      }
    }
  }, [
    user,
    isLoading,
    router,
    userRole,
    isWorkspaceLoading,
    requiredRole,
    redirectPath,
  ]);

  // Return children directly, the redirection happens in the effect
  return <>{children}</>;
}

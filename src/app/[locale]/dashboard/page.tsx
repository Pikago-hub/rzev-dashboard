"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { Loader2 } from "lucide-react";

export default function DashboardRouter() {
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

    // Only redirect after both auth and workspace data have loaded
    if (!isLoading && !isWorkspaceLoading && userRole) {
      if (userRole === "staff") {
        router.push({
          pathname: "/dashboard/staff",
        });
      } else if (userRole === "owner") {
        router.push({
          pathname: "/dashboard/admin",
        });
      }
    }
  }, [user, isLoading, router, userRole, isWorkspaceLoading]);

  // Show loading state with a centered loader
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

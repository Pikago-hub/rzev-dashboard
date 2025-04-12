"use client";

import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/workspace-context";

export function UserRoleBadge() {
  const { userRole, isLoading } = useWorkspace();
  
  if (isLoading || !userRole) return null;

  return (
    <Badge 
      variant={userRole === 'owner' ? "default" : "secondary"} 
      className="ml-2 capitalize"
    >
      {userRole}
    </Badge>
  );
} 
"use client";

import { useWorkspace } from "@/lib/workspace-context";

export function useWorkspaceProfile() {
  const { workspaceProfile, isLoading, error, refreshWorkspace } = useWorkspace();
  
  return { 
    workspaceProfile, 
    isLoading, 
    error, 
    refreshProfile: refreshWorkspace 
  };
}

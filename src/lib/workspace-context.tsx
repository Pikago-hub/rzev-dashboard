"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import { WorkspaceProfile } from "@/types/workspace";
import { useAuth } from "./auth-context";
import { createBrowserClient } from "@/lib/supabase";

// Context type
type WorkspaceContextType = {
  workspaceProfile: WorkspaceProfile | null;
  userRole: string | null;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  refreshWorkspace: () => Promise<void>;
  debug: () => void; // Debug utility function
};

// Create context with default values
const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceProfile: null,
  userRole: null,
  isActive: false,
  isLoading: true,
  error: null,
  refreshWorkspace: async () => {},
  debug: () => {}, // Default no-op debug function
});

// Hook to use workspace context
export const useWorkspace = () => useContext(WorkspaceContext);

type WorkspaceProviderProps = {
  children: ReactNode;
  initialWorkspaceData?: WorkspaceProfile | null;
  initialUserRole?: string | null;
  initialIsActive?: boolean;
};

// Create a provider component
export function WorkspaceProvider({
  children,
  initialWorkspaceData = null,
  initialUserRole = null,
  initialIsActive = false,
}: WorkspaceProviderProps) {
  const [workspaceProfile, setWorkspaceProfile] =
    useState<WorkspaceProfile | null>(initialWorkspaceData);
  const [userRole, setUserRole] = useState<string | null>(initialUserRole);
  const [isActive, setIsActive] = useState<boolean>(initialIsActive);
  const [isLoading, setIsLoading] = useState(!initialWorkspaceData);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(
    initialWorkspaceData ? Date.now() : null
  );
  // Use a ref to prevent duplicate fetches during navigation
  const isFetchingRef = useRef(false);
  // Track if we've already done the initial fetch
  const didInitialFetchRef = useRef(false);

  // Debug function to log workspace data to console
  const debug = useCallback(() => {
    console.group("Workspace Context Debug Info");
    console.log("User Role:", userRole);
    console.log("Is Active:", isActive);
    console.log("Workspace Profile:", workspaceProfile);
    console.log("Loading State:", isLoading);
    console.log("Error:", error);
    console.groupEnd();
  }, [workspaceProfile, userRole, isActive, isLoading, error]);

  // Make debug function available in window for easy access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (
        window as Window & { __rzevDebug?: { workspace: () => void } }
      ).__rzevDebug = {
        workspace: debug,
      };
      console.log(
        "Workspace debug available at window.__rzevDebug.workspace()"
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        delete (window as Window & { __rzevDebug?: { workspace: () => void } })
          .__rzevDebug;
      }
    };
  }, [debug]);

  // Function to fetch workspace data from API
  const fetchWorkspaceData = useCallback(async () => {
    // Debug log to track when this function is called
    console.log("[WorkspaceProvider] fetchWorkspaceData called");

    if (!user) {
      setIsLoading(false);
      return;
    }

    // Skip if already fetching
    if (isFetchingRef.current) {
      console.log("[WorkspaceProvider] Skipping fetch - already in progress");
      return;
    }

    // Prevent duplicate fetches within a short time window
    if (lastFetchTime && Date.now() - lastFetchTime < 5000) {
      console.log("[WorkspaceProvider] Skipping fetch - throttled");
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      // Get the user's session token for auth
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Add Authorization header with the token
      const response = await fetch("/api/workspace/get-server-workspace", {
        headers: {
          Authorization: session ? `Bearer ${session.access_token}` : "",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch workspace profile");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch workspace profile");
      }

      setWorkspaceProfile(data.workspaceProfile);
      setUserRole(data.userRole);
      setIsActive(data.isActive ?? false);
      setLastFetchTime(Date.now());
    } catch (err) {
      console.error("Error fetching workspace profile:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, lastFetchTime]);

  // Fetch workspace on mount if not provided initially
  useEffect(() => {
    // Skip if we've already done the initial fetch
    if (didInitialFetchRef.current) {
      return;
    }

    if (!initialWorkspaceData && user) {
      didInitialFetchRef.current = true;
      fetchWorkspaceData();
    }
  }, [user, initialWorkspaceData, fetchWorkspaceData]);

  // Refresh function - allow explicit refresh
  const refreshWorkspace = useCallback(async () => {
    // Reset the flag to allow fetching again
    didInitialFetchRef.current = false;
    await fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceProfile,
        userRole,
        isActive,
        isLoading,
        error,
        refreshWorkspace,
        debug,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

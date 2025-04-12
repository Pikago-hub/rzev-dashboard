"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

// Updated to match the structure in workspace.address
export type WorkspaceLocation = {
  id: string; // Using workspace.id
  name: string; // Using workspace name or "Main Location"
  address_line1: string; // From address.street
  address_line2: string | null;
  city: string; // From address.city
  state: string; // From address.state
  postal_code: string; // From address.postalCode
  country: string; // From address.country
  timezone: string | null;
  operating_hours: {
    monday?: { open: string; close: string } | null;
    tuesday?: { open: string; close: string } | null;
    wednesday?: { open: string; close: string } | null;
    thursday?: { open: string; close: string } | null;
    friday?: { open: string; close: string } | null;
    saturday?: { open: string; close: string } | null;
    sunday?: { open: string; close: string } | null;
  } | null;
  lat: number | null; // From workspace.lat
  lng: number | null; // From workspace.lng
};

export function useWorkspaceLocations() {
  const [workspaceLocations, setWorkspaceLocations] = useState<
    WorkspaceLocation[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchWorkspaceLocations = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // First get the user's workspace
        const { data: workspaceMember, error: workspaceMemberError } =
          await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("team_member_id", user.id)
            .single<{ workspace_id: string }>();

        if (workspaceMemberError) {
          throw workspaceMemberError;
        }

        // Get the workspace details
        const { data, error } = await supabase
          .from("workspaces")
          .select("id, name, address, lat, lng, timezone")
          .eq("id", workspaceMember.workspace_id)
          .single<{
            id: string;
            name: string;
            address: string | Record<string, unknown>;
            lat: number | null;
            lng: number | null;
            timezone: string | null;
          }>();

        if (error) {
          throw error;
        }

        // Transform the data to match the expected WorkspaceLocation format
        if (data && data.address) {
          // Parse address if it's a string
          const addressData =
            typeof data.address === "string"
              ? JSON.parse(data.address)
              : data.address;

          // Create a location object from the workspace data
          const location: WorkspaceLocation = {
            id: String(data.id),
            name: data.name ? String(data.name) : "Main Location",
            address_line1: addressData.street || "",
            address_line2: null,
            city: addressData.city || "",
            state: addressData.state || "",
            postal_code: addressData.postalCode || "",
            country: addressData.country || "US",
            timezone: data.timezone,
            operating_hours: null,
            lat: data.lat ? Number(data.lat) : null,
            lng: data.lng ? Number(data.lng) : null,
          };

          setWorkspaceLocations([location]);
        } else {
          // No address data found
          setWorkspaceLocations([]);
        }
      } catch (err) {
        console.error("Error fetching location from workspace:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspaceLocations();
  }, [user, supabase]);

  return { workspaceLocations, isLoading, error };
}

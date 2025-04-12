import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

export interface TeamMemberProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

export function useTeamMemberProfile() {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<TeamMemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!session || !user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/team-member/profile/get", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch profile");
      }

      const { profile: data } = await response.json();
      setProfile(data);
    } catch (err) {
      console.error("Error fetching team member profile:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [session, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refreshProfile: fetchProfile,
  };
}

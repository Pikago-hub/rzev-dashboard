import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { TeamMember } from "@/types/calendar";

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface TeamMemberData {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  active: boolean;
  availabilities?: Availability[];
}

export function useTeamMembersWithAvailability() {
  const { session } = useAuth();
  const { workspaceProfile } = useWorkspace();
  const [teamMembers, setTeamMembers] = useState<TeamMemberData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch availabilities for a team member
  const fetchAvailabilities = useCallback(
    async (teamMemberId: string): Promise<Availability[]> => {
      if (!session?.access_token) {
        return [];
      }

      try {
        const response = await fetch(
          `/api/team/member/availability?teamMemberId=${teamMemberId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch availabilities");
        }

        if (result.availabilities) {
          return result.availabilities.map(
            (item: {
              id: string;
              day_of_week: number;
              start_time: string;
              end_time: string;
            }) => ({
              id: item.id as string,
              day_of_week: item.day_of_week as number,
              start_time: item.start_time as string,
              end_time: item.end_time as string,
            })
          );
        }

        return [];
      } catch (error) {
        console.error("Error fetching availabilities:", error);
        return [];
      }
    },
    [session?.access_token]
  );

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    if (!session?.access_token || !workspaceProfile?.id) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/team?workspaceId=${workspaceProfile.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch team members");
      }

      const { teamMembers: data } = await response.json();

      if (data && data.length > 0) {
        setTeamMembers(data);

        // Fetch availabilities for each team member
        const membersWithAvailabilities = await Promise.all(
          data.map(async (member: TeamMemberData) => {
            const availabilities = await fetchAvailabilities(member.id);
            return {
              ...member,
              availabilities,
            };
          })
        );

        setTeamMembers(membersWithAvailabilities);
      } else {
        setTeamMembers([]);
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch team members")
      );
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, workspaceProfile?.id, fetchAvailabilities]);

  // Transform team members data to match the format needed by the calendar
  const transformToCalendarFormat = useCallback((): TeamMember[] => {
    return teamMembers.map((member) => {
      // Get today's day of week (0-6, where 0 is Sunday)
      const today = new Date().getDay();

      // Find availability for today
      const todayAvailability = member.availabilities?.find(
        (avail) => avail.day_of_week === today
      );

      // Set working hours based on today's availability
      // If no availability is found, set empty working hours
      const workingHours = todayAvailability
        ? {
            start: todayAvailability.start_time,
            end: todayAvailability.end_time,
          }
        : {
            start: "00:00",
            end: "00:00", // This effectively means not working
          };

      return {
        id: member.id,
        name: member.display_name || "Team Member",
        role: member.role,
        workingHours,
        // Store all availabilities for reference
        availabilities: member.availabilities || [],
      };
    });
  }, [teamMembers]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  return {
    teamMembers: transformToCalendarFormat(),
    rawTeamMembers: teamMembers,
    isLoading,
    error,
    refresh: fetchTeamMembers,
  };
}

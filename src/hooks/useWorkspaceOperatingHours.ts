import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { OperatingHours } from "@/types/workspace";
import { TeamMember } from "@/types/calendar";

// Day of week mapping (0 = Sunday, 1 = Monday, etc.)
const DAY_OF_WEEK_MAP: Record<number, keyof OperatingHours> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export function useWorkspaceOperatingHours() {
  const { session } = useAuth();
  const { workspaceProfile } = useWorkspace();
  const [teamMembers, setTeamMembers] = useState<
    { id: string; display_name: string; role: string; email?: string | null }[]
  >([]);
  const [operatingHours, setOperatingHours] = useState<OperatingHours | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch team members and operating hours
  const fetchTeamMembers = useCallback(async () => {
    if (!session?.access_token || !workspaceProfile?.id) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get team members
      const teamResponse = await fetch(
        `/api/team?workspaceId=${workspaceProfile.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!teamResponse.ok) {
        const errorData = await teamResponse.json();
        throw new Error(errorData.error || "Failed to fetch team members");
      }

      const { teamMembers: data } = await teamResponse.json();

      if (data && data.length > 0) {
        setTeamMembers(data);
      } else {
        setTeamMembers([]);
      }

      // Get operating hours from workspace profile
      if (workspaceProfile?.operating_hours) {
        setOperatingHours(workspaceProfile.operating_hours);
      } else {
        // If operating hours are not in the workspace profile, fetch them from the API
        const hoursResponse = await fetch(
          `/api/workspace/operating-hours/get?userId=${session.user.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (hoursResponse.ok) {
          const { operatingHours: hoursData } = await hoursResponse.json();
          if (hoursData) {
            setOperatingHours(hoursData);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching team members or operating hours:", err);
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch team members or operating hours")
      );
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, session?.user?.id, workspaceProfile]);

  // Transform team members data to match the format needed by the calendar
  // but use workspace operating hours instead of individual availabilities
  const transformToCalendarFormat = useCallback((): TeamMember[] => {
    return teamMembers.map((member) => {
      // Get today's day of week (0-6, where 0 is Sunday)
      const today = new Date().getDay();
      const dayKey = DAY_OF_WEEK_MAP[today];

      // Find operating hours for today
      const todayOperatingHours = operatingHours?.[dayKey];

      // Set working hours based on today's operating hours
      // If no operating hours are found, set empty working hours
      // If multiple operating hours slots exist for the day, use the first one
      // Note: We're using the first slot for the workingHours property, but all slots
      // are available in the operatingHours property for more detailed checks
      const workingHours =
        todayOperatingHours && todayOperatingHours.length > 0
          ? {
              start: todayOperatingHours[0].open,
              end: todayOperatingHours[0].close,
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
        // Store operating hours for reference
        operatingHours: operatingHours as Record<
          string,
          { open: string; close: string }[]
        >,
      };
    });
  }, [teamMembers, operatingHours]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  return {
    teamMembers: transformToCalendarFormat(),
    rawTeamMembers: teamMembers,
    operatingHours,
    isLoading,
    error,
    refresh: fetchTeamMembers,
  };
}

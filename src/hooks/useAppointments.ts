import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useWorkspaceAppointments } from "@/hooks/use-realtime-appointments";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Appointment } from "@/types/calendar";

// Define the structure for raw appointment data from the API/Supabase
// Includes fields seen in fetch response and real-time payloads
interface ApiAppointment {
  id: string;
  workspace_id: string; // Present in real-time payload
  team_member_id: string;
  service_id: string; // Present in real-time payload
  service_variant_id?: string | null;
  customer_id?: string | null;
  status: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  duration: number;
  customer_name?: string | null;
  price?: number | null;
  payment_status?: string | null;
  notes?: string | null;
  customer_notes?: string | null;
  internal_notes?: string | null;
  metadata?: { team_member_preference?: string; [key: string]: unknown } | null;
  // Joined data (optional and potentially null)
  services?: { name?: string; color?: string } | null;
  service_variants?: { name?: string } | null;
  team_member?: { display_name?: string } | null;
}

interface UseAppointmentsOptions {
  date?: Date;
  view?: "day" | "week";
  teamMemberId?: string;
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const { session } = useAuth();
  const { workspaceProfile } = useWorkspace();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get the workspace ID
  const workspaceId = workspaceProfile?.id;

  // Calculate date range based on view
  const getDateRange = useCallback(() => {
    const currentDate = options.date || new Date();

    if (options.view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // End on Sunday
      return {
        startDate: format(weekStart, "yyyy-MM-dd"),
        endDate: format(weekEnd, "yyyy-MM-dd"),
      };
    } else {
      // Default to day view
      return {
        startDate: format(currentDate, "yyyy-MM-dd"),
        endDate: format(currentDate, "yyyy-MM-dd"),
      };
    }
  }, [options.date, options.view]);

  // Fetch appointments from the API
  const fetchAppointments = useCallback(async () => {
    if (!session?.access_token || !workspaceId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange();

      // Build the URL with query parameters
      let url = `/api/appointments?workspaceId=${workspaceId}&startDate=${startDate}&endDate=${endDate}`;

      // Add team member filter if provided
      if (options.teamMemberId && options.teamMemberId !== "all") {
        url += `&teamMemberId=${options.teamMemberId}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch appointments");
      }

      const data = await response.json();

      // Transform appointments to match the calendar format
      const transformedAppointments = transformAppointments(data.appointments);
      setAppointments(transformedAppointments);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch appointments")
      );
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, workspaceId, getDateRange, options.teamMemberId]);

  // Transform appointments from API format to calendar format
  const transformAppointments = (apiAppointments: ApiAppointment[]): Appointment[] => {
    // Filter out any cancelled appointments that might have slipped through
    const filteredAppointments = apiAppointments.filter(
      (apt) => apt && apt.status !== "cancelled" // Add null check for safety
    );

    return filteredAppointments.map((apt) => {
      // Determine if this appointment was booked with "any available team member"
      // Check for team_member_preference in metadata
      const teamMemberPreference =
        apt.metadata?.team_member_preference || "specific";
      const anyAvailableTeamMember = teamMemberPreference === "any";

      // Get service name from the joined services table or fallback
      const serviceName = apt.services?.name || "Service";

      // Get variant name if available
      const variantName = apt.service_variants?.name;

      // Combine service and variant names if both exist
      const fullServiceName = variantName
        ? `${serviceName} - ${variantName}`
        : serviceName;

      // Fix timezone issues by parsing the date string properly
      // When creating a Date from YYYY-MM-DD, ensure it's treated as local date
      const [year, month, day] = apt.date.split("-").map(Number);
      const localDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date

      return {
        id: apt.id,
        teamMemberId: apt.team_member_id,
        customerName: apt.customer_name || "Customer",
        serviceName: fullServiceName,
        date: localDate,
        time: apt.start_time,
        duration: apt.duration,
        status: apt.status,
        anyAvailableTeamMember,
        teamMemberPreference,
        teamMemberName: apt.team_member?.display_name || "Staff",
        color: apt.services?.color || "#4f46e5", // Default to indigo if no color
        price: apt.price ?? undefined, // Map null to undefined
        paymentStatus: apt.payment_status ?? undefined, // Map null to undefined
        notes: apt.notes ?? undefined, // Map null to undefined
        customerNotes: apt.customer_notes ?? undefined, // Map null to undefined
        internalNotes: apt.internal_notes ?? undefined, // Map null to undefined
      };
    });
  };

  // Subscribe to real-time updates
  useWorkspaceAppointments(workspaceId, {
    onInsert: (payload) => {
      // Type guard for payload.new
      if (!payload.new || !isApiAppointment(payload.new)) return;
      // Skip cancelled appointments
      if (payload.new.status === "cancelled") return;

      // Transform the new appointment (type assertion is safe after guard)
      const newAppointment = transformAppointments([payload.new as ApiAppointment])[0];

      // Add the new appointment to the state
      setAppointments((prev) => [...prev, newAppointment]);
    },
    onUpdate: (payload) => {
       // Type guard for payload.new
      if (!payload.new || !isApiAppointment(payload.new)) return;

      // If the appointment was cancelled, remove it from the state
      if (payload.new.status === "cancelled") {
        setAppointments((prev) =>
          prev.filter((apt) => apt.id !== (payload.new as ApiAppointment).id)
        );
        return;
      }

      // Transform the updated appointment (type assertion is safe after guard)
      const updatedAppointment = transformAppointments([payload.new as ApiAppointment])[0];

      // Update the appointment in the state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === updatedAppointment.id ? updatedAppointment : apt
        )
      );
    },
    onDelete: (payload) => {
      // Type guard for payload.old - might be partial or {}
      if (!payload.old || typeof payload.old !== 'object' || !('id' in payload.old) || typeof payload.old.id !== 'string') {
        console.warn("Received delete event with invalid payload.old:", payload.old);
        return;
      }

      // Assert the type after the guard passes and store the ID
      const oldId = (payload.old as { id: string }).id;

      // Remove the appointment from the state using the confirmed ID
      setAppointments((prev) =>
        prev.filter((apt) => apt.id !== oldId)
      );
    },
  });

  // Fetch appointments when dependencies change
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Provide a function to refresh appointments
  const refreshAppointments = useCallback(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    isLoading,
    error,
    refreshAppointments,
  };
}

// Type guard function to check if an object conforms to ApiAppointment
function isApiAppointment(obj: unknown): obj is ApiAppointment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj && typeof obj.id === 'string' &&
    'workspace_id' in obj && typeof obj.workspace_id === 'string' &&
    'team_member_id' in obj && typeof obj.team_member_id === 'string' &&
    'service_id' in obj && typeof obj.service_id === 'string' &&
    'status' in obj && typeof obj.status === 'string' &&
    'date' in obj && typeof obj.date === 'string' &&
    'start_time' in obj && typeof obj.start_time === 'string' &&
    'duration' in obj && typeof obj.duration === 'number'
    // Add checks for other non-optional fields if necessary
  );
}

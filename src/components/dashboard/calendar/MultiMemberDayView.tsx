"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Appointment, TeamMember } from "@/types/calendar";
import { OperatingHours } from "@/types/workspace";
import {
  formatTimeDisplay,
  timeToMinutes,
  calculateAppointmentDisplay,
} from "@/utils/calendar-utils";
import { AppointmentDetailsDialog } from "./AppointmentDetailsDialog";

// Define the mapping from day number (0=Sunday) to OperatingHours key
const DAY_OF_WEEK_MAP: Record<number, keyof OperatingHours> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

interface MultiMemberDayViewProps {
  date: Date;
  teamMembers: TeamMember[];
  appointments: Appointment[];
  timeSlots: string[];
  operatingHours: OperatingHours | null;
  onAppointmentUpdated?: () => void;
}

export function MultiMemberDayView({
  date,
  teamMembers,
  appointments,
  timeSlots,
  operatingHours,
  onAppointmentUpdated,
}: MultiMemberDayViewProps) {
  const t = useTranslations("dashboard.calendar");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] =
    useState<TeamMember | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Determine the operating hours for the currently viewed day
  const dayNumber = date.getDay(); // Get day number (0-6)
  const currentDayKey = DAY_OF_WEEK_MAP[dayNumber]; // Map number to key ('sunday', 'monday', etc.)
  const dayOperatingHours = operatingHours?.[currentDayKey] ?? [];
  // For simplicity, using the first slot if multiple exist for the day.
  // Adapt this logic if you need to handle multiple open/close intervals per day.
  const workingHoursToday =
    dayOperatingHours.length > 0
      ? { start: dayOperatingHours[0].open, end: dayOperatingHours[0].close }
      : { start: "00:00", end: "00:00" }; // Default to closed

  // Use all time slots including half-hour slots for more precise operating hours
  // For a less crowded view, you could filter to hourly slots with: timeSlots.filter((slot) => slot.endsWith("00"))
  const displayTimeSlots = timeSlots;

  // Process all appointments to determine their position in the grid
  const processedAppointmentsByMember = teamMembers.map((member) => {
    const memberAppointments = appointments
      .filter((a) => a.teamMemberId === member.id)
      .map((appointment) => {
        const startMinutes = timeToMinutes(appointment.time);
        const endMinutes = startMinutes + appointment.duration;

        return {
          ...appointment,
          startMinutes,
          endMinutes,
        };
      });

    return {
      memberId: member.id,
      appointments: memberAppointments,
    };
  });

  // Handle appointment click
  const handleAppointmentClick = (
    appointment: Appointment,
    member: TeamMember
  ) => {
    setSelectedAppointment(appointment);
    setSelectedTeamMember(member);
    setDialogOpen(true);
  };

  // Function to get status color based on appointment status
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      case "completed":
        return "bg-blue-500";
      case "no_show":
        return "bg-gray-500";
      default:
        return "bg-gray-300";
    }
  };

  // Determine grid columns based on number of team members and screen size
  const getGridColumns = () => {
    // For mobile, limit the number of visible columns
    if (teamMembers.length === 1) return "grid-cols-1";
    if (teamMembers.length === 2) return "grid-cols-2";
    if (teamMembers.length === 3) return "grid-cols-3 sm:grid-cols-3";
    if (teamMembers.length <= 4) return "grid-cols-2 sm:grid-cols-4";
    return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
  };

  return (
    <div className="overflow-x-auto">
      <div className="relative flex flex-col h-[calc(100vh-18rem)] md:h-[calc(100vh-16rem)]">
        {/* Header row with team members - Fixed outside of scrollable area */}
        <div className="grid grid-cols-[60px_1fr] sticky top-0 z-20 bg-background shadow-sm">
          <div className="p-2 sm:p-3 font-medium border-b border-r text-xs sm:text-sm text-center">
            {t("time")}
          </div>
          <div className={`grid ${getGridColumns()} border-b`}>
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="p-2 sm:p-3 text-center font-medium border-r"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-xs sm:text-sm">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <p className="text-xs sm:text-sm truncate max-w-[80px] sm:max-w-full">
                    {member.name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable time slots area */}
        <div className="overflow-y-auto flex-1">
          {/* Time slots rows */}
          <div className="relative">
            {displayTimeSlots.map((timeSlot: string) => {
              // Calculate hour boundaries in minutes
              const [hourStr] = timeSlot.split(":");
              const hour = parseInt(hourStr, 10);
              // We'll calculate the specific hourStartMinutes in each cell based on the time slot

              return (
                <div
                  key={timeSlot}
                  className="grid grid-cols-[60px_1fr] border-b"
                >
                  {/* Time column */}
                  <div className="p-2 sm:p-3 text-xs sm:text-sm font-medium border-r sticky left-0 bg-background">
                    {formatTimeDisplay(timeSlot)}
                  </div>

                  {/* Team member columns */}
                  <div className={`grid ${getGridColumns()}`}>
                    {teamMembers.map((member) => {
                      // Check if this hour is within WORKSPACE operating hours for the CURRENTLY VIEWED DAY
                      let isWorkingHour = false;
                      const { start, end } = workingHoursToday; // Use workspace hours for the day

                      if (
                        start &&
                        end &&
                        start !== "00:00" &&
                        end !== "00:00"
                      ) {
                        // Parse start and end times to minutes for more precise comparison
                        const [startHourStr, startMinStr] = start.split(":");
                        const [endHourStr, endMinStr] = end.split(":");
                        const startHour = parseInt(startHourStr, 10);
                        const startMin = parseInt(startMinStr, 10);
                        const endHour = parseInt(endHourStr, 10);
                        const endMin = parseInt(endMinStr, 10);

                        // Convert to minutes since midnight
                        const startMinutes = startHour * 60 + startMin;
                        const endMinutes = endHour * 60 + endMin;

                        // Get the current time slot in minutes
                        const [timeSlotHourStr, timeSlotMinStr] =
                          timeSlot.split(":");
                        const timeSlotHour = parseInt(timeSlotHourStr, 10);
                        const timeSlotMin = parseInt(timeSlotMinStr, 10);
                        const timeSlotMinutes = timeSlotHour * 60 + timeSlotMin;

                        // Check if this time slot is within working hours
                        isWorkingHour =
                          timeSlotMinutes >= startMinutes &&
                          timeSlotMinutes < endMinutes;
                      }

                      // Get all appointments for this member that might overlap with this time slot
                      const memberData = processedAppointmentsByMember.find(
                        (m) => m.memberId === member.id
                      );
                      const hourStartMinutes =
                        hour * 60 + (timeSlot.endsWith("30") ? 30 : 0);
                      const hourEndMinutes = hourStartMinutes + 30;

                      // Find appointments that overlap with this time slot
                      const hourAppointments = memberData
                        ? memberData.appointments.filter(
                            (a) =>
                              a.endMinutes > hourStartMinutes &&
                              a.startMinutes < hourEndMinutes
                          )
                        : [];

                      return (
                        <div
                          key={`${member.id}-${timeSlot}`}
                          className={`border-r relative h-38 ${
                            !isWorkingHour
                              ? "bg-muted/30 unavailable-time-slot"
                              : "bg-card"
                          }`}
                          data-unavailable={!isWorkingHour ? "true" : "false"}
                        >
                          {/* Render appointments */}
                          {hourAppointments.map((appointment) => {
                            const displayInfo = calculateAppointmentDisplay(
                              appointment,
                              hourStartMinutes
                            );

                            if (!displayInfo) return null;

                            return (
                              <div
                                key={`${appointment.id}-${hourStartMinutes}`}
                                data-appointment-id={appointment.id}
                                className={`absolute border left-0 right-0 mx-1 overflow-hidden cursor-pointer hover:opacity-80 transition-colors ${appointment.color ? "" : "bg-primary/10 border-primary"} ${displayInfo.isStart ? "rounded-t-sm" : "border-t-0"} ${displayInfo.isEnd ? "rounded-b-sm" : "border-b-0"}`}
                                style={{
                                  top: displayInfo.top,
                                  height: displayInfo.height,
                                  zIndex: appointment.duration >= 60 ? 10 : 5, // Higher z-index for longer appointments
                                  position: "absolute",
                                  // Ensure appointments are hidden when scrolling under the header
                                  visibility: "visible",
                                  backgroundColor: appointment.color
                                    ? `${appointment.color}20`
                                    : undefined, // 20 is hex for 12% opacity
                                  borderColor: appointment.color || undefined,
                                }}
                                onClick={() =>
                                  handleAppointmentClick(appointment, member)
                                }
                              >
                                <div className="text-sm sm:text-base h-full flex flex-col p-2 sm:p-3 overflow-hidden">
                                  {/* Only show details in the first block of a multi-block appointment */}
                                  {displayInfo.isStart && (
                                    <div className="flex items-center gap-1">
                                      <p className="font-medium truncate text-sm sm:text-base">
                                        {appointment.customerName}
                                      </p>
                                      {appointment.status && (
                                        <span
                                          className={`inline-block w-3 h-3 rounded-full ${getStatusColor(appointment.status)}`}
                                          title={appointment.status}
                                        />
                                      )}
                                    </div>
                                  )}

                                  {/* Show service details based on screen size and appointment duration */}
                                  {displayInfo.isStart && (
                                    <div className="flex items-center justify-between mt-1 sm:mt-2">
                                      <div className="overflow-hidden">
                                        {appointment.duration >= 30 ? (
                                          <p className="truncate text-muted-foreground text-sm sm:text-base">
                                            {appointment.serviceName} (
                                            {t("appointmentDetails.duration", {
                                              duration: appointment.duration,
                                            })}
                                            )
                                            {/* Show team member preference indicator */}
                                            {appointment.teamMemberPreference ===
                                            "any" ? (
                                              <span className="ml-1 text-xs sm:text-sm bg-secondary px-1 py-0.5 rounded">
                                                {t("anyStaff")}
                                              </span>
                                            ) : (
                                              <span className="ml-1 text-xs sm:text-sm bg-muted px-1 py-0.5 rounded">
                                                {t("specificStaff")}
                                              </span>
                                            )}
                                          </p>
                                        ) : (
                                          <p className="truncate text-muted-foreground hidden sm:block text-sm sm:text-base">
                                            {appointment.serviceName} (
                                            {t("appointmentDetails.duration", {
                                              duration: appointment.duration,
                                            })}
                                            )
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {isWorkingHour && hourAppointments.length === 0 && (
                            <div className="h-full flex items-center justify-center">
                              <p className="text-sm sm:text-base text-muted-foreground">
                                {t("available")}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 sm:mt-4 text-center text-xs sm:text-sm text-muted-foreground">
        <p>{t("showingSchedule", { count: teamMembers.length })}</p>
      </div>

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teamMember={selectedTeamMember || undefined}
        onAppointmentUpdated={onAppointmentUpdated}
      />
    </div>
  );
}

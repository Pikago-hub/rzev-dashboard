"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Appointment, TeamMember } from "@/types/calendar";
import {
  formatTimeDisplay,
  timeToMinutes,
  calculateAppointmentDisplay,
  formatShortDate,
  getWeekRange,
} from "@/utils/calendar-utils";
import { AppointmentDetailsDialog } from "./AppointmentDetailsDialog";

interface MultiMemberWeekViewProps {
  date: Date;
  teamMembers: TeamMember[];
  appointments: Appointment[];
  timeSlots: string[];
  onAppointmentUpdated?: () => void; // Callback to refresh appointments
}

export function MultiMemberWeekView({
  date,
  teamMembers,
  appointments,
  timeSlots,
  onAppointmentUpdated,
}: MultiMemberWeekViewProps) {
  const t = useTranslations("dashboard.calendar");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] =
    useState<TeamMember | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get the week range (Sunday to Saturday)
  const { start: weekStart } = getWeekRange(date);

  // Generate array of dates for the week
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });

  // Use all time slots including half-hour slots for more precise operating hours
  // For a less crowded view, you could filter to hourly slots with: timeSlots.filter((slot) => slot.endsWith("00"))
  const displayTimeSlots = timeSlots;

  // Process all appointments to determine their position in the grid
  const processedAppointmentsByDay = weekDates.map((day) => {
    // Filter appointments for this day by comparing dates
    const dayAppointments = appointments.filter((appointment) => {
      // Compare year, month, and day to match appointments to the correct day
      return (
        appointment.date.getFullYear() === day.getFullYear() &&
        appointment.date.getMonth() === day.getMonth() &&
        appointment.date.getDate() === day.getDate()
      );
    });

    // Process appointments for positioning
    const processedAppointments = dayAppointments.map((appointment) => {
      const startMinutes = timeToMinutes(appointment.time);
      const endMinutes = startMinutes + appointment.duration;

      return {
        ...appointment,
        startMinutes,
        endMinutes,
      };
    });

    return {
      date: day,
      appointments: processedAppointments,
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

  return (
    <div className="overflow-x-auto">
      <div className="relative min-w-[800px] sm:min-w-[1000px] flex flex-col h-[calc(100vh-18rem)] md:h-[calc(100vh-16rem)]">
        {/* Header row with days of the week - Fixed outside of scrollable area */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-20 bg-background shadow-sm">
          <div className="p-2 sm:p-3 font-medium border-b border-r text-[10px] sm:text-xs text-center">
            {t("time")}
          </div>
          {weekDates.map((day) => (
            <div
              key={day.toISOString()}
              className="p-2 sm:p-3 text-center font-medium border-b border-r"
            >
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] sm:text-sm">{formatShortDate(day)}</p>
              </div>
            </div>
          ))}
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
                  className="grid grid-cols-[60px_repeat(7,1fr)] border-b"
                >
                  {/* Time column */}
                  <div className="p-2 sm:p-3 text-[10px] sm:text-xs font-medium border-r sticky left-0 bg-background">
                    {formatTimeDisplay(timeSlot)}
                  </div>

                  {/* Day columns */}
                  {weekDates.map((day, dayIndex) => {
                    // Get appointments for this day and hour
                    const dayData = processedAppointmentsByDay[dayIndex];
                    const hourStartMinutes =
                      hour * 60 + (timeSlot.endsWith("30") ? 30 : 0);
                    const hourEndMinutes = hourStartMinutes + 30;

                    // Find appointments that overlap with this time slot
                    const hourAppointments = dayData.appointments.filter(
                      (a) =>
                        a.endMinutes > hourStartMinutes &&
                        a.startMinutes < hourEndMinutes
                    );

                    // Group appointments by team member
                    const appointmentsByMember = teamMembers.map((member) => {
                      return {
                        member,
                        appointments: hourAppointments.filter(
                          (a) => a.teamMemberId === member.id
                        ),
                      };
                    });

                    // Check if any team member is working at this hour based on workspace operating hours
                    const hasWorkingMember = teamMembers.some((member) => {
                      // Get the day of week for the current day in the loop
                      const dayOfWeek = day.getDay();

                      // Map day of week number to day name (0 = Sunday, 1 = Monday, etc.)
                      const dayMap: Record<number, string> = {
                        0: "sunday",
                        1: "monday",
                        2: "tuesday",
                        3: "wednesday",
                        4: "thursday",
                        5: "friday",
                        6: "saturday",
                      };

                      // For week view, we need to check each day's operating hours
                      // This is different from day view where we only use the current day's hours
                      const dayKey = dayMap[
                        dayOfWeek
                      ] as keyof typeof member.operatingHours;

                      // Get operating hours for this day
                      const dayOperatingHours = member.operatingHours?.[dayKey];

                      // Default to not working if no operating hours are set
                      if (
                        !dayOperatingHours ||
                        !Array.isArray(dayOperatingHours) ||
                        dayOperatingHours.length === 0
                      ) {
                        return false;
                      }

                      // Check if this hour is within any of the operating hours slots for this day
                      return dayOperatingHours.some((slot) => {
                        if (!slot.open || !slot.close) return false;

                        // Parse start and end times to minutes for more precise comparison
                        const [startHourStr, startMinStr] =
                          slot.open.split(":");
                        const [endHourStr, endMinStr] = slot.close.split(":");
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
                        return (
                          timeSlotMinutes >= startMinutes &&
                          timeSlotMinutes < endMinutes
                        );
                      });
                    });

                    return (
                      <div
                        key={`${day.toISOString()}-${timeSlot}`}
                        className={`border-r relative h-38 ${
                          !hasWorkingMember
                            ? "bg-muted/30 unavailable-time-slot"
                            : "bg-card"
                        }`}
                        data-unavailable={!hasWorkingMember ? "true" : "false"}
                      >
                        {/* Render appointments for each team member */}
                        {appointmentsByMember.map(({ member, appointments }) =>
                          appointments.map((appointment) => {
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
                          })
                        )}

                        {/* Show "Available" text when there are no appointments and it's a working hour */}
                        {hasWorkingMember &&
                          appointmentsByMember.every(
                            ({ appointments }) => appointments.length === 0
                          ) && (
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

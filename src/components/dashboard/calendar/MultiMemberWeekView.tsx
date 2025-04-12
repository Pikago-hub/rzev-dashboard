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
}

export function MultiMemberWeekView({
  date,
  teamMembers,
  appointments,
  timeSlots,
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
              const hourStartMinutes = hour * 60;

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
                    const hourAppointments = dayData.appointments.filter(
                      (a) => Math.floor(a.startMinutes / 60) === hour
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
                                className="absolute bg-primary/10 border border-primary left-0 right-0 mx-1 overflow-hidden cursor-pointer hover:bg-primary/20 transition-colors"
                                style={{
                                  top: displayInfo.top,
                                  height: displayInfo.height,
                                  zIndex: appointment.duration >= 60 ? 10 : 5, // Higher z-index for longer appointments
                                  position: "absolute",
                                  // Ensure appointments are hidden when scrolling under the header
                                  visibility: "visible",
                                }}
                                onClick={() =>
                                  handleAppointmentClick(appointment, member)
                                }
                              >
                                <div className="text-[10px] sm:text-xs h-full flex flex-col p-1 sm:p-2 overflow-hidden">
                                  {/* Always show customer name */}
                                  <p className="font-medium truncate">
                                    {appointment.customerName}
                                  </p>

                                  {/* Show service details based on screen size and appointment duration */}
                                  <div className="flex items-center justify-between mt-0 sm:mt-1">
                                    <div className="overflow-hidden">
                                      {appointment.duration >= 30 ? (
                                        <p className="truncate text-muted-foreground">
                                          {appointment.serviceName} (
                                          {t("appointmentDetails.duration", {
                                            duration: appointment.duration,
                                          })}
                                          )
                                        </p>
                                      ) : (
                                        <p className="truncate text-muted-foreground hidden sm:block">
                                          {appointment.serviceName} (
                                          {t("appointmentDetails.duration", {
                                            duration: appointment.duration,
                                          })}
                                          )
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
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
      />
    </div>
  );
}

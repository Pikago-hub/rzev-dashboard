"use client";

import { useState } from "react";
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

  // Group time slots by hour for main display
  const hourlyTimeSlots = timeSlots.filter((slot) => slot.endsWith("00"));

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
            Time
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
            {hourlyTimeSlots.map((timeSlot) => {
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

                    // Check if any team member is working at this hour
                    const hasWorkingMember = teamMembers.some((member) => {
                      const [startHourStr] =
                        member.workingHours.start.split(":");
                      const [endHourStr] = member.workingHours.end.split(":");
                      const startHour = parseInt(startHourStr, 10);
                      const endHour = parseInt(endHourStr, 10);
                      return hour >= startHour && hour < endHour;
                    });

                    return (
                      <div
                        key={`${day.toISOString()}-${timeSlot}`}
                        className={`border-r relative h-38 ${
                          !hasWorkingMember ? "bg-muted/30" : "bg-card"
                        }`}
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
                                          {appointment.duration} min)
                                        </p>
                                      ) : (
                                        <p className="truncate text-muted-foreground hidden sm:block">
                                          {appointment.serviceName} (
                                          {appointment.duration} min)
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
        <p>Showing weekly schedule for {teamMembers.length} team member(s)</p>
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

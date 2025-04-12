"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Appointment, TeamMember } from "@/types/calendar";
import {
  formatTimeDisplay,
  timeToMinutes,
  calculateAppointmentDisplay,
} from "@/utils/calendar-utils";
import { AppointmentDetailsDialog } from "./AppointmentDetailsDialog";

interface MultiMemberDayViewProps {
  teamMembers: TeamMember[];
  appointments: Appointment[];
  timeSlots: string[];
}

export function MultiMemberDayView({
  teamMembers,
  appointments,
  timeSlots,
}: MultiMemberDayViewProps) {
  const t = useTranslations("dashboard.calendar");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] =
    useState<TeamMember | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
          <div className="p-2 sm:p-3 font-medium border-b border-r text-xs text-center">
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
              const hourStartMinutes = hour * 60;

              return (
                <div
                  key={timeSlot}
                  className="grid grid-cols-[60px_1fr] border-b"
                >
                  {/* Time column */}
                  <div className="p-2 sm:p-3 text-[10px] sm:text-xs font-medium border-r sticky left-0 bg-background">
                    {formatTimeDisplay(timeSlot)}
                  </div>

                  {/* Team member columns */}
                  <div className={`grid ${getGridColumns()}`}>
                    {teamMembers.map((member) => {
                      // Check if this hour is within workspace operating hours
                      // We're using the workingHours property which is already set based on the current day

                      // Get operating hours for today from member's workingHours
                      // Default to not working if no operating hours are set
                      let isWorkingHour = false;

                      // Use the member's workingHours which is set from workspace operating hours
                      const { start, end } = member.workingHours;

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

                      // Only show appointments that start in this hour for this member
                      const memberData = processedAppointmentsByMember.find(
                        (m) => m.memberId === member.id
                      );
                      const hourAppointments = memberData
                        ? memberData.appointments.filter(
                            (a) => Math.floor(a.startMinutes / 60) === hour
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
                          })}

                          {isWorkingHour && hourAppointments.length === 0 && (
                            <div className="h-full flex items-center justify-center">
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
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
      />
    </div>
  );
}

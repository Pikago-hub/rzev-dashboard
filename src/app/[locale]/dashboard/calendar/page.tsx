"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  generateTimeSlotsRange,
  findOperatingHoursRange,
} from "@/utils/calendar-utils";
import { CalendarHeader } from "@/components/dashboard/calendar/CalendarHeader";
import { MultiMemberDayView } from "@/components/dashboard/calendar/MultiMemberDayView";
import { MultiMemberWeekView } from "@/components/dashboard/calendar/MultiMemberWeekView";
// Import types from the calendar types file, but not Appointment since we're using the one from useAppointments
import { useWorkspaceOperatingHours } from "@/hooks/useWorkspaceOperatingHours";
import { useAppointments } from "@/hooks/useAppointments";
import { Skeleton } from "@/components/ui/skeleton";
// We use the workspace context indirectly through the useAppointments hook
import { useToast } from "@/components/ui/use-toast";

export default function CalendarPage() {
  const t = useTranslations("dashboard.calendar");
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>("all");
  // We use the workspace context indirectly through the useAppointments hook
  const { toast } = useToast();

  // Fetch team members with workspace operating hours
  const {
    teamMembers,
    operatingHours,
    isLoading: isLoadingTeamMembers,
  } = useWorkspaceOperatingHours();

  // Fetch appointments with real-time updates
  const {
    appointments,
    isLoading: isLoadingAppointments,
    error,
    refreshAppointments,
  } = useAppointments({
    date,
    view,
    teamMemberId: selectedTeamMember,
  });

  // Show error toast if there's an error fetching appointments
  if (error) {
    toast({
      title: t("error"),
      description: error.message,
      variant: "destructive",
    });
  }

  // Check if we have any team members
  const hasTeamMembers = teamMembers.length > 0;

  // Combined loading state
  const isLoading = isLoadingTeamMembers || isLoadingAppointments;

  // Find the earliest and latest operating hours
  const { earliest, latest } = findOperatingHoursRange(
    operatingHours || undefined
  );

  // Generate time slots based on operating hours with a 1-hour buffer
  const timeSlots = generateTimeSlotsRange(earliest, latest, 1);

  // Navigate to previous/next day or week
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(date);
    if (view === "day") {
      // Navigate by day
      if (direction === "prev") {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
    } else {
      // Navigate by week
      if (direction === "prev") {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
    }
    setDate(newDate);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 sm:gap-6 h-full flex-1 min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col gap-1 sm:gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6 flex-1 min-h-0">
          {/* Schedule View */}
          <div className="flex-1 flex flex-col min-h-0">
            <Card className="flex flex-col flex-1 h-[calc(100vh-16rem)]">
              <CardHeader className="pb-2 sm:pb-3">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <CalendarHeader
                    date={date}
                    view={view}
                    selectedTeamMember={selectedTeamMember}
                    teamMembers={teamMembers}
                    onDateChange={navigateDate}
                    onViewChange={(v) => setView(v as "day" | "week")}
                    onTeamMemberChange={setSelectedTeamMember}
                    onDateSelect={setDate}
                  />
                )}
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Skeleton className="h-[400px] w-full" />
                    </div>
                  </div>
                ) : !hasTeamMembers ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-4">
                      <p className="text-muted-foreground">
                        {t("noTeamMembers")}
                      </p>
                    </div>
                  </div>
                ) : view === "week" ? (
                  <MultiMemberWeekView
                    date={date}
                    teamMembers={
                      selectedTeamMember === "all"
                        ? teamMembers
                        : teamMembers.filter(
                            (m: { id: string }) => m.id === selectedTeamMember
                          )
                    }
                    appointments={appointments}
                    timeSlots={timeSlots}
                    onAppointmentUpdated={refreshAppointments}
                  />
                ) : (
                  <MultiMemberDayView
                    date={date}
                    teamMembers={
                      selectedTeamMember === "all"
                        ? teamMembers
                        : teamMembers.filter(
                            (m: { id: string }) => m.id === selectedTeamMember
                          )
                    }
                    appointments={appointments}
                    timeSlots={timeSlots}
                    operatingHours={operatingHours}
                    onAppointmentUpdated={refreshAppointments}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

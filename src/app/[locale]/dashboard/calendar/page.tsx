"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { generateTimeSlots } from "@/utils/calendar-utils";
import { CalendarHeader } from "@/components/dashboard/calendar/CalendarHeader";
import { MultiMemberDayView } from "@/components/dashboard/calendar/MultiMemberDayView";
import { MultiMemberWeekView } from "@/components/dashboard/calendar/MultiMemberWeekView";
import { TeamMember, Appointment } from "@/types/calendar";

export default function CalendarPage() {
  const t = useTranslations("dashboard.calendar");
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>("all");

  // Mock team members data
  const teamMembers: TeamMember[] = [
    {
      id: "1",
      name: "John Doe",
      role: "Barber",
      workingHours: { start: "09:00", end: "17:00" },
    },
    {
      id: "2",
      name: "Jane Smith",
      role: "Stylist",
      workingHours: { start: "10:00", end: "18:00" },
    },
    {
      id: "3",
      name: "Mike Johnson",
      role: "Massage Therapist",
      workingHours: { start: "08:00", end: "16:00" },
    },
  ];

  // Create dates for the current week
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(today.getDate() + 2);
  const dayAfter3 = new Date(today);
  dayAfter3.setDate(today.getDate() + 3);
  const dayAfter4 = new Date(today);
  dayAfter4.setDate(today.getDate() + 4);

  // Mock appointments data with dates
  const appointments: Appointment[] = [
    // Today's appointments
    {
      id: "1",
      teamMemberId: "1",
      customerName: "Alice Brown",
      serviceName: "Haircut",
      date: new Date(today),
      time: "10:00",
      duration: 30,
    },
    {
      id: "2",
      teamMemberId: "2",
      customerName: "Bob White",
      serviceName: "Hair Coloring",
      date: new Date(today),
      time: "11:30",
      duration: 90,
    },
    {
      id: "3",
      teamMemberId: "3",
      customerName: "Carol Davis",
      serviceName: "Massage",
      date: new Date(today),
      time: "09:00",
      duration: 60,
    },
    {
      id: "4",
      teamMemberId: "1",
      customerName: "David Miller",
      serviceName: "Beard Trim",
      date: new Date(today),
      time: "14:00",
      duration: 20,
    },
    // Tomorrow's appointments
    {
      id: "5",
      teamMemberId: "2",
      customerName: "Emily Johnson",
      serviceName: "Manicure",
      date: new Date(tomorrow),
      time: "10:30",
      duration: 45,
    },
    {
      id: "6",
      teamMemberId: "3",
      customerName: "Frank Wilson",
      serviceName: "Deep Tissue Massage",
      date: new Date(tomorrow),
      time: "13:00",
      duration: 90,
    },
    // Day after tomorrow's appointments
    {
      id: "7",
      teamMemberId: "1",
      customerName: "Grace Taylor",
      serviceName: "Haircut & Style",
      date: new Date(dayAfterTomorrow),
      time: "09:30",
      duration: 60,
    },
    {
      id: "8",
      teamMemberId: "2",
      customerName: "Henry Martinez",
      serviceName: "Hair Coloring",
      date: new Date(dayAfterTomorrow),
      time: "15:00",
      duration: 120,
    },
    // Day after 3 appointments
    {
      id: "9",
      teamMemberId: "3",
      customerName: "Isabella Lopez",
      serviceName: "Facial Treatment",
      date: new Date(dayAfter3),
      time: "11:00",
      duration: 75,
    },
    // Day after 4 appointments
    {
      id: "10",
      teamMemberId: "1",
      customerName: "Jack Robinson",
      serviceName: "Haircut & Beard Trim",
      date: new Date(dayAfter4),
      time: "16:00",
      duration: 45,
    },
  ];

  // Generate time slots for full day (12 AM to 12 PM)
  const timeSlots = generateTimeSlots();

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
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                {view === "week" ? (
                  <MultiMemberWeekView
                    date={date}
                    teamMembers={
                      selectedTeamMember === "all"
                        ? teamMembers
                        : teamMembers.filter((m) => m.id === selectedTeamMember)
                    }
                    appointments={appointments.filter((a) =>
                      selectedTeamMember === "all"
                        ? true
                        : a.teamMemberId === selectedTeamMember
                    )}
                    timeSlots={timeSlots}
                  />
                ) : (
                  <MultiMemberDayView
                    teamMembers={
                      selectedTeamMember === "all"
                        ? teamMembers
                        : teamMembers.filter((m) => m.id === selectedTeamMember)
                    }
                    appointments={appointments.filter(
                      (a) =>
                        (selectedTeamMember === "all"
                          ? true
                          : a.teamMemberId === selectedTeamMember) &&
                        a.date.getFullYear() === date.getFullYear() &&
                        a.date.getMonth() === date.getMonth() &&
                        a.date.getDate() === date.getDate()
                    )}
                    timeSlots={timeSlots}
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

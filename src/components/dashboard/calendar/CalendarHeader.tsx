"use client";

import { TeamMember } from "@/types/calendar";
import {
  formatDate,
  formatDateRange,
  getWeekRange,
} from "@/utils/calendar-utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";

interface CalendarHeaderProps {
  date: Date;
  view: "day" | "week";
  selectedTeamMember: string;
  teamMembers: TeamMember[];
  onDateChange: (direction: "prev" | "next") => void;
  onViewChange: (view: "day" | "week") => void;
  onTeamMemberChange: (memberId: string) => void;
  onDateSelect: (date: Date) => void;
}

export function CalendarHeader({
  date,
  view,
  selectedTeamMember,
  teamMembers,
  onDateChange,
  onViewChange,
  onTeamMemberChange,
  onDateSelect,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onDateChange("prev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-1 text-sm sm:text-base font-semibold truncate max-w-[180px] sm:max-w-none"
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              {view === "day"
                ? formatDate(date)
                : formatDateRange(
                    getWeekRange(date).start,
                    getWeekRange(date).end
                  )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => newDate && onDateSelect(newDate)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onDateChange("next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Tabs
          value={view}
          onValueChange={(v) => onViewChange(v as "day" | "week")}
          className="flex-shrink-0"
        >
          <TabsList>
            <TabsTrigger value="day" className="text-xs sm:text-sm">
              Day
            </TabsTrigger>
            <TabsTrigger value="week" className="text-xs sm:text-sm">
              Week
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={selectedTeamMember} onValueChange={onTeamMemberChange}>
          <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm">
            <SelectValue placeholder="Select team member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Team Members</SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

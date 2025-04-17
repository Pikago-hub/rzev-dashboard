"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { format, addMinutes } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { getAuthToken } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { Appointment } from "@/types/calendar";
import { generateTimeSlots } from "@/utils/calendar-utils";

interface RescheduleAppointmentDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRescheduleComplete: () => void;
  teamMembers?: Array<{ id: string; name: string }>;
}

export function RescheduleAppointmentDialog({
  appointment,
  open,
  onOpenChange,
  onRescheduleComplete,
  teamMembers = [],
}: RescheduleAppointmentDialogProps) {
  const t = useTranslations("dashboard.calendar.rescheduleDialog");
  const { toast } = useToast();
  const { workspaceProfile } = useWorkspace();

  const [date, setDate] = useState<Date | undefined>(
    appointment?.date ? new Date(appointment.date) : undefined
  );
  const [startTime, setStartTime] = useState<string | undefined>(
    appointment?.time
  );
  const [teamMemberId, setTeamMemberId] = useState<string | undefined>(
    appointment?.teamMemberId
  );
  const [teamMemberPreference, setTeamMemberPreference] = useState<string>(
    appointment?.teamMemberPreference || "specific"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  // Update state when appointment changes
  useEffect(() => {
    if (appointment) {
      setDate(appointment.date ? new Date(appointment.date) : undefined);
      setStartTime(appointment.time);
      setTeamMemberId(appointment.teamMemberId);
      setTeamMemberPreference(appointment.teamMemberPreference || "specific");
    }
  }, [appointment]);

  // Generate time slots when date changes
  useEffect(() => {
    if (date) {
      // Generate time slots in 30-minute increments
      const slots = generateTimeSlots(30);
      setTimeSlots(slots);
    }
  }, [date]);

  // Calculate end time based on start time and duration
  const calculateEndTime = (start: string, durationMinutes: number): string => {
    if (!start) return "";

    const [hours, minutes] = start.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = addMinutes(startDate, durationMinutes);
    return `${endDate.getHours().toString().padStart(2, "0")}:${endDate
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (!appointment || !workspaceProfile?.id || !date || !startTime) {
      toast({
        title: t("validationError") || "Validation Error",
        description: t("allFieldsRequired") || "All fields are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get the auth token
      const token = await getAuthToken();

      // Calculate end time based on start time and appointment duration
      const endTime = calculateEndTime(startTime, appointment.duration);

      const response = await fetch("/api/appointments/request-reschedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          workspaceId: workspaceProfile.id,
          newDate: format(date, "yyyy-MM-dd"),
          newTime: startTime,
          newEndTime: endTime,
          teamMemberId: teamMemberId,
          teamMemberPreference,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to request reschedule");
      }

      toast({
        title: t("rescheduleRequestSuccess") || "Reschedule Requested",
        description:
          t("rescheduleRequestSuccessMessage") ||
          "The reschedule request has been sent to the customer",
      });

      // Close the dialog and notify parent component
      onOpenChange(false);
      onRescheduleComplete();
    } catch (error) {
      console.error("Error requesting reschedule:", error);
      toast({
        title: t("rescheduleError") || "Error",
        description:
          typeof error === "string"
            ? error
            : (error as Error).message ||
              t("rescheduleErrorMessage") ||
              "Failed to request the reschedule",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title") || "Reschedule Appointment"}</DialogTitle>
          <DialogDescription>
            {t("subtitle") || "Select a new date and time for this appointment"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Customer information */}
          {appointment && (
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">{t("customer")}:</span>
              <span className="col-span-3">{appointment.customerName}</span>
            </div>
          )}

          {/* Date picker */}
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">{t("date")}:</span>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : t("selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Time picker */}
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">{t("time")}:</span>
            <div className="col-span-3">
              <Select
                value={startTime}
                onValueChange={setStartTime}
                disabled={!date}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectTime") || "Select time"} />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Team member preference */}
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">{t("staffPreference")}:</span>
            <div className="col-span-3">
              <Select
                value={teamMemberPreference}
                onValueChange={setTeamMemberPreference}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("selectPreference") || "Select preference"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="specific">
                    {t("specificStaff") || "Specific staff member"}
                  </SelectItem>
                  <SelectItem value="any">
                    {t("anyStaff") || "Any available staff"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Team member selection (only shown if "specific" is selected) */}
          {teamMemberPreference === "specific" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">{t("staffMember")}:</span>
              <div className="col-span-3">
                <Select
                  value={teamMemberId}
                  onValueChange={setTeamMemberId}
                  disabled={teamMemberPreference !== "specific"}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("selectStaff") || "Select staff member"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel") || "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting") || "Submitting..."}
              </>
            ) : (
              t("requestReschedule") || "Request Reschedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Appointment, TeamMember } from "@/types/calendar";
import { useTranslations } from "next-intl";
import {
  formatTime,
  calculateEndTime,
  formatDate,
} from "@/utils/calendar-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AppointmentDetailsDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMember?: TeamMember;
}

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  teamMember,
}: AppointmentDetailsDialogProps) {
  const t = useTranslations("dashboard.calendar.appointmentDetails");
  if (!appointment) return null;

  const endTime = calculateEndTime(appointment.time, appointment.duration);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">{t("customer")}:</span>
            <span className="col-span-3">{appointment.customerName}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">{t("service")}:</span>
            <span className="col-span-3">{appointment.serviceName}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">{t("date")}:</span>
            <span className="col-span-3">{formatDate(appointment.date)}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">{t("time")}:</span>
            <span className="col-span-3">
              {formatTime(appointment.time)} - {formatTime(endTime)} (
              {t("duration", { duration: appointment.duration })})
            </span>
          </div>
          {teamMember && (
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">{t("staff")}:</span>
              <span className="col-span-3">
                {teamMember.name} ({teamMember.role})
              </span>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">{t("status")}:</span>
            <Badge variant="outline" className="col-span-3">
              {t("confirmed")}
            </Badge>
          </div>
        </div>
        <div className="flex justify-between mt-4">
          <Button variant="outline">{t("reschedule")}</Button>
          <Button variant="outline" className="text-destructive">
            {t("cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

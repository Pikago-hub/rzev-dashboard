"use client";

import { Appointment, TeamMember } from "@/types/calendar";
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
  if (!appointment) return null;

  const endTime = calculateEndTime(appointment.time, appointment.duration);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            View the details of this appointment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Customer:</span>
            <span className="col-span-3">{appointment.customerName}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Service:</span>
            <span className="col-span-3">{appointment.serviceName}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Date:</span>
            <span className="col-span-3">{formatDate(appointment.date)}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Time:</span>
            <span className="col-span-3">
              {formatTime(appointment.time)} - {formatTime(endTime)} (
              {appointment.duration} min)
            </span>
          </div>
          {teamMember && (
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">Staff:</span>
              <span className="col-span-3">
                {teamMember.name} ({teamMember.role})
              </span>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant="outline" className="col-span-3">
              Confirmed
            </Badge>
          </div>
        </div>
        <div className="flex justify-between mt-4">
          <Button variant="outline">Reschedule</Button>
          <Button variant="outline" className="text-destructive">
            Cancel Appointment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

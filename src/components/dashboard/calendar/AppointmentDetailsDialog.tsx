"use client";

import { useState, useEffect } from "react";
import { Appointment, TeamMember } from "@/types/calendar";
import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import {
  formatTime,
  calculateEndTime,
  formatDate,
} from "@/utils/calendar-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/workspace-context";
import { getAuthToken } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RescheduleAppointmentDialog } from "./RescheduleAppointmentDialog";

interface AppointmentDetailsDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMember?: TeamMember;
  onAppointmentUpdated?: () => void; // Callback when appointment is updated
}

// Extend the Appointment type to include metadata for reschedule requests
interface ExtendedAppointment extends Appointment {
  metadata?: {
    // Customer-initiated reschedule
    pending_reschedule?: {
      new_date: string;
      new_time: string;
      new_end_time: string;
      team_member_id?: string;
      team_member_preference?: string;
    };
    // Workspace-initiated reschedule
    workspace_pending_reschedule?: {
      new_date: string;
      new_time: string;
      new_end_time: string;
      team_member_id?: string;
      team_member_preference?: string;
      initiated_at: string;
    };
    reschedule_history?: Array<{
      status: string;
      requested_at?: string;
      confirmed_at?: string;
      rejected_at?: string;
      notes?: string;
      initiated_by?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
}

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  teamMember,
  onAppointmentUpdated,
}: AppointmentDetailsDialogProps) {
  const t = useTranslations("dashboard.calendar.appointmentDetails");
  const { toast } = useToast();
  const { workspaceProfile } = useWorkspace();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmingReschedule, setIsConfirmingReschedule] = useState(false);
  const [isDecliningReschedule, setIsDecliningReschedule] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [allTeamMembers, setAllTeamMembers] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Fetch all team members for the reschedule dialog
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!workspaceProfile?.id) return;

      try {
        const token = await getAuthToken();
        const response = await fetch(
          `/api/team?workspaceId=${workspaceProfile.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch team members");
        }

        const data = await response.json();
        if (data.teamMembers && Array.isArray(data.teamMembers)) {
          setAllTeamMembers(
            data.teamMembers.map(
              (member: { id: string; display_name: string }) => ({
                id: member.id,
                name: member.display_name,
              })
            )
          );
        }
      } catch (error) {
        console.error("Error fetching team members:", error);
      }
    };

    if (open && showRescheduleDialog) {
      fetchTeamMembers();
    }
  }, [open, showRescheduleDialog, workspaceProfile?.id]);

  if (!appointment) return null;

  const endTime = calculateEndTime(appointment.time, appointment.duration);

  // Handler for reschedule action
  const handleReschedule = () => {
    console.log("Reschedule appointment:", appointment.id);
    // Open the reschedule dialog
    setShowRescheduleDialog(true);
  };

  // Handler for confirming a reschedule request
  const handleConfirmReschedule = async () => {
    if (!appointment || !workspaceProfile?.id) return;

    setIsConfirmingReschedule(true);
    try {
      // Get the auth token
      let token;
      try {
        token = await getAuthToken();
      } catch (authError) {
        console.error("Error getting auth token:", authError);
        toast({
          title: t("confirmError") || "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        setIsConfirmingReschedule(false);
        return;
      }

      const response = await fetch("/api/appointments/confirm-reschedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          workspaceId: workspaceProfile.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm reschedule");
      }

      toast({
        title: t("rescheduleConfirmSuccess") || "Reschedule Confirmed",
        description:
          t("rescheduleConfirmSuccessMessage") ||
          "The appointment has been rescheduled successfully",
      });

      // Close the appointment details dialog
      onOpenChange(false);

      // Notify parent component to refresh appointments
      if (onAppointmentUpdated) {
        onAppointmentUpdated();
      }
    } catch (error) {
      console.error("Error confirming reschedule:", error);
      toast({
        title: t("confirmError") || "Error",
        description:
          typeof error === "string"
            ? error
            : (error as Error).message ||
              t("confirmErrorMessage") ||
              "Failed to confirm the reschedule",
        variant: "destructive",
      });
    } finally {
      setIsConfirmingReschedule(false);
    }
  };

  // Handler for declining a reschedule request
  const handleDeclineReschedule = async () => {
    if (!appointment || !workspaceProfile?.id) return;

    setIsDecliningReschedule(true);
    try {
      // Get the auth token
      let token;
      try {
        token = await getAuthToken();
      } catch (authError) {
        console.error("Error getting auth token:", authError);
        toast({
          title: t("declineError") || "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        setIsDecliningReschedule(false);
        return;
      }

      const response = await fetch("/api/appointments/decline-reschedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          workspaceId: workspaceProfile.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to decline reschedule");
      }

      toast({
        title: t("rescheduleDeclineSuccess") || "Reschedule Declined",
        description:
          t("rescheduleDeclineSuccessMessage") ||
          "The reschedule request has been declined",
      });

      // Close the appointment details dialog
      onOpenChange(false);

      // Notify parent component to refresh appointments
      if (onAppointmentUpdated) {
        onAppointmentUpdated();
      }
    } catch (error) {
      console.error("Error declining reschedule:", error);
      toast({
        title: t("declineError") || "Error",
        description:
          typeof error === "string"
            ? error
            : (error as Error).message ||
              t("declineErrorMessage") ||
              "Failed to decline the reschedule",
        variant: "destructive",
      });
    } finally {
      setIsDecliningReschedule(false);
    }
  };

  // Handler for confirm action
  const handleConfirm = async () => {
    if (!appointment || !workspaceProfile?.id) return;

    setIsConfirming(true);
    try {
      // Get the auth token
      let token;
      try {
        token = await getAuthToken();
      } catch (authError) {
        console.error("Error getting auth token:", authError);
        toast({
          title: t("confirmError") || "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        setIsConfirming(false);
        return;
      }

      const response = await fetch("/api/appointments/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          workspaceId: workspaceProfile.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm appointment");
      }

      toast({
        title: t("confirmSuccess") || "Appointment Confirmed",
        description:
          t("confirmSuccessMessage") ||
          "The appointment has been confirmed successfully",
      });

      // Close the appointment details dialog
      onOpenChange(false);

      // Notify parent component to refresh appointments
      if (onAppointmentUpdated) {
        onAppointmentUpdated();
      }
    } catch (error) {
      console.error("Error confirming appointment:", error);
      toast({
        title: t("confirmError") || "Error",
        description:
          typeof error === "string"
            ? error
            : (error as Error).message ||
              t("confirmErrorMessage") ||
              "Failed to confirm the appointment",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // Open the cancel confirmation dialog
  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  // Cancel the appointment
  const handleCancelConfirm = async () => {
    if (!appointment || !workspaceProfile?.id) return;

    setIsCancelling(true);
    try {
      // Get the auth token
      let token;
      try {
        token = await getAuthToken();
      } catch (authError) {
        console.error("Error getting auth token:", authError);
        toast({
          title: t("cancelError") || "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        setIsCancelling(false);
        return;
      }

      const response = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          workspaceId: workspaceProfile.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel appointment");
      }

      toast({
        title: t("cancelSuccess") || "Appointment Cancelled",
        description:
          t("cancelSuccessMessage") ||
          "The appointment has been cancelled successfully",
      });

      // Close the cancel dialog
      setShowCancelDialog(false);

      // Close the appointment details dialog
      onOpenChange(false);

      // Notify parent component to refresh appointments
      if (onAppointmentUpdated) {
        onAppointmentUpdated();
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast({
        title: t("cancelError") || "Error",
        description:
          typeof error === "string"
            ? error
            : (error as Error).message ||
              t("cancelErrorMessage") ||
              "Failed to cancel the appointment",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Cast appointment to ExtendedAppointment to access metadata
  const extendedAppointment = appointment as ExtendedAppointment;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {/* Reschedule Dialog */}
          <RescheduleAppointmentDialog
            appointment={appointment}
            open={showRescheduleDialog}
            onOpenChange={setShowRescheduleDialog}
            onRescheduleComplete={() => {
              if (onAppointmentUpdated) {
                onAppointmentUpdated();
              }
            }}
            teamMembers={allTeamMembers}
          />
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
                {appointment.status ? t(appointment.status) : t("confirmed")}
              </Badge>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium">{t("preference")}:</span>
              <span className="col-span-3">
                {appointment.anyAvailableTeamMember ? (
                  <Badge variant="secondary" className="mr-2">
                    {t("anyAvailableStaff")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mr-2">
                    {t("specificStaff")}
                  </Badge>
                )}
              </span>
            </div>

            {appointment.price !== undefined && (
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-sm font-medium">{t("price")}:</span>
                <span className="col-span-3">
                  ${appointment.price.toFixed(2)}
                  {appointment.paymentStatus && (
                    <Badge variant="outline" className="ml-2">
                      {t(`${appointment.paymentStatus}`)}
                    </Badge>
                  )}
                </span>
              </div>
            )}

            {appointment.notes && (
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-sm font-medium">{t("notes")}:</span>
                <span className="col-span-3">{appointment.notes}</span>
              </div>
            )}

            {appointment.customerNotes && (
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-sm font-medium">
                  {t("customerNotes")}:
                </span>
                <span className="col-span-3">{appointment.customerNotes}</span>
              </div>
            )}

            {appointment.internalNotes && (
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-sm font-medium">
                  {t("internalNotes")}:
                </span>
                <span className="col-span-3">{appointment.internalNotes}</span>
              </div>
            )}

            {/* Show customer-initiated pending reschedule information if available */}
            {extendedAppointment.metadata?.pending_reschedule && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="font-medium text-sm mb-2">
                  {t("pendingReschedule") ||
                    "Pending Customer Reschedule Request"}
                </h4>
                <div className="grid grid-cols-4 items-center gap-2 text-sm">
                  <span className="font-medium">{t("newDate")}:</span>
                  <span className="col-span-3">
                    {format(
                      parseISO(
                        extendedAppointment.metadata.pending_reschedule.new_date
                      ),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-4 items-center gap-2 text-sm">
                  <span className="font-medium">{t("newTime")}:</span>
                  <span className="col-span-3">
                    {extendedAppointment.metadata.pending_reschedule.new_time} -{" "}
                    {
                      extendedAppointment.metadata.pending_reschedule
                        .new_end_time
                    }
                  </span>
                </div>
                <div className="flex justify-between mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={handleDeclineReschedule}
                    disabled={isDecliningReschedule || isConfirmingReschedule}
                  >
                    {isDecliningReschedule ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        {t("declining") || "Declining..."}
                      </>
                    ) : (
                      t("decline") || "Decline"
                    )}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-black hover:bg-gray-800 text-white"
                    onClick={handleConfirmReschedule}
                    disabled={isDecliningReschedule || isConfirmingReschedule}
                  >
                    {isConfirmingReschedule ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        {t("confirming") || "Confirming..."}
                      </>
                    ) : (
                      t("confirm") || "Confirm"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Show workspace-initiated pending reschedule information if available */}
            {extendedAppointment.metadata?.workspace_pending_reschedule && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-sm mb-2">
                  {t("workspacePendingReschedule") ||
                    "Pending Workspace Reschedule Request"}
                </h4>
                <div className="grid grid-cols-4 items-center gap-2 text-sm">
                  <span className="font-medium">{t("newDate")}:</span>
                  <span className="col-span-3">
                    {format(
                      parseISO(
                        extendedAppointment.metadata
                          .workspace_pending_reschedule.new_date
                      ),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-4 items-center gap-2 text-sm">
                  <span className="font-medium">{t("newTime")}:</span>
                  <span className="col-span-3">
                    {
                      extendedAppointment.metadata.workspace_pending_reschedule
                        .new_time
                    }{" "}
                    -{" "}
                    {
                      extendedAppointment.metadata.workspace_pending_reschedule
                        .new_end_time
                    }
                  </span>
                </div>
                <div className="grid grid-cols-4 items-center gap-2 text-sm">
                  <span className="font-medium">{t("requestedAt")}:</span>
                  <span className="col-span-3">
                    {format(
                      parseISO(
                        extendedAppointment.metadata
                          .workspace_pending_reschedule.initiated_at
                      ),
                      "MMM d, yyyy h:mm a"
                    )}
                  </span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>
                    {t("workspaceRescheduleNote") ||
                      "Waiting for customer confirmation"}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between mt-4">
            {/* Only show action buttons for non-cancelled appointments */}
            {appointment.status !== "cancelled" ? (
              <>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={handleCancelClick}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("cancelling") || "Cancelling..."}
                    </>
                  ) : (
                    t("cancel")
                  )}
                </Button>
                <Button variant="outline" onClick={handleReschedule}>
                  {t("reschedule")}
                </Button>
                {/* Show confirm button only for pending appointments */}
                {appointment.status === "pending" && (
                  <Button
                    variant="default"
                    className="bg-black hover:bg-gray-800 text-white"
                    onClick={handleConfirm}
                    disabled={isConfirming}
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("confirming") || "Confirming..."}
                      </>
                    ) : (
                      t("confirm") || "Confirm"
                    )}
                  </Button>
                )}
              </>
            ) : (
              <div className="w-full text-center text-sm text-muted-foreground">
                {t("cancelled")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("cancelConfirmTitle") || "Cancel Appointment"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelConfirmMessage") ||
                "Are you sure you want to cancel this appointment? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              {t("cancelConfirmNo") || "No, keep appointment"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={isCancelling}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("cancelling") || "Cancelling..."}
                </>
              ) : (
                t("cancelConfirmYes") || "Yes, cancel appointment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

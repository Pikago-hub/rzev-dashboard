"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getAuthToken } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";

interface RescheduleNotificationProps {
  appointment: {
    id: string;
    customerName: string;
    date: string;
    time: string;
    metadata?: {
      pending_reschedule?: {
        new_date: string;
        new_time: string;
        new_end_time: string;
        team_member_id?: string;
        team_member_preference?: string;
      };
      reschedule_history?: Array<{
        status: string;
        requested_at?: string;
        confirmed_at?: string;
        rejected_at?: string;
        notes?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
  };
  onActionComplete: () => void;
}

export function RescheduleNotification({
  appointment,
  onActionComplete,
}: RescheduleNotificationProps) {
  const t = useTranslations("dashboard.notifications");
  const { toast } = useToast();
  const { workspaceProfile } = useWorkspace();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  if (!appointment.metadata?.pending_reschedule) {
    return null;
  }

  const pendingReschedule = appointment.metadata.pending_reschedule;
  const newDate = pendingReschedule.new_date;
  const newTime = pendingReschedule.new_time;

  // Use parseISO to correctly parse the ISO date string without timezone issues
  const formattedNewDate = format(parseISO(newDate), "MMM d, yyyy");
  const formattedNewTime = newTime;

  const handleConfirm = async () => {
    if (!appointment || !workspaceProfile?.id) return;

    setIsConfirming(true);
    try {
      // Get the auth token
      const token = await getAuthToken();

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
        title: t("rescheduleConfirmed"),
        description: t("rescheduleConfirmedMessage"),
      });

      onActionComplete();
    } catch (error) {
      console.error("Error confirming reschedule:", error);
      toast({
        title: t("error"),
        description:
          typeof error === "string" ? error : (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDecline = async () => {
    if (!appointment || !workspaceProfile?.id) return;

    setIsDeclining(true);
    try {
      // Get the auth token
      const token = await getAuthToken();

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
        title: t("rescheduleDeclined"),
        description: t("rescheduleDeclinedMessage"),
      });

      onActionComplete();
    } catch (error) {
      console.error("Error declining reschedule:", error);
      toast({
        title: t("error"),
        description:
          typeof error === "string" ? error : (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div className="p-2 space-y-2">
      <p className="text-sm">
        {t("rescheduleRequest", { customer: appointment.customerName })}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("newDateTime", { date: formattedNewDate, time: formattedNewTime })}
      </p>
      <div className="flex gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8"
          onClick={handleDecline}
          disabled={isDeclining || isConfirming}
        >
          {isDeclining ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : null}
          {t("decline")}
        </Button>
        <Button
          variant="default"
          size="sm"
          className="flex-1 h-8"
          onClick={handleConfirm}
          disabled={isDeclining || isConfirming}
        >
          {isConfirming ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : null}
          {t("confirm")}
        </Button>
      </div>
    </div>
  );
}

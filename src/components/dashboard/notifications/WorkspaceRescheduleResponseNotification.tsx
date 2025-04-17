"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Check, X } from "lucide-react";

interface WorkspaceRescheduleResponseNotificationProps {
  appointment: {
    id: string;
    customerName: string;
    date: string;
    time: string;
    metadata?: {
      workspace_reschedule_action?: {
        action: "confirmed" | "declined";
        timestamp: string;
        reschedule_id: string;
      };
      current_reschedule?: {
        initiated_at: string;
        initiated_by: string;
        previous_date: string;
        previous_time: string;
        reschedule_id: string;
      };
      reschedule_history?: Array<{
        status: string;
        new_date?: string;
        new_time?: string;
        initiated_at?: string;
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

export function WorkspaceRescheduleResponseNotification({
  appointment,
  onActionComplete,
}: WorkspaceRescheduleResponseNotificationProps) {
  const t = useTranslations("dashboard.notifications");
  const { toast } = useToast();
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Check if we have the necessary metadata
  if (!appointment.metadata?.workspace_reschedule_action) {
    return null;
  }

  const rescheduleAction = appointment.metadata.workspace_reschedule_action;
  const isConfirmed = rescheduleAction.action === "confirmed";
  const timestamp = rescheduleAction.timestamp;
  
  // Find the corresponding reschedule entry in history
  const rescheduleHistory = appointment.metadata.reschedule_history || [];
  const rescheduleEntry = rescheduleHistory.find(
    (entry) => entry.reschedule_id === rescheduleAction.reschedule_id
  );

  // Format the response time
  const responseTime = timestamp ? format(parseISO(timestamp), "MMM d, yyyy 'at' h:mm a") : "";
  
  // Get the new date and time if available
  const newDate = rescheduleEntry?.new_date;
  const newTime = rescheduleEntry?.new_time;
  const formattedNewDate = newDate ? format(parseISO(newDate), "MMM d, yyyy") : "";
  const formattedNewTime = newTime || "";

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      // Here you would typically update the appointment to clear the workspace_reschedule_action
      // For now, we'll just acknowledge it client-side
      toast({
        title: isConfirmed ? t("rescheduleCustomerConfirmed") : t("rescheduleCustomerDeclined"),
        description: isConfirmed 
          ? t("rescheduleCustomerConfirmedMessage") 
          : t("rescheduleCustomerDeclinedMessage"),
      });
      
      // Call the onActionComplete callback to remove the notification
      onActionComplete();
    } catch (error) {
      console.error("Error acknowledging reschedule response:", error);
      toast({
        title: t("error"),
        description: t("errorAcknowledgingResponse"),
        variant: "destructive",
      });
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center gap-2">
        {isConfirmed ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <X className="h-4 w-4 text-red-500" />
        )}
        <p className="text-sm font-medium">
          {isConfirmed 
            ? t("rescheduleCustomerConfirmedTitle", { customer: appointment.customerName }) 
            : t("rescheduleCustomerDeclinedTitle", { customer: appointment.customerName })}
        </p>
      </div>
      
      {isConfirmed && newDate && newTime && (
        <p className="text-xs text-muted-foreground">
          {t("confirmedDateTime", { date: formattedNewDate, time: formattedNewTime })}
        </p>
      )}
      
      <p className="text-xs text-muted-foreground">
        {t("responseTime", { time: responseTime })}
      </p>
      
      <div className="flex justify-end mt-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={handleAcknowledge}
          disabled={isAcknowledging}
        >
          {t("acknowledge")}
        </Button>
      </div>
    </div>
  );
}

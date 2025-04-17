"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/workspace-context";
import { useWorkspaceAppointments } from "@/hooks/use-realtime-appointments";
import { RescheduleNotification } from "./RescheduleNotification";
import { WorkspaceRescheduleResponseNotification } from "./WorkspaceRescheduleResponseNotification";
import { getAuthToken } from "@/lib/auth-context";

interface Notification {
  id: string;
  type:
    | "reschedule"
    | "workspace_reschedule_response"
    | "new_booking"
    | "other";
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
        requested_at?: string;
        confirmed_at?: string;
        rejected_at?: string;
        notes?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
  };
  read: boolean;
  createdAt: string;
}

export function NotificationsDropdown() {
  const t = useTranslations("dashboard.notifications");
  const { workspaceProfile } = useWorkspace();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!workspaceProfile?.id) return;

      try {
        const token = await getAuthToken();
        const response = await fetch(
          `/api/appointments/pending-reschedules?workspaceId=${workspaceProfile.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }

        const data = await response.json();

        // Transform appointments with pending_reschedule into notifications
        type AppointmentData = {
          id: string;
          customer_name: string;
          date: string;
          start_time: string;
          updated_at: string;
          metadata?: {
            pending_reschedule?: {
              new_date: string;
              new_time: string;
              new_end_time: string;
              team_member_id?: string;
              team_member_preference?: string;
            };
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
              requested_at?: string;
              confirmed_at?: string;
              rejected_at?: string;
              notes?: string;
              [key: string]: unknown;
            }>;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        };

        const newNotifications = data.appointments.map(
          (appointment: AppointmentData) => ({
            id: `reschedule-${appointment.id}`,
            type: "reschedule" as const,
            appointment: {
              id: appointment.id,
              customerName: appointment.customer_name,
              date: appointment.date,
              time: appointment.start_time,
              metadata: appointment.metadata,
            },
            read: false,
            createdAt: appointment.updated_at,
          })
        );

        setNotifications(newNotifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    if (workspaceProfile?.id) {
      fetchNotifications();
    }
  }, [workspaceProfile?.id]);

  // Subscribe to real-time appointment updates
  useWorkspaceAppointments(workspaceProfile?.id, {
    onUpdate: (payload) => {
      // Type assertion for payload.new to ensure TypeScript recognizes the properties
      const newAppointment = payload.new as {
        id: string;
        workspace_id: string;
        team_member_id: string;
        service_id: string;
        service_variant_id: string;
        customer_id?: string;
        status: string;
        date: string;
        start_time: string;
        end_time: string;
        duration: number;
        customer_name?: string;
        customer_email?: string;
        customer_phone?: string;
        price?: number;
        payment_status?: string;
        stripe_payment_intent_id?: string;
        notes?: string;
        customer_notes?: string;
        internal_notes?: string;
        notification_status?: {
          [key: string]: unknown;
        };
        created_at?: string;
        updated_at?: string;
        cancelled_at?: string;
        metadata?: {
          pending_reschedule?: {
            new_date: string;
            new_time: string;
            new_end_time: string;
            team_member_id?: string;
            team_member_preference?: string;
          };
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
            requested_at?: string;
            confirmed_at?: string;
            rejected_at?: string;
            notes?: string;
            [key: string]: unknown;
          }>;
          [key: string]: unknown;
        };
      };

      const oldAppointment = payload.old as
        | Partial<typeof newAppointment>
        | undefined;

      // Check if this is a reschedule request
      if (
        newAppointment.metadata?.pending_reschedule &&
        newAppointment.status === "pending"
      ) {
        // Check if we already have this notification
        const existingNotificationIndex = notifications.findIndex(
          (n) =>
            n.appointment.id === newAppointment.id && n.type === "reschedule"
        );

        if (existingNotificationIndex >= 0) {
          // Update existing notification
          const updatedNotifications = [...notifications];
          updatedNotifications[existingNotificationIndex] = {
            ...updatedNotifications[existingNotificationIndex],
            appointment: {
              id: newAppointment.id,
              customerName: newAppointment.customer_name || "",
              date: newAppointment.date,
              time: newAppointment.start_time,
              metadata: newAppointment.metadata,
            },
            read: false,
            createdAt: newAppointment.updated_at || new Date().toISOString(),
          };
          setNotifications(updatedNotifications);
        } else {
          // Add new notification
          setNotifications((prev) => [
            {
              id: `reschedule-${newAppointment.id}`,
              type: "reschedule",
              appointment: {
                id: newAppointment.id,
                customerName: newAppointment.customer_name || "",
                date: newAppointment.date,
                time: newAppointment.start_time,
                metadata: newAppointment.metadata,
              },
              read: false,
              createdAt: newAppointment.updated_at || new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      }
      // Check if this is a workspace reschedule response (customer confirmed or declined)
      else if (newAppointment.metadata?.workspace_reschedule_action) {
        // Check if we already have this notification
        const existingNotificationIndex = notifications.findIndex(
          (n) =>
            n.appointment.id === newAppointment.id &&
            n.type === "workspace_reschedule_response"
        );

        // Get the action (confirmed or declined)
        const action =
          newAppointment.metadata.workspace_reschedule_action.action;

        if (existingNotificationIndex >= 0) {
          // Update existing notification
          const updatedNotifications = [...notifications];
          updatedNotifications[existingNotificationIndex] = {
            ...updatedNotifications[existingNotificationIndex],
            appointment: {
              id: newAppointment.id,
              customerName: newAppointment.customer_name || "",
              date: newAppointment.date,
              time: newAppointment.start_time,
              metadata: newAppointment.metadata,
            },
            read: false,
            createdAt: newAppointment.updated_at || new Date().toISOString(),
          };
          setNotifications(updatedNotifications);
        } else {
          // Add new notification
          setNotifications((prev) => [
            {
              id: `workspace-reschedule-response-${newAppointment.id}-${action}`,
              type: "workspace_reschedule_response",
              appointment: {
                id: newAppointment.id,
                customerName: newAppointment.customer_name || "",
                date: newAppointment.date,
                time: newAppointment.start_time,
                metadata: newAppointment.metadata,
              },
              read: false,
              createdAt: newAppointment.updated_at || new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      }
      // Remove notification if reschedule was handled
      else if (
        !newAppointment.metadata?.pending_reschedule &&
        oldAppointment?.metadata?.pending_reschedule
      ) {
        setNotifications((prev) =>
          prev.filter(
            (n) =>
              n.appointment.id !== newAppointment.id || n.type !== "reschedule"
          )
        );
      }
      // Remove workspace reschedule response notification if it was acknowledged
      else if (
        !newAppointment.metadata?.workspace_reschedule_action &&
        oldAppointment?.metadata?.workspace_reschedule_action
      ) {
        setNotifications((prev) =>
          prev.filter(
            (n) =>
              n.appointment.id !== newAppointment.id ||
              n.type !== "workspace_reschedule_response"
          )
        );
      }
    },
  });

  const handleActionComplete = (appointmentId: string) => {
    // Remove the notification after action is completed
    setNotifications((prev) =>
      prev.filter((n) => n.appointment.id !== appointmentId)
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">{t("title")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>{t("title")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-2 px-4 text-sm text-center text-muted-foreground">
            {t("noNotifications")}
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="p-0 focus:bg-transparent"
            >
              {notification.type === "reschedule" && (
                <RescheduleNotification
                  appointment={notification.appointment}
                  onActionComplete={() =>
                    handleActionComplete(notification.appointment.id)
                  }
                />
              )}
              {notification.type === "workspace_reschedule_response" && (
                <WorkspaceRescheduleResponseNotification
                  appointment={notification.appointment}
                  onActionComplete={() =>
                    handleActionComplete(notification.appointment.id)
                  }
                />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

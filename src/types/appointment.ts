// src/types/appointment.ts
export interface Appointment {
  id: string;
  workspace_id: string;
  team_member_id: string;
  service_id: string;
  service_variant_id: string;
  customer_id?: string;

  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  date: string; // ISO format date
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  duration: number; // minutes

  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;

  price?: number;
  payment_status?: "unpaid" | "pending" | "paid" | "refunded" | "failed";
  stripe_payment_intent_id?: string;

  notes?: string;
  customer_notes?: string;
  internal_notes?: string;

  notification_status?: {
    confirmation_sent?: boolean;
    reminder_sent?: boolean;
    // Add other notification statuses as needed
  };

  created_at: string; // ISO format datetime
  updated_at: string; // ISO format datetime
  cancelled_at?: string; // ISO format datetime

  metadata?: Record<string, string | number | boolean | null | undefined>;
}

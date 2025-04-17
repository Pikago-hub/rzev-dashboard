import { createBrowserClient } from "@/lib/supabase";
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Type for appointment changes
export type AppointmentChange = RealtimePostgresChangesPayload<{
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
  notification_status?: unknown;
  created_at?: string;
  updated_at?: string;
  cancelled_at?: string;
  metadata?: Record<string, unknown>;
}>;

// Store active channels to prevent duplicate subscriptions
const activeChannels: Map<string, RealtimeChannel> = new Map();

/**
 * Subscribe to appointment changes for a specific workspace
 * @param workspaceId The workspace ID to subscribe to
 * @param callbacks Object containing callback functions for different change types
 * @returns A function to unsubscribe from the channel
 */
export function subscribeToWorkspaceAppointments(
  workspaceId: string,
  callbacks: {
    onInsert?: (payload: AppointmentChange) => void;
    onUpdate?: (payload: AppointmentChange) => void;
    onDelete?: (payload: AppointmentChange) => void;
    onAll?: (payload: AppointmentChange) => void;
  }
) {
  const supabase = createBrowserClient();
  const channelKey = `appointments:workspace:${workspaceId}`;

  // Check if we already have an active channel for this workspace
  if (activeChannels.has(channelKey)) {
    console.log(`Already subscribed to ${channelKey}`);
    return () => unsubscribeFromChannel(channelKey);
  }

  // Create a new channel
  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "*", // Listen to all events (insert, update, delete)
        schema: "public",
        table: "appointments",
        filter: `workspace_id=eq.${workspaceId}`,
      },
      (payload) => {
        // Call the appropriate callback based on the event type
        const typedPayload = payload as AppointmentChange;
        
        // Always call the onAll callback if provided
        if (callbacks.onAll) {
          callbacks.onAll(typedPayload);
        }

        // Call the specific event callback if provided
        switch (payload.eventType) {
          case "INSERT":
            if (callbacks.onInsert) callbacks.onInsert(typedPayload);
            break;
          case "UPDATE":
            if (callbacks.onUpdate) callbacks.onUpdate(typedPayload);
            break;
          case "DELETE":
            if (callbacks.onDelete) callbacks.onDelete(typedPayload);
            break;
        }
      }
    )
    .subscribe((status) => {
      console.log(`Subscription to ${channelKey} status:`, status);
    });

  // Store the channel for later reference
  activeChannels.set(channelKey, channel);

  // Return a function to unsubscribe
  return () => unsubscribeFromChannel(channelKey);
}

/**
 * Subscribe to appointment changes for a specific customer
 * @param customerId The customer ID to subscribe to
 * @param callbacks Object containing callback functions for different change types
 * @returns A function to unsubscribe from the channel
 */
export function subscribeToCustomerAppointments(
  customerId: string,
  callbacks: {
    onInsert?: (payload: AppointmentChange) => void;
    onUpdate?: (payload: AppointmentChange) => void;
    onDelete?: (payload: AppointmentChange) => void;
    onAll?: (payload: AppointmentChange) => void;
  }
) {
  const supabase = createBrowserClient();
  const channelKey = `appointments:customer:${customerId}`;

  // Check if we already have an active channel for this customer
  if (activeChannels.has(channelKey)) {
    console.log(`Already subscribed to ${channelKey}`);
    return () => unsubscribeFromChannel(channelKey);
  }

  // Create a new channel
  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "*", // Listen to all events (insert, update, delete)
        schema: "public",
        table: "appointments",
        filter: `customer_id=eq.${customerId}`,
      },
      (payload) => {
        // Call the appropriate callback based on the event type
        const typedPayload = payload as AppointmentChange;
        
        // Always call the onAll callback if provided
        if (callbacks.onAll) {
          callbacks.onAll(typedPayload);
        }

        // Call the specific event callback if provided
        switch (payload.eventType) {
          case "INSERT":
            if (callbacks.onInsert) callbacks.onInsert(typedPayload);
            break;
          case "UPDATE":
            if (callbacks.onUpdate) callbacks.onUpdate(typedPayload);
            break;
          case "DELETE":
            if (callbacks.onDelete) callbacks.onDelete(typedPayload);
            break;
        }
      }
    )
    .subscribe((status) => {
      console.log(`Subscription to ${channelKey} status:`, status);
    });

  // Store the channel for later reference
  activeChannels.set(channelKey, channel);

  // Return a function to unsubscribe
  return () => unsubscribeFromChannel(channelKey);
}

/**
 * Subscribe to appointment changes for a specific team member
 * @param teamMemberId The team member ID to subscribe to
 * @param callbacks Object containing callback functions for different change types
 * @returns A function to unsubscribe from the channel
 */
export function subscribeToTeamMemberAppointments(
  teamMemberId: string,
  callbacks: {
    onInsert?: (payload: AppointmentChange) => void;
    onUpdate?: (payload: AppointmentChange) => void;
    onDelete?: (payload: AppointmentChange) => void;
    onAll?: (payload: AppointmentChange) => void;
  }
) {
  const supabase = createBrowserClient();
  const channelKey = `appointments:team_member:${teamMemberId}`;

  // Check if we already have an active channel for this team member
  if (activeChannels.has(channelKey)) {
    console.log(`Already subscribed to ${channelKey}`);
    return () => unsubscribeFromChannel(channelKey);
  }

  // Create a new channel
  const channel = supabase
    .channel(channelKey)
    .on(
      "postgres_changes",
      {
        event: "*", // Listen to all events (insert, update, delete)
        schema: "public",
        table: "appointments",
        filter: `team_member_id=eq.${teamMemberId}`,
      },
      (payload) => {
        // Call the appropriate callback based on the event type
        const typedPayload = payload as AppointmentChange;
        
        // Always call the onAll callback if provided
        if (callbacks.onAll) {
          callbacks.onAll(typedPayload);
        }

        // Call the specific event callback if provided
        switch (payload.eventType) {
          case "INSERT":
            if (callbacks.onInsert) callbacks.onInsert(typedPayload);
            break;
          case "UPDATE":
            if (callbacks.onUpdate) callbacks.onUpdate(typedPayload);
            break;
          case "DELETE":
            if (callbacks.onDelete) callbacks.onDelete(typedPayload);
            break;
        }
      }
    )
    .subscribe((status) => {
      console.log(`Subscription to ${channelKey} status:`, status);
    });

  // Store the channel for later reference
  activeChannels.set(channelKey, channel);

  // Return a function to unsubscribe
  return () => unsubscribeFromChannel(channelKey);
}

/**
 * Unsubscribe from a specific channel
 * @param channelKey The key of the channel to unsubscribe from
 */
function unsubscribeFromChannel(channelKey: string) {
  const channel = activeChannels.get(channelKey);
  if (channel) {
    const supabase = createBrowserClient();
    supabase.removeChannel(channel);
    activeChannels.delete(channelKey);
    console.log(`Unsubscribed from ${channelKey}`);
  }
}

/**
 * Unsubscribe from all active channels
 */
export function unsubscribeFromAllChannels() {
  const supabase = createBrowserClient();
  activeChannels.forEach((channel, key) => {
    supabase.removeChannel(channel);
    console.log(`Unsubscribed from ${key}`);
  });
  activeChannels.clear();
}

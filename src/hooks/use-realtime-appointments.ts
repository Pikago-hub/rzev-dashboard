import { useEffect, useState } from 'react';
import { 
  subscribeToWorkspaceAppointments, 
  subscribeToCustomerAppointments,
  subscribeToTeamMemberAppointments,
  AppointmentChange 
} from '@/lib/realtime';

type AppointmentChangeHandler = (payload: AppointmentChange) => void;

interface UseRealtimeAppointmentsOptions {
  onInsert?: AppointmentChangeHandler;
  onUpdate?: AppointmentChangeHandler;
  onDelete?: AppointmentChangeHandler;
  onAll?: AppointmentChangeHandler;
}

/**
 * Hook to subscribe to real-time appointment changes for a workspace
 */
export function useWorkspaceAppointments(
  workspaceId: string | undefined,
  options: UseRealtimeAppointmentsOptions = {}
) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastChange, setLastChange] = useState<AppointmentChange | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const handleChange = (payload: AppointmentChange) => {
      setLastChange(payload);
    };

    // Subscribe to real-time updates
    const unsubscribe = subscribeToWorkspaceAppointments(workspaceId, {
      onInsert: (payload) => {
        handleChange(payload);
        if (options.onInsert) options.onInsert(payload);
      },
      onUpdate: (payload) => {
        handleChange(payload);
        if (options.onUpdate) options.onUpdate(payload);
      },
      onDelete: (payload) => {
        handleChange(payload);
        if (options.onDelete) options.onDelete(payload);
      },
      onAll: options.onAll,
    });

    setIsSubscribed(true);

    // Clean up subscription when component unmounts
    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [workspaceId, options]);

  return { isSubscribed, lastChange };
}

/**
 * Hook to subscribe to real-time appointment changes for a customer
 */
export function useCustomerAppointments(
  customerId: string | undefined,
  options: UseRealtimeAppointmentsOptions = {}
) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastChange, setLastChange] = useState<AppointmentChange | null>(null);

  useEffect(() => {
    if (!customerId) return;

    const handleChange = (payload: AppointmentChange) => {
      setLastChange(payload);
    };

    // Subscribe to real-time updates
    const unsubscribe = subscribeToCustomerAppointments(customerId, {
      onInsert: (payload) => {
        handleChange(payload);
        if (options.onInsert) options.onInsert(payload);
      },
      onUpdate: (payload) => {
        handleChange(payload);
        if (options.onUpdate) options.onUpdate(payload);
      },
      onDelete: (payload) => {
        handleChange(payload);
        if (options.onDelete) options.onDelete(payload);
      },
      onAll: options.onAll,
    });

    setIsSubscribed(true);

    // Clean up subscription when component unmounts
    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [customerId, options]);

  return { isSubscribed, lastChange };
}

/**
 * Hook to subscribe to real-time appointment changes for a team member
 */
export function useTeamMemberAppointments(
  teamMemberId: string | undefined,
  options: UseRealtimeAppointmentsOptions = {}
) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastChange, setLastChange] = useState<AppointmentChange | null>(null);

  useEffect(() => {
    if (!teamMemberId) return;

    const handleChange = (payload: AppointmentChange) => {
      setLastChange(payload);
    };

    // Subscribe to real-time updates
    const unsubscribe = subscribeToTeamMemberAppointments(teamMemberId, {
      onInsert: (payload) => {
        handleChange(payload);
        if (options.onInsert) options.onInsert(payload);
      },
      onUpdate: (payload) => {
        handleChange(payload);
        if (options.onUpdate) options.onUpdate(payload);
      },
      onDelete: (payload) => {
        handleChange(payload);
        if (options.onDelete) options.onDelete(payload);
      },
      onAll: options.onAll,
    });

    setIsSubscribed(true);

    // Clean up subscription when component unmounts
    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [teamMemberId, options]);

  return { isSubscribed, lastChange };
}

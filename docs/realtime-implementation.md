# Real-Time Communication Implementation Guide

This guide explains how to implement real-time communication between the dashboard app and customer-facing app using Supabase's real-time features.

## Overview

Supabase's real-time functionality allows both applications to:
- Receive instant updates when appointments are created, updated, or deleted
- Maintain synchronized data across both applications
- Provide a better user experience with live updates

## Database Setup

### 1. Enable Real-Time for the Appointments Table

The appointments table has been added to the `supabase_realtime` publication:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
```

### 2. Row Level Security (RLS) Policies

The following RLS policies have been created to ensure proper security:

#### SELECT Policies (Already Existed)
- `Customers can view their own appointments`: Allows customers to view only their own appointments
- `Workspace members can view their workspace appointments`: Allows workspace members to view appointments for their workspace

#### INSERT Policies (Newly Added)
- `Customers can create their own appointments`: Allows customers to create appointments where they are the customer
- `Workspace members can create appointments for their workspace`: Allows workspace members to create appointments for their workspace

#### UPDATE Policies (Newly Added)
- `Customers can update their own appointments`: Allows customers to update only their own appointments
- `Workspace members can update appointments for their workspace`: Allows workspace members to update appointments for their workspace

#### DELETE Policies (Newly Added)
- `Customers can delete their own appointments`: Allows customers to delete only their own appointments
- `Workspace members can delete appointments for their workspace`: Allows workspace members to delete appointments for their workspace

## Dashboard App Implementation

### 1. Real-Time Utility Functions

The dashboard app includes a utility file (`src/lib/realtime.ts`) with functions for subscribing to real-time updates:

- `subscribeToWorkspaceAppointments`: Subscribe to appointment changes for a specific workspace
- `subscribeToCustomerAppointments`: Subscribe to appointment changes for a specific customer
- `subscribeToTeamMemberAppointments`: Subscribe to appointment changes for a specific team member

### 2. React Hooks for Easy Integration

Custom hooks (`src/hooks/use-realtime-appointments.ts`) make it easy to integrate real-time functionality into components:

- `useWorkspaceAppointments`: Hook for workspace-level appointment subscriptions
- `useCustomerAppointments`: Hook for customer-level appointment subscriptions
- `useTeamMemberAppointments`: Hook for team member-level appointment subscriptions

### 3. Example Component

An example component (`src/components/dashboard/appointments/real-time-appointments.tsx`) demonstrates how to use real-time subscriptions to display recent changes.

### 4. Usage Example

```tsx
import { useWorkspaceAppointments } from '@/hooks/use-realtime-appointments';
import { useToast } from '@/components/ui/use-toast';

function AppointmentCalendar({ workspaceId }) {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState([]);
  
  // Fetch initial appointments data
  useEffect(() => {
    // Fetch appointments from API
  }, [workspaceId]);
  
  // Subscribe to real-time updates
  useWorkspaceAppointments(workspaceId, {
    onInsert: (payload) => {
      // Add the new appointment to the state
      setAppointments(prev => [...prev, payload.new]);
      toast({
        title: 'New Appointment',
        description: `${payload.new.customer_name} at ${payload.new.start_time}`,
      });
    },
    onUpdate: (payload) => {
      // Update the appointment in the state
      setAppointments(prev => 
        prev.map(apt => apt.id === payload.new.id ? payload.new : apt)
      );
    },
    onDelete: (payload) => {
      // Remove the appointment from the state
      setAppointments(prev => 
        prev.filter(apt => apt.id !== payload.old.id)
      );
    },
  });
  
  return (
    // Render appointments
  );
}
```

## Customer-Facing App Implementation

For the customer-facing app, you should implement similar functionality:

### 1. Copy the Real-Time Utility Functions

Copy the `realtime.ts` file to your customer-facing app and adapt it as needed.

### 2. Create Similar React Hooks

Create similar hooks for the customer-facing app, focusing on customer-specific subscriptions.

### 3. Implement Real-Time Updates in Key Components

Add real-time subscriptions to components that display appointment information:

```tsx
import { useCustomerAppointments } from '@/hooks/use-realtime-appointments';

function CustomerAppointments({ customerId }) {
  const [appointments, setAppointments] = useState([]);
  
  // Fetch initial appointments data
  useEffect(() => {
    // Fetch appointments from API
  }, [customerId]);
  
  // Subscribe to real-time updates
  useCustomerAppointments(customerId, {
    onInsert: (payload) => {
      // Add the new appointment to the state
      setAppointments(prev => [...prev, payload.new]);
    },
    onUpdate: (payload) => {
      // Update the appointment in the state
      setAppointments(prev => 
        prev.map(apt => apt.id === payload.new.id ? payload.new : apt)
      );
    },
    onDelete: (payload) => {
      // Remove the appointment from the state
      setAppointments(prev => 
        prev.filter(apt => apt.id !== payload.old.id)
      );
    },
  });
  
  return (
    // Render appointments
  );
}
```

## Best Practices

1. **Unsubscribe When Components Unmount**: Always clean up subscriptions when components unmount to prevent memory leaks.

2. **Handle Connection Issues**: Implement error handling and reconnection logic for real-time subscriptions.

3. **Optimize Subscription Filters**: Use specific filters to minimize unnecessary updates.

4. **Combine with Initial Data Loading**: Always load initial data from the API, then use real-time updates to keep it synchronized.

5. **Update UI Efficiently**: When receiving real-time updates, update your UI state efficiently to avoid unnecessary re-renders.

6. **Security Considerations**: Ensure that your RLS policies are properly configured to prevent unauthorized access to data.

## Troubleshooting

1. **No Real-Time Updates**: Check that the table is added to the `supabase_realtime` publication and that RLS policies are correctly configured.

2. **Permission Errors**: Verify that your RLS policies are correctly set up for all operations (SELECT, INSERT, UPDATE, DELETE).

3. **Performance Issues**: If you experience performance issues, consider optimizing your subscription filters or implementing pagination.

4. **Connection Drops**: Implement reconnection logic to handle temporary connection issues.

## Additional Resources

- [Supabase Real-Time Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [React Hooks with Supabase](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

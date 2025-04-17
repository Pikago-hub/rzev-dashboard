export interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  workingHours: {
    start: string;
    end: string;
  };
  availabilities?: Availability[];
  operatingHours?: Record<string, { open: string; close: string }[]>;
}

export interface Appointment {
  id: string;
  teamMemberId: string;
  customerName: string;
  serviceName: string;
  date: Date; // Date of the appointment
  time: string; // Time in format "HH:MM"
  duration: number; // Duration in minutes
  status?: string; // Status of the appointment (pending, confirmed, cancelled, completed, no_show)
  anyAvailableTeamMember?: boolean; // Whether the customer requested any available team member
  teamMemberPreference?: string; // The team member preference: "specific" or "any"
  teamMemberName?: string; // Name of the team member
  color?: string; // Color of the service
  price?: number; // Price of the appointment
  paymentStatus?: string; // Payment status
  notes?: string; // General notes
  customerNotes?: string; // Notes from the customer
  internalNotes?: string; // Internal notes for staff only
}

export interface ProcessedAppointment extends Appointment {
  startMinutes: number;
  endMinutes: number;
}

export interface AppointmentDisplayInfo {
  top: string;
  height: string;
  isStart: boolean;
  isEnd: boolean;
  isFullAppointment: boolean;
}

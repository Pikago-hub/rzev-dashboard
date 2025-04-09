export interface TeamMember {
  id: string;
  name: string;
  role: string;
  workingHours: {
    start: string;
    end: string;
  };
}

export interface Appointment {
  id: string;
  teamMemberId: string;
  customerName: string;
  serviceName: string;
  date: Date; // Date of the appointment
  time: string; // Time in format "HH:MM"
  duration: number; // Duration in minutes
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

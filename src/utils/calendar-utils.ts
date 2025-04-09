/**
 * Format time slot for display (e.g., "09:00" to "9 AM")
 */
export const formatTimeDisplay = (timeSlot: string): string => {
  const [hour, minute] = timeSlot.split(":");
  const hourNum = parseInt(hour, 10);
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum % 12 || 12;
  return `${hour12}${minute !== "00" ? ":" + minute : ""} ${ampm}`;
};

/**
 * Format time for detailed display (e.g., "09:00" to "9:00 AM")
 */
export const formatTime = (timeStr: string): string => {
  const [hour, minute] = timeStr.split(":");
  const hourNum = parseInt(hour, 10);
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
};

/**
 * Format date for display (e.g., "Monday, January 1, 2023")
 * On smaller screens, it will use a shorter format
 */
export const formatDate = (date: Date): string => {
  // Check if we're in a browser environment
  if (typeof window !== "undefined") {
    // Use a shorter format for mobile devices
    if (window.innerWidth < 640) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Format date for short display (e.g., "Mon, Jan 1")
 */
export const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

/**
 * Get the start and end dates of a week given a date
 */
export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)

  const end = new Date(start);
  end.setDate(start.getDate() + 6); // End of week (Saturday)

  return { start, end };
};

/**
 * Format a date range for display (e.g., "January 1-7, 2023")
 * On smaller screens, it will use a shorter format
 */
export const formatDateRange = (start: Date, end: Date): string => {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  // Check if we're in a browser environment
  if (typeof window !== "undefined" && window.innerWidth < 640) {
    // Use a shorter format for mobile devices
    if (sameMonth && sameYear) {
      return `${start.toLocaleDateString("en-US", {
        month: "short",
      })} ${start.getDate()}-${end.getDate()}`;
    } else if (sameYear) {
      return `${start.toLocaleDateString("en-US", {
        month: "short",
      })} ${start.getDate()} - ${end.toLocaleDateString("en-US", {
        month: "short",
      })} ${end.getDate()}`;
    } else {
      return `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    }
  }

  // Default format for larger screens
  if (sameMonth && sameYear) {
    return `${start.toLocaleDateString("en-US", {
      month: "long",
    })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
  } else if (sameYear) {
    return `${start.toLocaleDateString("en-US", {
      month: "long",
    })} ${start.getDate()} - ${end.toLocaleDateString("en-US", {
      month: "long",
    })} ${end.getDate()}, ${start.getFullYear()}`;
  } else {
    return `${start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })} - ${end.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`;
  }
};

/**
 * Calculate end time based on start time and duration
 */
export const calculateEndTime = (
  startTime: string,
  durationMinutes: number
): string => {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;
  return `${endHour.toString().padStart(2, "0")}:${endMinute
    .toString()
    .padStart(2, "0")}`;
};

/**
 * Convert time string to minutes since midnight
 */
export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Generate time slots for a full day (12 AM to 12 PM)
 */
export const generateTimeSlots = (): string[] => {
  return Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });
};

/**
 * Filter time slots to only include hourly slots (ending with ":00")
 */
export const getHourlyTimeSlots = (timeSlots: string[]): string[] => {
  return timeSlots.filter((slot) => slot.endsWith("00"));
};

/**
 * Calculate the position and size of an appointment in the calendar grid
 */
export const calculateAppointmentDisplay = (
  appointment: { startMinutes: number; endMinutes: number; duration: number },
  hourStartMinutes: number
) => {
  // Only render the appointment in the hour where it starts
  if (
    Math.floor(appointment.startMinutes / 60) ===
    Math.floor(hourStartMinutes / 60)
  ) {
    const topOffset = ((appointment.startMinutes % 60) / 60) * 100;

    // Calculate the total height needed for the full duration
    const durationInHours = appointment.duration / 60;
    const heightPercentage = durationInHours * 100;

    return {
      top: `${topOffset}%`,
      height: `${heightPercentage}%`,
      isStart: true,
      isEnd: true,
      isFullAppointment: true,
    };
  }

  return null;
};

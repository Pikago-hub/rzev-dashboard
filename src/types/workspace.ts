import { AddressObject } from "./addressData";

export interface DayHours {
  open: string;
  close: string;
}

export interface OperatingHours {
  monday?: DayHours[] | null;
  tuesday?: DayHours[] | null;
  wednesday?: DayHours[] | null;
  thursday?: DayHours[] | null;
  friday?: DayHours[] | null;
  saturday?: DayHours[] | null;
  sunday?: DayHours[] | null;
}

export interface WorkspaceProfile {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  business_type: Record<string, unknown> | null;
  service_locations: string[] | null;
  address: AddressObject | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  operating_hours: OperatingHours | null;
  active_status: boolean;
  onboarding_complete: boolean;
  heard_about_us: string | null;
  created_at: string;
  updated_at: string;
}

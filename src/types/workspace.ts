import { AddressObject } from "./addressData";

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
  active_status: boolean;
  onboarding_complete: boolean;
  heard_about_us: string | null;
  created_at: string;
  updated_at: string;
}

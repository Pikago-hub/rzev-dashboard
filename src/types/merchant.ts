import { AddressObject } from "./addressData";

export interface MerchantProfile {
  id: string;
  business_name: string | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  avatar_url?: string | null;
  description: string | null;
  logo_url: string | null;
  address?: AddressObject;
  lat?: number | null;
  lng?: number | null;
  timezone?: string | null;
  created_at?: string;
  updated_at?: string;
} 
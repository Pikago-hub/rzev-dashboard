/**
 * Type definition for address data used throughout the application
 */

export interface AddressData {
  lat: number | null;
  lng: number | null;
  place_id: string;
  formatted: string;
  street: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Address object stored in merchant profile
 */
export type AddressObject = AddressData; 
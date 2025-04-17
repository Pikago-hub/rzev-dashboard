/**
 * Type definitions for services and service variants
 */

export interface Service {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceVariant {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  duration: number | null;
  price: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceWithVariants extends Service {
  variants: ServiceVariant[];
}

// Form data types
export interface ServiceFormData {
  name: string;
  description: string;
  color: string;
  category: string;
  active: boolean;
}

export interface ServiceVariantFormData {
  name: string;
  description: string;
  duration: number;
  price: number;
  active: boolean;
}

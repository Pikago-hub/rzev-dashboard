"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export type AddressData = {
  formatted?: string;
  street?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  place_id?: string;
};

export type MerchantProfile = {
  id: string;
  business_name: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  avatar_url: string | null;
  address?: AddressData;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
  updated_at: string;
};

export function useMerchantProfile() {
  const [merchantProfile, setMerchantProfile] =
    useState<MerchantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchMerchantProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("merchant_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          throw error;
        }

        setMerchantProfile(data as MerchantProfile);
      } catch (err) {
        console.error("Error fetching merchant profile:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchantProfile();
  }, [user, supabase]);

  return { merchantProfile, isLoading, error };
}

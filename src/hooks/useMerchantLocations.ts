"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

// Updated to match the structure in merchant_profile.address
export type MerchantLocation = {
  id: string; // Using merchant_profile.id
  name: string; // Using business_name or "Main Location"
  address_line1: string; // From address.street
  address_line2: string | null;
  city: string; // From address.city
  state: string; // From address.state
  postal_code: string; // From address.postalCode
  country: string; // From address.country
  timezone: string | null;
  operating_hours: {
    monday?: { open: string; close: string } | null;
    tuesday?: { open: string; close: string } | null;
    wednesday?: { open: string; close: string } | null;
    thursday?: { open: string; close: string } | null;
    friday?: { open: string; close: string } | null;
    saturday?: { open: string; close: string } | null;
    sunday?: { open: string; close: string } | null;
  } | null;
  lat: number | null; // From merchant_profile.lat
  lng: number | null; // From merchant_profile.lng
};

export function useMerchantLocations() {
  const [merchantLocations, setMerchantLocations] = useState<
    MerchantLocation[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchMerchantLocations = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("merchant_profiles")
          .select("id, business_name, address, lat, lng")
          .eq("id", user.id)
          .single();

        if (error) {
          throw error;
        }

        // Transform the data to match the expected MerchantLocation format
        if (data && data.address) {
          // Parse address if it's a string
          const addressData =
            typeof data.address === "string"
              ? JSON.parse(data.address)
              : data.address;

          // Create a location object from the merchant_profile data
          const location: MerchantLocation = {
            id: String(data.id),
            name: data.business_name
              ? String(data.business_name)
              : "Main Location",
            address_line1: addressData.street || "",
            address_line2: null,
            city: addressData.city || "",
            state: addressData.state || "",
            postal_code: addressData.postalCode || "",
            country: addressData.country || "US",
            timezone: null,
            operating_hours: null,
            lat: data.lat ? Number(data.lat) : null,
            lng: data.lng ? Number(data.lng) : null,
          };

          setMerchantLocations([location]);
        } else {
          // No address data found
          setMerchantLocations([]);
        }
      } catch (err) {
        console.error("Error fetching merchant location from profile:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchantLocations();
  }, [user, supabase]);

  return { merchantLocations, isLoading, error };
}

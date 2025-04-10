"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { MerchantProfile } from "@/types/merchant";

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

        setMerchantProfile(data as unknown as MerchantProfile);
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

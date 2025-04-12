"use client";

// This is a compatibility layer for the new useWorkspaceProfile hook
// It maps the workspace data to the old merchant profile structure

import { useWorkspaceProfile } from "./useWorkspaceProfile";
import { MerchantProfile } from "@/types/merchant";

export function useMerchantProfile() {
  const { workspaceProfile, isLoading, error } = useWorkspaceProfile();

  // Map the workspace profile to the merchant profile structure
  const merchantProfile = workspaceProfile
    ? ({
        id: workspaceProfile.id,
        business_name: workspaceProfile.name,
        display_name: workspaceProfile.name,
        contact_email: workspaceProfile.contact_email,
        contact_phone: workspaceProfile.contact_phone,
        website: workspaceProfile.website,
        description: workspaceProfile.description,
        logo_url: workspaceProfile.logo_url,
        address: workspaceProfile.address,
        lat: workspaceProfile.lat,
        lng: workspaceProfile.lng,
        timezone: workspaceProfile.timezone,
        created_at: workspaceProfile.created_at,
        updated_at: workspaceProfile.updated_at,
      } as MerchantProfile)
    : null;

  return { merchantProfile, isLoading, error };
}

"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useWorkspaceProfile } from "@/hooks/useWorkspaceProfile";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { AddressData } from "@/types/addressData";

// Import our newly created components
import { BusinessInfoForm } from "@/components/settings/BusinessInfoForm";
import { PasswordForm } from "@/components/settings/PasswordForm";
import { AddressForm } from "@/components/settings/AddressForm";
import { TimeZoneForm } from "@/components/settings/TimeZoneForm";
import { uploadLogo } from "@/components/settings/LogoUploader";

export default function SettingsPage() {
  const { user, changePassword } = useAuth();
  const { toast } = useToast();
  const { workspaceProfile, isLoading, refreshProfile } = useWorkspaceProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("");
  const t = useTranslations("dashboard.settings");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // State for address data from Google Maps
  const [addressData, setAddressData] = useState<AddressData>({
    lat: workspaceProfile?.lat || null,
    lng: workspaceProfile?.lng || null,
    place_id: workspaceProfile?.address?.place_id || "",
    formatted: workspaceProfile?.address?.formatted || "",
    street: workspaceProfile?.address?.street || "",
    city: workspaceProfile?.address?.city || "",
    state: workspaceProfile?.address?.state || "",
    postalCode: workspaceProfile?.address?.postalCode || "",
    country: workspaceProfile?.address?.country || "US",
  });

  // Check if user uses social login
  const isEmailPasswordUser =
    user?.app_metadata?.provider === "email" || !user?.app_metadata?.provider;

  // Set initial data from workspace profile when loaded
  useEffect(() => {
    if (workspaceProfile?.contact_phone) {
      setPhoneNumber(workspaceProfile.contact_phone);
    }

    if (workspaceProfile?.logo_url) {
      setLogoUrl(workspaceProfile.logo_url);
    }

    if (workspaceProfile?.timezone) {
      setTimezone(workspaceProfile.timezone);
    }

    // Reset addressData when workspaceProfile is loaded or changed
    if (workspaceProfile) {
      setAddressData({
        lat: workspaceProfile.lat || null,
        lng: workspaceProfile.lng || null,
        place_id: workspaceProfile?.address?.place_id || "",
        formatted: workspaceProfile?.address?.formatted || "",
        street: workspaceProfile?.address?.street || "",
        city: workspaceProfile?.address?.city || "",
        state: workspaceProfile?.address?.state || "",
        postalCode: workspaceProfile?.address?.postalCode || "",
        country: workspaceProfile?.address?.country || "US",
      });
    }
  }, [workspaceProfile]);

  const handleSaveBusinessInfo = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      
      // Get form refs from the BusinessInfoForm component
      const businessNameInput = document.getElementById(
        "business-name"
      ) as HTMLInputElement;
      const businessEmailInput = document.getElementById(
        "business-email"
      ) as HTMLInputElement;
      const businessWebsiteInput = document.getElementById(
        "business-website"
      ) as HTMLInputElement;
      const businessDescriptionInput = document.getElementById(
        "business-description"
      ) as HTMLTextAreaElement;

      // Upload logo if a new file was selected
      let logo_url = workspaceProfile?.logo_url;
      if (logoFile) {
        const uploadedUrl = await uploadLogo(logoFile, user.id);
        if (uploadedUrl) {
          logo_url = uploadedUrl;
        }
      } else if (logoUrl === null && workspaceProfile?.logo_url) {
        // Logo was removed
        logo_url = null;
      }

      // Get workspace ID from workspace profile
      const workspaceId = workspaceProfile?.id;
      if (!workspaceId) {
        throw new Error("Workspace ID not found");
      }

      // Prepare workspace data to update
      const workspaceData = {
        name: businessNameInput?.value,
        contact_email: businessEmailInput?.value,
        contact_phone: phoneNumber,
        website: businessWebsiteInput?.value,
        description: businessDescriptionInput?.value,
        logo_url: logo_url,
        timezone: timezone || null,
        address: addressData?.street ? {
          formatted:
            addressData.formatted ||
            `${addressData.street}, ${addressData.city}, ${addressData.state} ${addressData.postalCode}`,
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: addressData.country || "US",
          place_id: addressData.place_id || "",
        } : null,
        lat: addressData.lat,
        lng: addressData.lng,
      };

      // Call the server-side update endpoint
      const response = await fetch('/api/workspace/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          workspaceId,
          workspaceData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update workspace');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update workspace');
      }

      toast({
        title: t("common.success"),
        description: t("business.saveSuccess"),
      });

      // Use the context's refresh function instead of reloading the page
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error) {
      console.error("Error saving business information:", error);
      toast({
        title: t("common.error"),
        description: t("business.saveError"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        ) : (
          <Tabs defaultValue="business" className="space-y-4">
            <TabsList>
              <TabsTrigger value="business">{t("tabs.business")}</TabsTrigger>
              <TabsTrigger value="security">{t("tabs.security")}</TabsTrigger>
            </TabsList>

            <TabsContent value="business" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("business.title")}</CardTitle>
                  <CardDescription>{t("business.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Business Info Form */}
                  <BusinessInfoForm
                    workspaceProfile={workspaceProfile}
                    translationFunc={t}
                    userId={user?.id || ""}
                    phoneNumber={phoneNumber}
                    setPhoneNumber={setPhoneNumber}
                    logoUrl={logoUrl}
                    logoFile={logoFile}
                    setLogoUrl={setLogoUrl}
                    setLogoFile={setLogoFile}
                  />

                  <Separator className="my-4" />

                  {/* Timezone Form */}
                  {workspaceProfile && (
                    <TimeZoneForm
                      workspaceProfile={{
                        timezone: workspaceProfile.timezone || undefined,
                      }}
                      translationFunc={t}
                      onTimeZoneChange={setTimezone}
                    />
                  )}

                  <Separator className="my-4" />

                  {/* Address Form */}
                  <AddressForm
                    addressData={addressData}
                    onAddressChange={setAddressData}
                    translationFunc={t}
                  />

                  <div className="flex justify-end">
                    <button
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                      onClick={handleSaveBusinessInfo}
                      disabled={isSaving}
                    >
                      {isSaving
                        ? t("common.loading")
                        : t("business.saveChanges")}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("security.title")}</CardTitle>
                  <CardDescription>{t("security.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isEmailPasswordUser ? (
                    <div className="rounded-md bg-muted p-4">
                      <p className="text-sm text-muted-foreground">
                        {t("security.socialLoginMessage")}
                      </p>
                    </div>
                  ) : (
                    <PasswordForm
                      translationFunc={t}
                      changePassword={changePassword}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}

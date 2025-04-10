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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useMerchantProfile } from "@/hooks/useMerchantProfile";
import { useState, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { merchantProfile, isLoading } = useMerchantProfile();
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslations("dashboard.settings");

  // Refs for form inputs
  const businessNameRef = useRef<HTMLInputElement>(null);
  const businessEmailRef = useRef<HTMLInputElement>(null);
  const businessPhoneRef = useRef<HTMLInputElement>(null);
  const businessWebsiteRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  const handleSaveBusinessInfo = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      const supabase = createBrowserClient();

      // Update merchant profile
      const { error: profileError } = await supabase
        .from("merchant_profiles")
        .update({
          business_name: businessNameRef.current?.value,
          contact_email: businessEmailRef.current?.value,
          contact_phone: businessPhoneRef.current?.value,
          website: businessWebsiteRef.current?.value,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update address in merchant_profile
      if (addressRef.current?.value) {
        // Create address object to store in merchant_profile
        const addressObject = {
          formatted: `${addressRef.current?.value}, ${cityRef.current?.value}, ${stateRef.current?.value} ${zipRef.current?.value}`,
          street: addressRef.current?.value,
          city: cityRef.current?.value,
          state: stateRef.current?.value,
          postalCode: zipRef.current?.value,
          country: "US", // Default
        };

        const { error: addressError } = await supabase
          .from("merchant_profiles")
          .update({
            address: addressObject,
          })
          .eq("id", user.id);

        if (addressError) throw addressError;
      }

      toast({
        title: t("common.success"),
        description: t("business.saveSuccess"),
      });

      // Refresh the page to show updated data
      window.location.reload();
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
              <TabsTrigger value="notifications">
                {t("tabs.notifications")}
              </TabsTrigger>
              <TabsTrigger value="security">{t("tabs.security")}</TabsTrigger>
            </TabsList>

            <TabsContent value="business" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("business.title")}</CardTitle>
                  <CardDescription>{t("business.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business-name">
                        {t("business.businessName")}
                      </Label>
                      <Input
                        id="business-name"
                        defaultValue={merchantProfile?.business_name || ""}
                        placeholder="Your Business Name"
                        ref={businessNameRef}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-email">
                        {t("business.businessEmail")}
                      </Label>
                      <Input
                        id="business-email"
                        type="email"
                        defaultValue={merchantProfile?.contact_email || ""}
                        placeholder="contact@yourbusiness.com"
                        ref={businessEmailRef}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-phone">
                        {t("business.businessPhone")}
                      </Label>
                      <Input
                        id="business-phone"
                        type="tel"
                        defaultValue={merchantProfile?.contact_phone || ""}
                        placeholder="+1 (555) 123-4567"
                        ref={businessPhoneRef}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-website">
                        {t("business.website")}
                      </Label>
                      <Input
                        id="business-website"
                        type="url"
                        defaultValue={merchantProfile?.website || ""}
                        placeholder="https://yourbusiness.com"
                        ref={businessWebsiteRef}
                      />
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <Label htmlFor="business-address">
                      {t("business.address")}
                    </Label>
                    <Input
                      id="business-address"
                      defaultValue={merchantProfile?.address?.street || ""}
                      placeholder="123 Main Street"
                      ref={addressRef}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business-city">
                        {t("business.city")}
                      </Label>
                      <Input
                        id="business-city"
                        defaultValue={merchantProfile?.address?.city || ""}
                        placeholder="San Francisco"
                        ref={cityRef}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-state">
                        {t("business.state")}
                      </Label>
                      <Input
                        id="business-state"
                        defaultValue={merchantProfile?.address?.state || ""}
                        placeholder="CA"
                        ref={stateRef}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-zip">
                        {t("business.zipCode")}
                      </Label>
                      <Input
                        id="business-zip"
                        defaultValue={
                          merchantProfile?.address?.postalCode || ""
                        }
                        placeholder="94105"
                        ref={zipRef}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveBusinessInfo}
                      disabled={isSaving}
                    >
                      {isSaving
                        ? t("common.loading")
                        : t("business.saveChanges")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("notifications.title")}</CardTitle>
                  <CardDescription>
                    {t("notifications.subtitle")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      {t("notifications.emailNotifications")}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email-appointments">
                            {t("notifications.appointmentNotifications")}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {t("notifications.appointmentNotificationsDesc")}
                          </p>
                        </div>
                        <Switch id="email-appointments" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email-reminders">
                            {t("notifications.appointmentReminders")}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {t("notifications.appointmentRemindersDesc")}
                          </p>
                        </div>
                        <Switch id="email-reminders" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email-marketing">
                            {t("notifications.marketingPromotions")}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {t("notifications.marketingPromotionsDesc")}
                          </p>
                        </div>
                        <Switch id="email-marketing" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      {t("notifications.smsNotifications")}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sms-appointments">
                            {t("notifications.smsAppointmentNotifications")}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {t("notifications.smsAppointmentNotificationsDesc")}
                          </p>
                        </div>
                        <Switch id="sms-appointments" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sms-reminders">
                            {t("notifications.smsAppointmentReminders")}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {t("notifications.smsAppointmentRemindersDesc")}
                          </p>
                        </div>
                        <Switch id="sms-reminders" defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button>{t("notifications.savePreferences")}</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="security"
              className="h-[400px] flex items-center justify-center"
            >
              <p className="text-muted-foreground">
                {t("security.comingSoon")}
              </p>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import PhoneNumberInput from "@/components/phone-number-input";
import "react-phone-number-input/style.css";
import type { TranslationFunction } from "@/types/translationFunction";
import { TeamMemberProfile } from "@/hooks/useTeamMemberProfile";

// Define the profile schema
const profileSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required" }),
  last_name: z.string().min(1, { message: "Last name is required" }),
  display_name: z.string().min(1, { message: "Display name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  teamMemberProfile?: TeamMemberProfile;
  translationFunc: TranslationFunction;
  onSaveSuccess?: () => void;
}

export function ProfileForm({
  teamMemberProfile,
  translationFunc: t,
  onSaveSuccess,
}: ProfileFormProps) {
  const { toast } = useToast();
  const { user, session } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>(
    teamMemberProfile?.phone || ""
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: teamMemberProfile?.first_name || "",
      last_name: teamMemberProfile?.last_name || "",
      display_name: teamMemberProfile?.display_name || "",
      email: teamMemberProfile?.email || user?.email || "",
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !session) {
      toast({
        title: t("common.error"),
        description: t("profile.unauthorized"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      // Create payload for API
      const payload = {
        userId: user.id,
        profileData: {
          first_name: data.first_name,
          last_name: data.last_name,
          display_name: data.display_name,
          email: data.email,
          phone: phoneNumber || null,
        },
      };

      // Make API request to update profile
      const response = await fetch("/api/team-member/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      toast({
        title: t("common.success"),
        description: t("profile.saveSuccess"),
      });

      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: t("common.error"),
        description: t("profile.saveError"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("profile.firstName")}</FormLabel>
                <FormControl>
                  <Input
                    id="first-name"
                    placeholder={t("profile.firstNamePlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("profile.lastName")}</FormLabel>
                <FormControl>
                  <Input
                    id="last-name"
                    placeholder={t("profile.lastNamePlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("profile.displayName")}</FormLabel>
              <FormControl>
                <Input
                  id="display-name"
                  placeholder={t("profile.displayNamePlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("profile.email")}</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("profile.emailPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <PhoneNumberInput
          value={phoneNumber}
          onChange={(value) => setPhoneNumber(value || "")}
          label={t("profile.phone")}
          required={false}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="mt-4">
            {isSaving ? t("common.saving") : t("profile.saveChanges")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

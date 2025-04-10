"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { createBrowserClient } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { useOnboarding } from "@/lib/onboarding-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define the form schema with Zod
const getFormSchema = (t: ReturnType<typeof useTranslations>) =>
  z.object({
    businessName: z.string().min(1, {
      message:
        t("businessInfo.businessNameLabel") + " " + t("common.isRequired"),
    }),
    website: z
      .string()
      .refine(
        (val) =>
          val === "" ||
          /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/.test(val),
        {
          message: t("common.enterValidUrl"),
        }
      )
      .optional(),
  });

export default function BusinessInfoPage() {
  const t = useTranslations("onboarding");
  const { user } = useAuth();
  const { setSubmitHandler } = useOnboarding();
  const supabase = createBrowserClient();
  const [isLoading, setIsLoading] = useState(true);

  // Create schema with translations
  const formSchema = getFormSchema(t);

  // Initialize form with react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: "",
      website: "",
    },
    mode: "onSubmit", // Only validate on submit
  });

  // Load existing merchant profile data
  useEffect(() => {
    const fetchMerchantProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("merchant_profiles")
          .select("business_name, website")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching merchant profile:", error);
          setIsLoading(false);
          return;
        }

        // Update form with existing data if available
        if (data) {
          form.reset({
            businessName: data.business_name ? String(data.business_name) : "",
            website: data.website ? String(data.website) : "",
          });
        }
      } catch (err) {
        console.error("Error in fetchMerchantProfile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchantProfile();
  }, [user, supabase, form, setIsLoading]);

  // Handle form submission
  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      if (!user) return false;

      try {
        // Update merchant profile with business info
        const { error } = await supabase
          .from("merchant_profiles")
          .update({
            business_name: values.businessName,
            website: values.website || null,
          })
          .eq("id", user.id);

        if (error) throw error;

        toast({
          title: t("successTitle"),
          description: t("successMessage"),
        });

        return true; // Return success status
      } catch (error) {
        console.error("Error updating merchant profile:", error);
        toast({
          title: t("errorTitle"),
          description: t("errorMessage"),
          variant: "destructive",
        });
        return false; // Return failure status
      }
    },
    [user, supabase, t]
  );

  // Create a stable reference to the submit handler function
  const submitFn = useCallback(async (): Promise<boolean> => {
    try {
      // This will run the form validation and then call onSubmit if valid
      let isSuccess = false;

      // We need to wrap this because handleSubmit returns void, not a Promise
      await form.handleSubmit(async (values) => {
        const result = await onSubmit(values);
        isSuccess = result === undefined ? true : !!result;
      })();

      return isSuccess;
    } catch (error) {
      console.error("Error in submit handler:", error);
      return false;
    }
  }, [form, onSubmit]);

  // Register the submit handler with the context
  useEffect(() => {
    console.log("Setting submit handler in business-info page");
    if (typeof setSubmitHandler === "function") {
      setSubmitHandler(submitFn);
    } else {
      console.error("setSubmitHandler is not available", setSubmitHandler);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitFn]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("businessInfo.title")}</CardTitle>
        <CardDescription>{t("businessInfo.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("businessInfo.businessNameLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("businessInfo.businessNamePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("businessInfo.websiteLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("businessInfo.websitePlaceholder")}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* No submit button - the Next button in the layout will handle submission */}
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

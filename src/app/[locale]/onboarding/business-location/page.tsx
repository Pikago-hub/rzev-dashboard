"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast";
import { useOnboarding } from "@/lib/onboarding-context";
import { GoogleMapsAddressInput } from "@/components/GoogleMapsAddressInput";
import { AddressData } from "@/types/addressData";
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
import { Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define the form schema with Zod
const getFormSchema = (t: ReturnType<typeof useTranslations>) =>
  z.object({
    address: z.string().min(1, {
      message: t("businessLocation.addressRequired"),
    }),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    place_id: z.string().optional(),
  });

// Define the type for the form values
type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

export default function BusinessLocationPage() {
  const t = useTranslations("onboarding");
  const { user } = useAuth();
  const { setSubmitHandler } = useOnboarding();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

  // Create schema with translations
  const formSchema = getFormSchema(t);

  // Initialize form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
    mode: "onSubmit", // Only validate on submit
  });

  // Handle address change from Google Maps component
  const handleAddressChange = (data: AddressData) => {
    console.log("Address changed:", data);

    // Update form values with data from the address input
    form.setValue("address", data.formatted || "");
    form.setValue("street", data.street);
    form.setValue("city", data.city);
    form.setValue("state", data.state);
    form.setValue("postalCode", data.postalCode);
    form.setValue("country", data.country);

    if (data.lat) {
      form.setValue("lat", data.lat);
    }
    if (data.lng) {
      form.setValue("lng", data.lng);
    }
    form.setValue("place_id", data.place_id || "");
  };

  // Load existing business location from API
  useEffect(() => {
    const fetchBusinessLocation = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get address data from workspace via API
        const response = await fetch(
          `/api/workspace/business-location?userId=${user.id}`
        );

        if (!response.ok) {
          throw new Error(
            `Error fetching business location: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch business location");
        }

        if (data.address) {
          try {
            // Parse the address JSON if needed
            const addressData =
              typeof data.address === "string"
                ? JSON.parse(data.address)
                : data.address;

            // Set the full address for display
            form.setValue("address", addressData.formatted || "");

            // Set address components if available
            if (addressData.street) form.setValue("street", addressData.street);
            if (addressData.city) form.setValue("city", addressData.city);
            if (addressData.state) form.setValue("state", addressData.state);
            if (addressData.postalCode)
              form.setValue("postalCode", addressData.postalCode);
            if (addressData.country)
              form.setValue("country", addressData.country);

            // Set lat/lng if available
            if (data.lat) {
              form.setValue("lat", Number(data.lat));
            }
            if (data.lng) {
              form.setValue("lng", Number(data.lng));
            }
            if (addressData.place_id) {
              form.setValue("place_id", addressData.place_id);
            }
          } catch (parseError) {
            console.error("Error parsing address JSON:", parseError);
          }
        }
      } catch (err) {
        console.error("Error fetching business location:", err);
        toast({
          title: t("errorTitle"),
          description: t("businessLocation.errorFetching"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessLocation();
  }, [user, form, t]);

  // Handle form submission
  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!user) return false;

      try {
        // Validate the address with Google Maps API
        setIsValidating(true);

        // If we don't have lat/lng or address components, try to validate the address
        if (!values.lat || !values.lng || !values.street) {
          try {
            const response = await fetch("/api/validate-address", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ address: values.address }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.valid && data.address) {
                // Update form values with validated address
                values.lat = data.address.lat;
                values.lng = data.address.lng;
                values.place_id = data.address.place_id;

                // Extract address components from the validated address if available
                if (data.address.street) values.street = data.address.street;
                if (data.address.city) values.city = data.address.city;
                if (data.address.state) values.state = data.address.state;
                if (data.address.postalCode)
                  values.postalCode = data.address.postalCode;
                if (data.address.country) values.country = data.address.country;
              } else {
                // Address validation failed
                toast({
                  title: t("businessLocation.validationError"),
                  description: t("businessLocation.addressNotFound"),
                  variant: "destructive",
                });
                return false;
              }
            }
          } catch (validationError) {
            console.error("Error validating address:", validationError);
            // Continue with the data we have
          }
        }

        // Create address object to store in workspace
        // If we have a formatted address but no street/city/etc., use the formatted address for all fields
        // This ensures we always store something in the address components
        const addressObject = {
          formatted: values.address,
          street: values.street || values.address, // Use formatted address as fallback
          city: values.city || "",
          state: values.state || "",
          postalCode: values.postalCode || "",
          country: values.country || "",
          place_id: values.place_id || "",
        };

        // Log the address object for debugging
        console.log("Saving address object:", addressObject);

        // Update workspace with address data via API
        const response = await fetch("/api/workspace/business-location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            address: addressObject,
            lat: values.lat || null,
            lng: values.lng || null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to update business location"
          );
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to update business location");
        }

        toast({
          title: t("successTitle"),
          description: t("successMessage"),
        });

        return true; // Return success status
      } catch (error) {
        console.error("Error updating business location:", error);
        toast({
          title: t("errorTitle"),
          description: t("errorMessage"),
          variant: "destructive",
        });
        return false; // Return failure status
      } finally {
        setIsValidating(false);
      }
    },
    [user, t]
  );

  // Create a stable reference to the submit handler function
  const submitFn = useCallback(async (): Promise<boolean> => {
    try {
      // This will run the form validation and then call onSubmit if valid
      let isSuccess = false;

      // Check if we have a place selected via autocomplete
      // If not, try to validate the address before submitting
      if (
        form.getValues("address") &&
        (!form.getValues("lat") ||
          !form.getValues("lng") ||
          !form.getValues("street")) // Also validate if we don't have address components
      ) {
        console.log(
          "Address entered but no coordinates, attempting to validate"
        );
        try {
          const response = await fetch("/api/validate-address", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ address: form.getValues("address") }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.valid && data.address) {
              // Update form values with validated address
              form.setValue("lat", data.address.lat);
              form.setValue("lng", data.address.lng);
              form.setValue("place_id", data.address.place_id);

              // Extract address components from the validated address if available
              if (data.address.street)
                form.setValue("street", data.address.street);
              if (data.address.city) form.setValue("city", data.address.city);
              if (data.address.state)
                form.setValue("state", data.address.state);
              if (data.address.postalCode)
                form.setValue("postalCode", data.address.postalCode);
              if (data.address.country)
                form.setValue("country", data.address.country);
            }
          }
        } catch (validationError) {
          console.error("Error validating address:", validationError);
        }
      }

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
    setSubmitHandler(submitFn);
  }, [setSubmitHandler, submitFn]);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("businessLocation.title")}</CardTitle>
          <CardDescription>{t("businessLocation.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Google Maps Autocomplete Input Component */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("businessLocation.addressLabel")}
                      </FormLabel>
                      <FormControl>
                        <GoogleMapsAddressInput
                          id="address-input"
                          value={field.value}
                          placeholder={t("businessLocation.addressPlaceholder")}
                          onChange={handleAddressChange}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hidden fields for address components */}
                <input type="hidden" {...form.register("lat")} />
                <input type="hidden" {...form.register("lng")} />
                <input type="hidden" {...form.register("place_id")} />
                <input type="hidden" {...form.register("street")} />
                <input type="hidden" {...form.register("city")} />
                <input type="hidden" {...form.register("state")} />
                <input type="hidden" {...form.register("postalCode")} />
                <input type="hidden" {...form.register("country")} />

                {/* No submit button - the Next button in the layout will handle submission */}
                {isValidating && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Validating address...</span>
                  </div>
                )}
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </>
  );
}

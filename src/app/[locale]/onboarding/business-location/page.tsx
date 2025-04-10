"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { createBrowserClient } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { useOnboarding } from "@/lib/onboarding-context";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

// Add Google Maps types
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: {
            new (input: HTMLInputElement, options?: object): {
              addListener(event: string, handler: () => void): void;
              getPlace(): {
                address_components?: Array<{
                  long_name: string;
                  short_name: string;
                  types: string[];
                }>;
                formatted_address?: string;
                geometry?: {
                  location: {
                    lat(): number;
                    lng(): number;
                  };
                };
                place_id?: string;
              };
            };
          };
        };
        event: {
          clearInstanceListeners(instance: unknown): void;
        };
      };
    };
  }
}
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
import { Loader2, MapPin } from "lucide-react";
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
  const supabase = createBrowserClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const googleMapsLoaded = useGoogleMaps();
  const autocompleteRef = useRef<{
    addListener(event: string, handler: () => void): void;
    getPlace(): {
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
      formatted_address?: string;
      geometry?: {
        location: {
          lat(): number;
          lng(): number;
        };
      };
      place_id?: string;
    };
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  // Initialize Google Maps Autocomplete when the script is loaded
  const initializeAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google || !window.google.maps) {
      console.log("Cannot initialize autocomplete - missing dependencies");
      return;
    }

    // Check if autocomplete is already initialized to prevent duplicates
    if (autocompleteRef.current) {
      console.log("Autocomplete already initialized");
      return;
    }

    console.log("Initializing Google Maps Autocomplete");

    // Create the autocomplete instance
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["address"],
        fields: [
          "address_components",
          "formatted_address",
          "geometry",
          "place_id",
        ],
      }
    );

    // Add listener for place changed
    autocompleteRef.current.addListener("place_changed", () => {
      if (!autocompleteRef.current) return;

      const place = autocompleteRef.current.getPlace();
      console.log("Place selected:", place);

      if (!place.geometry || !place.address_components) {
        console.error("No details available for this place");
        return;
      }

      // Extract address components for storage
      let street_number = "";
      let route = "";
      let city = "";
      let state = "";
      let postalCode = "";
      let country = "";

      place.address_components?.forEach(
        (component: { types: string[]; long_name: string }) => {
          const types = component.types;

          if (types.includes("street_number")) {
            street_number = component.long_name;
          } else if (types.includes("route")) {
            route = component.long_name;
          } else if (types.includes("locality")) {
            city = component.long_name;
          } else if (
            types.includes("administrative_area_level_1") ||
            types.includes("administrative_area_level_2")
          ) {
            state = component.long_name;
          } else if (types.includes("postal_code")) {
            postalCode = component.long_name;
          } else if (types.includes("country")) {
            country = component.long_name;
          }
        }
      );

      // Store the street address
      const street = `${street_number} ${route}`.trim();

      // Store these values in form state for later use when saving
      form.setValue("address", place.formatted_address || "");
      form.setValue("street", street);
      form.setValue("city", city);
      form.setValue("state", state);
      form.setValue("postalCode", postalCode);
      form.setValue("country", country);

      if (place.geometry?.location) {
        form.setValue("lat", place.geometry.location.lat());
        form.setValue("lng", place.geometry.location.lng());
      }

      form.setValue("place_id", place.place_id || "");
    });
  }, [form]);

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (googleMapsLoaded) {
      console.log("Google Maps loaded, initializing autocomplete");
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        initializeAutocomplete();
      }, 100);
    }

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      if (autocompleteRef.current) {
        console.log("Cleaning up Google Maps Autocomplete");
        // Remove all event listeners from autocomplete
        if (window.google && window.google.maps) {
          window.google.maps.event.clearInstanceListeners(
            autocompleteRef.current
          );
        }
        autocompleteRef.current = null;
      }
    };
  }, [googleMapsLoaded, initializeAutocomplete]);

  // Load existing business location from Supabase
  useEffect(() => {
    const fetchBusinessLocation = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get address data from merchant_profile
        const { data: profileData, error: profileError } = await supabase
          .from("merchant_profiles")
          .select("address, lat, lng")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching merchant profile:", profileError);
          setIsLoading(false);
          return;
        }

        if (profileData && profileData.address) {
          try {
            // Parse the address JSON
            const addressData =
              typeof profileData.address === "string"
                ? JSON.parse(profileData.address)
                : profileData.address;

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
            if (profileData.lat) {
              form.setValue("lat", Number(profileData.lat));
            }
            if (profileData.lng) {
              form.setValue("lng", Number(profileData.lng));
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessLocation();
  }, [user, supabase, form]);

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

        // Create address object to store in merchant_profile
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

        // Update merchant profile with address data
        const { error: profileError } = await supabase
          .from("merchant_profiles")
          .update({
            address: addressObject,
            lat: values.lat || null,
            lng: values.lng || null,
          })
          .eq("id", user.id);

        if (profileError) throw profileError;

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
    [user, supabase, t]
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
                {/* Google Maps Autocomplete Input */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("businessLocation.addressLabel")}
                      </FormLabel>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input
                            {...field}
                            ref={(el) => {
                              // Set the ref for both react-hook-form and our inputRef
                              inputRef.current = el;
                              if (typeof field.ref === "function") {
                                field.ref(el);
                              }
                            }}
                            placeholder={t(
                              "businessLocation.addressPlaceholder"
                            )}
                            className="pl-10"
                            // Add key event to prevent form submission on Enter
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                              }
                            }}
                          />
                        </FormControl>
                      </div>
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

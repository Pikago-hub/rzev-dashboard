"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { createBrowserClient } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { useOnboarding } from "@/lib/onboarding-context";
import { useRouter } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin, Store } from "lucide-react";

export default function ServiceLocationsPage() {
  const t = useTranslations("onboarding");
  const { user } = useAuth();
  const { setSubmitHandler } = useOnboarding();
  const supabase = createBrowserClient();
  const router = useRouter();
  const [serviceLocation, setServiceLocation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debug function to log state changes
  const handleServiceLocationChange = (value: string) => {
    console.log("Service location selected:", value);
    setServiceLocation(value);
  };

  // Load existing service location from Supabase
  useEffect(() => {
    const fetchServiceLocation = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Ensure user exists before querying
        if (!user) {
          console.log("User is null when fetching service locations");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("merchant_profiles")
          .select("service_locations")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching service locations:", error);
          setIsLoading(false);
          return;
        }

        // If we have existing data, parse it and set selected location
        if (data && data.service_locations) {
          try {
            const locationData =
              typeof data.service_locations === "string"
                ? JSON.parse(data.service_locations)
                : data.service_locations;

            console.log("Loaded service location from DB:", locationData);

            // Handle both array format and old type format for backward compatibility
            if (Array.isArray(locationData)) {
              // If it's an array with multiple values, it's "both"
              if (
                locationData.includes("inStore") &&
                locationData.includes("clientLocation")
              ) {
                setServiceLocation("both");
              }
              // Otherwise use the first value in the array
              else if (locationData.length > 0) {
                setServiceLocation(locationData[0]);
              }
            } else if (locationData.type) {
              // Handle legacy format
              setServiceLocation(locationData.type);
            }
          } catch (parseError) {
            console.error("Error parsing service_locations JSON:", parseError);
          }
        }
      } catch (err) {
        console.error("Error in fetchServiceLocation:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceLocation();
  }, [user, supabase]);

  // Register the submit handler with the context
  useEffect(() => {
    // Create a stable reference to the submit handler that returns a Promise<boolean>
    const submitFn = async (): Promise<boolean> => {
      try {
        console.log(
          "Submit function called, current serviceLocation:",
          serviceLocation
        );

        // If no service location is selected, show an error
        if (!serviceLocation || serviceLocation === "") {
          console.log("Service location validation failed");
          toast({
            title: t("errorTitle"),
            description: t("serviceLocations.selectionRequired"),
            variant: "destructive",
          });
          return false;
        }

        // Save the service location data
        try {
          // Create an array of service location types based on selection
          let serviceLocationData;

          if (serviceLocation === "both") {
            // If both is selected, include both location types
            serviceLocationData = ["inStore", "clientLocation"];
          } else {
            // Otherwise just include the selected type
            serviceLocationData = [serviceLocation];
          }

          console.log("Service location data to save:", serviceLocationData);

          // Check if user exists before updating
          if (!user) {
            console.error(
              "User is null when trying to update service locations"
            );
            toast({
              title: t("errorTitle"),
              description: t("errorMessage"),
              variant: "destructive",
            });
            return false;
          }

          // Update merchant profile with service location data
          const { error } = await supabase
            .from("merchant_profiles")
            .update({
              service_locations: serviceLocationData,
            })
            .eq("id", user.id);

          if (error) throw error;

          // Show success toast
          toast({
            title: t("successTitle"),
            description: t("successMessage"),
          });

          // Handle navigation based on selection
          console.log(
            "Service location selected for navigation:",
            serviceLocation
          );

          if (serviceLocation === "inStore" || serviceLocation === "both") {
            // Navigate to the business location page
            console.log("Navigating to business location page");
            router.push("/onboarding/business-location");
          } else if (serviceLocation === "clientLocation") {
            // For client-only locations, skip the business location page and go directly to current software
            console.log("Navigating directly to current software page");
            router.push("/onboarding/current-software");
          }

          return true; // Return success status
        } catch (error) {
          console.error("Error updating service locations:", error);
          toast({
            title: t("errorTitle"),
            description: t("errorMessage"),
            variant: "destructive",
          });
          return false; // Return failure status
        }
      } catch (error) {
        console.error("Error in submit handler:", error);
        return false;
      }
    };

    console.log("Registering submit handler");
    setSubmitHandler(submitFn);
    // We need to include serviceLocation in dependencies to ensure the latest value is used
  }, [setSubmitHandler, serviceLocation, router, supabase, t, user]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("serviceLocations.title")}</CardTitle>
        <CardDescription>{t("serviceLocations.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            <RadioGroup
              value={serviceLocation || ""}
              onValueChange={handleServiceLocationChange}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* In-Store Option */}
              <label
                htmlFor="inStore"
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  serviceLocation === "inStore"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }`}
                onClick={() => handleServiceLocationChange("inStore")}
              >
                <RadioGroupItem
                  value="inStore"
                  id="inStore"
                  className="absolute right-4 top-4 h-5 w-5"
                />
                <div className="flex flex-col items-center justify-center gap-2 h-full">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Store className="h-6 w-6" />
                  </div>
                  <span className="text-lg font-medium">
                    {t("serviceLocations.options.inStore")}
                  </span>
                  <span className="text-sm text-muted-foreground text-center">
                    {t("serviceLocations.options.inStoreDescription")}
                  </span>
                </div>
              </label>

              {/* Client Location Option */}
              <label
                htmlFor="clientLocation"
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  serviceLocation === "clientLocation"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }`}
                onClick={() => handleServiceLocationChange("clientLocation")}
              >
                <RadioGroupItem
                  value="clientLocation"
                  id="clientLocation"
                  className="absolute right-4 top-4 h-5 w-5"
                />
                <div className="flex flex-col items-center justify-center gap-2 h-full">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <span className="text-lg font-medium">
                    {t("serviceLocations.options.clientLocation")}
                  </span>
                  <span className="text-sm text-muted-foreground text-center">
                    {t("serviceLocations.options.clientLocationDescription")}
                  </span>
                </div>
              </label>

              {/* Both Option */}
              <label
                htmlFor="both"
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  serviceLocation === "both"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }`}
                onClick={() => handleServiceLocationChange("both")}
              >
                <RadioGroupItem
                  value="both"
                  id="both"
                  className="absolute right-4 top-4 h-5 w-5"
                />
                <div className="flex flex-col items-center justify-center gap-2 h-full">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <div className="flex">
                      <Store className="h-6 w-6 mr-1" />
                      <MapPin className="h-6 w-6" />
                    </div>
                  </div>
                  <span className="text-lg font-medium">
                    {t("serviceLocations.options.both")}
                  </span>
                  <span className="text-sm text-muted-foreground text-center">
                    {t("serviceLocations.options.bothDescription")}
                  </span>
                </div>
              </label>
            </RadioGroup>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

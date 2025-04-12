"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast";
import { useOnboarding } from "@/lib/onboarding-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Define service categories - IDs remain in English for Supabase
const SERVICE_CATEGORIES = [
  { id: "hair" },
  { id: "nails" },
  { id: "makeup" },
  { id: "skincare" },
  { id: "massage" },
  { id: "spa" },
  { id: "barber" },
  { id: "waxing" },
  { id: "lashes" },
  { id: "tanning" },
  { id: "tattoo" },
  { id: "piercing" },
  { id: "fitness" },
  { id: "yoga" },
  { id: "wellness" },
  { id: "nutrition" },
  { id: "therapy" },
  { id: "dental" },
  { id: "medical" },
  { id: "other" },
];

export default function ServicesOfferPage() {
  const t = useTranslations("onboarding");
  const { user } = useAuth();
  const { setSubmitHandler } = useOnboarding();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [otherServiceValue, setOtherServiceValue] = useState("");

  // Load existing service selections if available
  useEffect(() => {
    const fetchBusinessType = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch services from the API
        const response = await fetch(
          `/api/workspace/services?userId=${user.id}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch services");
        }

        // If we have existing data, set selected services
        if (data.success && data.businessType) {
          const businessType = data.businessType;

          // Handle both formats: {services: [...]} and direct array for backward compatibility
          if (Array.isArray(businessType)) {
            // Old format: direct array
            setSelectedServices(businessType);
          } else if (
            businessType.services &&
            Array.isArray(businessType.services)
          ) {
            // New format: {services: [...], otherService: "..."}
            setSelectedServices(businessType.services);

            if (businessType.otherService) {
              setOtherServiceValue(businessType.otherService);
            }
          }
        }
      } catch (err) {
        console.error("Error in fetchBusinessType:", err);
        toast({
          title: t("errorTitle"),
          description: t("errorMessage"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessType();
  }, [user, t]);

  // Toggle service selection
  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!user) return false;

    // Validate that at least one service is selected
    if (selectedServices.length === 0) {
      toast({
        title: t("errorTitle"),
        description: t("servicesOffer.selectionRequired"),
        variant: "destructive",
      });
      return false;
    }

    // Validate that if "other" is selected, the other service text is provided
    if (selectedServices.includes("other") && !otherServiceValue.trim()) {
      toast({
        title: t("errorTitle"),
        description: t("servicesOffer.otherServiceRequired"),
        variant: "destructive",
      });
      return false;
    }

    try {
      // Save selected services via API
      const response = await fetch("/api/workspace/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          services: selectedServices,
          otherService: selectedServices.includes("other")
            ? otherServiceValue
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update services");
      }

      toast({
        title: t("successTitle"),
        description: t("successMessage"),
      });

      return true; // Return success status
    } catch (error) {
      console.error("Error updating services:", error);
      toast({
        title: t("errorTitle"),
        description: t("errorMessage"),
        variant: "destructive",
      });
      return false; // Return failure status
    }
  }, [user, selectedServices, otherServiceValue, t]);

  // Register the submit handler with the context
  useEffect(() => {
    // Create a stable reference to the submit handler that returns a Promise<boolean>
    const submitFn = async (): Promise<boolean> => {
      try {
        return await handleSubmit();
      } catch (error) {
        console.error("Error in submit handler:", error);
        return false;
      }
    };

    setSubmitHandler(submitFn);
  }, [setSubmitHandler, handleSubmit]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("servicesOffer.title")}</CardTitle>
        <CardDescription>{t("servicesOffer.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            <p className="text-sm text-muted-foreground">
              {t("servicesOffer.selectInstruction")}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {SERVICE_CATEGORIES.map((service) => (
                <Badge
                  key={service.id}
                  variant={
                    selectedServices.includes(service.id)
                      ? "default"
                      : "outline"
                  }
                  className={`px-4 py-2 cursor-pointer text-sm ${
                    selectedServices.includes(service.id)
                      ? "bg-primary"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => toggleService(service.id)}
                >
                  {t(`servicesOffer.categories.${service.id}`)}
                </Badge>
              ))}
            </div>

            {selectedServices.includes("other") && (
              <div className="mt-4">
                <Label htmlFor="otherService" className="mb-2 block">
                  {t("servicesOffer.otherServiceLabel")}
                </Label>
                <Input
                  id="otherService"
                  value={otherServiceValue}
                  onChange={(e) => setOtherServiceValue(e.target.value)}
                  placeholder={t("servicesOffer.otherServicePlaceholder")}
                  className="max-w-md"
                />
              </div>
            )}

            {selectedServices.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedServices.length === 1
                  ? t("servicesOffer.servicesSelected", {
                      count: selectedServices.length,
                    })
                  : t("servicesOffer.servicesSelectedPlural", {
                      count: selectedServices.length,
                    })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

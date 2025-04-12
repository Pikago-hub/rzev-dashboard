"use client";

import { useCallback, useEffect, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Define the software options
const SOFTWARE_OPTIONS = [
  { id: "acuity" },
  { id: "booksy" },
  { id: "calendly" },
  { id: "clover" },
  { id: "goldie" },
  { id: "glossGenius" },
  { id: "janeapp" },
  { id: "mangomint" },
  { id: "mindbody" },
  { id: "ovatu" },
  { id: "phorest" },
  { id: "square" },
  { id: "salonIris" },
  { id: "setmore" },
  { id: "shortcuts" },
  { id: "squire" },
  { id: "styleseat" },
  { id: "timely" },
  { id: "vagaro" },
  { id: "zenoti" },
  { id: "none" },
  { id: "other" },
];

export default function CurrentSoftwarePage() {
  const t = useTranslations("onboarding");
  const { user } = useAuth();
  const { setSubmitHandler } = useOnboarding();

  const [currentSoftware, setCurrentSoftware] = useState<string | null>(null);
  const [otherSoftware, setOtherSoftware] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Handle software selection change
  const handleSoftwareChange = (value: string) => {
    console.log("Software selected:", value);
    setCurrentSoftware(value);
  };

  // Load existing current_software from API
  useEffect(() => {
    const fetchCurrentSoftware = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/workspace/current-software?userId=${user.id}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch current software");
        }

        // Update state with existing data if available
        if (data.success && data.currentSoftware) {
          console.log(
            "Loaded current software from API:",
            data.currentSoftware
          );

          // Check if the current_software contains the 'other:' prefix
          if (
            typeof data.currentSoftware === "string" &&
            data.currentSoftware.startsWith("other: ")
          ) {
            // Extract the other software value
            const otherValue = data.currentSoftware.substring(7); // 'other: '.length === 7
            setCurrentSoftware("other");
            setOtherSoftware(otherValue);
            console.log("Extracted other software value:", otherValue);
          } else {
            // Regular software selection
            setCurrentSoftware((data.currentSoftware as string) || null);
          }
        }
      } catch (err) {
        console.error("Error in fetchCurrentSoftware:", err);
        toast({
          title: t("errorTitle"),
          description: t("errorFetchingData"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentSoftware();
  }, [user, t]);

  // Handle form submission
  const handleComplete = useCallback(async () => {
    if (!user) return false;

    console.log("Submitting with current software:", currentSoftware);

    if (!currentSoftware) {
      console.log("Current software validation failed");
      toast({
        title: t("errorTitle"),
        description: t("currentSoftware.selectionRequired"),
        variant: "destructive",
      });
      return false;
    }

    // Validate that other software is specified if "other" is selected
    if (currentSoftware === "other" && !otherSoftware.trim()) {
      console.log("Other software validation failed");
      toast({
        title: t("errorTitle"),
        description: t("currentSoftware.otherSoftwareRequired"),
        variant: "destructive",
      });
      return false;
    }

    try {
      // Save data via API
      const response = await fetch("/api/workspace/current-software", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          software: currentSoftware,
          otherSoftware: currentSoftware === "other" ? otherSoftware : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update current software");
      }

      await response.json();

      toast({
        title: t("successTitle"),
        description: t("successMessage"),
      });

      return true; // Return success status
    } catch (error) {
      console.error("Error updating current software:", error);
      toast({
        title: t("errorTitle"),
        description: t("errorMessage"),
        variant: "destructive",
      });
      return false; // Return failure status
    }
  }, [user, currentSoftware, otherSoftware, t]);

  // Register the submit handler with the onboarding context
  useEffect(() => {
    setSubmitHandler(handleComplete);
    return () => {
      // Clean up by setting a dummy handler when component unmounts
      setSubmitHandler(() => Promise.resolve(false));
    };
  }, [setSubmitHandler, handleComplete]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("currentSoftware.title")}</CardTitle>
        <CardDescription>{t("currentSoftware.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            <RadioGroup
              value={currentSoftware || ""}
              onValueChange={handleSoftwareChange}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
            >
              {SOFTWARE_OPTIONS.map((software) => (
                <label
                  key={software.id}
                  htmlFor={software.id}
                  className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    currentSoftware === software.id
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                  onClick={() => handleSoftwareChange(software.id)}
                >
                  <RadioGroupItem
                    value={software.id}
                    id={software.id}
                    className="absolute right-4 top-4 h-5 w-5"
                  />
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-lg font-medium">
                      {t(`currentSoftware.options.${software.id}`)}
                    </span>
                  </div>
                </label>
              ))}
            </RadioGroup>

            {/* Show input field when "Other" is selected */}
            {currentSoftware === "other" && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="otherSoftware">
                  {t("currentSoftware.otherSoftwareLabel")}
                </Label>
                <Input
                  id="otherSoftware"
                  type="text"
                  value={otherSoftware}
                  onChange={(e) => setOtherSoftware(e.target.value)}
                  placeholder={t("currentSoftware.otherSoftwarePlaceholder")}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

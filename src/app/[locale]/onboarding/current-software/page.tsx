"use client";

import { useCallback, useEffect, useState } from "react";
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
  const supabase = createBrowserClient();
  const [currentSoftware, setCurrentSoftware] = useState<string | null>(null);
  const [otherSoftware, setOtherSoftware] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Handle software selection change
  const handleSoftwareChange = (value: string) => {
    console.log("Software selected:", value);
    setCurrentSoftware(value);
  };

  // Load existing current_software from Supabase
  useEffect(() => {
    const fetchCurrentSoftware = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // First try to fetch with both fields
        let { data, error } = await supabase
          .from("merchant_profiles")
          .select("current_software, other_software")
          .eq("id", user.id)
          .single();

        // If there's an error, it might be because other_software column doesn't exist yet
        // Try again with just current_software
        if (error) {
          console.log("First query failed, trying with just current_software");
          const response = await supabase
            .from("merchant_profiles")
            .select("current_software")
            .eq("id", user.id)
            .single();

          data = response.data as typeof data;
          error = response.error;

          if (error) {
            console.error("Error fetching current software:", error);
            setIsLoading(false);
            return;
          }
        }

        // Update state with existing data if available
        if (data) {
          if (data.current_software) {
            console.log(
              "Loaded current software from DB:",
              data.current_software
            );

            // Check if the current_software contains the 'other:' prefix
            if (
              typeof data.current_software === "string" &&
              data.current_software.startsWith("other: ")
            ) {
              // Extract the other software value
              const otherValue = data.current_software.substring(7); // 'other: '.length === 7
              setCurrentSoftware("other");
              setOtherSoftware(otherValue);
              console.log("Extracted other software value:", otherValue);
            } else {
              // Regular software selection
              setCurrentSoftware((data.current_software as string) || null);
            }
          }

          // If other_software field exists and has data, use it
          if (data.other_software) {
            console.log("Loaded other software from DB:", data.other_software);
            setOtherSoftware((data.other_software as string) || "");
            // Make sure 'other' is selected if we have other_software data
            if (data.current_software === "other") {
              setCurrentSoftware("other");
            }
          }
        }
      } catch (err) {
        console.error("Error in fetchCurrentSoftware:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentSoftware();
  }, [user, supabase]);

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
      // Try to update with both fields first
      let updateResult = await supabase
        .from("merchant_profiles")
        .update({
          current_software: currentSoftware,
          other_software: currentSoftware === "other" ? otherSoftware : null,
        })
        .eq("id", user.id);

      // If there's an error, it might be because other_software column doesn't exist
      if (updateResult.error) {
        console.log(
          "Update with other_software failed, trying with just current_software"
        );
        // Try again with just current_software
        // Store both 'other' and the specific software in one field if 'other' is selected
        updateResult = await supabase
          .from("merchant_profiles")
          .update({
            current_software:
              currentSoftware === "other"
                ? `other: ${otherSoftware}` // Store both 'other' and the specific software in one field
                : currentSoftware,
          })
          .eq("id", user.id);
      }

      const { error } = updateResult;

      if (error) throw error;

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
  }, [user, supabase, currentSoftware, otherSoftware, t]);

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

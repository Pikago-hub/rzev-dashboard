"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast";
import { useOnboarding } from "@/lib/onboarding-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Define interfaces for data structures
interface ReferralSource {
  id: string;
  labelKey: string;
}

interface HeardAboutUsData {
  source?: string;
  otherSource?: string;
}

// Define referral source options
const REFERRAL_SOURCES: ReferralSource[] = [
  { id: "friend", labelKey: "friend" },
  { id: "search", labelKey: "search" },
  { id: "social", labelKey: "social" },
  { id: "mail", labelKey: "mail" },
  { id: "magazine", labelKey: "magazine" },
  { id: "ratings", labelKey: "ratings" },
  { id: "other", labelKey: "other" },
];

export default function HeardAboutUsPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const { user } = useAuth();
  const { setSubmitHandler } = useOnboarding();
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [otherSource, setOtherSource] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Load existing data if available
  useEffect(() => {
    const fetchHeardAboutUs = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch heard about us data from the API
        const response = await fetch(
          `/api/workspace/heard-about-us?userId=${user.id}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to fetch heard about us data"
          );
        }

        const data = await response.json();

        // If we have existing data, parse it and set selected source
        if (data.success && data.heardAboutUs) {
          try {
            // Handle both string and object formats
            let heardAboutUs = data.heardAboutUs;

            // If it's a string that starts with "other:", extract the value
            if (typeof heardAboutUs === "string") {
              if (heardAboutUs.startsWith("other:")) {
                setSelectedSource("other");
                setOtherSource(heardAboutUs.substring(6).trim());
              } else {
                setSelectedSource(heardAboutUs);
              }
            }
            // If it's an object or JSON string
            else {
              // Parse JSON string if needed
              if (typeof heardAboutUs === "string") {
                try {
                  heardAboutUs = JSON.parse(heardAboutUs);
                } catch (parseError) {
                  console.error(
                    "Error parsing heard_about_us JSON:",
                    parseError
                  );
                }
              }

              // Handle object format
              if (heardAboutUs && typeof heardAboutUs === "object") {
                const heardAboutUsObj = heardAboutUs as HeardAboutUsData;
                if (heardAboutUsObj.source) {
                  setSelectedSource(heardAboutUsObj.source);

                  if (
                    heardAboutUsObj.source === "other" &&
                    heardAboutUsObj.otherSource
                  ) {
                    setOtherSource(heardAboutUsObj.otherSource);
                  }
                }
              }
            }
          } catch (parseError) {
            console.error("Error processing heard_about_us data:", parseError);
          }
        }
      } catch (err) {
        console.error("Error in fetchHeardAboutUs:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeardAboutUs();
  }, [user]);

  // Handle source selection change
  const handleSourceChange = (value: string) => {
    console.log("Source selected:", value);
    setSelectedSource(value);

    // Clear other source if not selecting "other"
    if (value !== "other") {
      setOtherSource("");
    }
  };

  // Handle form submission
  const handleComplete = useCallback(async () => {
    if (!user) return false;

    try {
      // Validate selection
      if (!selectedSource) {
        toast({
          title: t("errorTitle"),
          description: t("heardAboutUs.selectionRequired"),
          variant: "destructive",
        });
        return false;
      }

      // If "other" is selected, validate that a value is provided
      if (selectedSource === "other" && !otherSource.trim()) {
        toast({
          title: t("errorTitle"),
          description: t("heardAboutUs.otherSourceRequired"),
          variant: "destructive",
        });
        return false;
      }

      // Save data via API
      const response = await fetch("/api/workspace/heard-about-us", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          source: selectedSource,
          otherSource: selectedSource === "other" ? otherSource : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update heard about us data"
        );
      }

      await response.json();

      toast({
        title: t("successTitle"),
        description: t("successMessage"),
      });

      // Redirect to dashboard after successful onboarding
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);

      return true; // Return success status
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: t("errorTitle"),
        description: t("errorMessage"),
        variant: "destructive",
      });
      return false; // Return failure status
    }
  }, [user, selectedSource, otherSource, t, router]);

  // Register the submit handler with the context
  useEffect(() => {
    // Create a stable reference to the submit handler that returns a Promise<boolean>
    const submitFn = async (): Promise<boolean> => {
      try {
        return await handleComplete();
      } catch (error) {
        console.error("Error in submit handler:", error);
        return false;
      }
    };

    setSubmitHandler(submitFn);
    // We need to include selectedSource and otherSource in dependencies to ensure the latest values are used
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSubmitHandler, selectedSource, otherSource]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("heardAboutUs.title")}</CardTitle>
        <CardDescription>{t("heardAboutUs.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            <RadioGroup
              value={selectedSource}
              onValueChange={handleSourceChange}
              className="space-y-4"
            >
              {REFERRAL_SOURCES.map((source) => (
                <div key={source.id} className="flex items-start space-x-2">
                  <RadioGroupItem
                    value={source.id}
                    id={source.id}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={source.id}
                      className="text-base cursor-pointer"
                    >
                      {t(`heardAboutUs.options.${source.labelKey}`)}
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {selectedSource === "other" && (
              <div className="ml-6 mt-2">
                <Label htmlFor="otherSource" className="mb-2 block">
                  {t("heardAboutUs.pleaseSpecify")}
                </Label>
                <Input
                  id="otherSource"
                  value={otherSource}
                  onChange={(e) => setOtherSource(e.target.value)}
                  placeholder={t("heardAboutUs.otherPlaceholder")}
                  className="max-w-md"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

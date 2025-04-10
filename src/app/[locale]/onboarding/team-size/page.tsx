"use client";

import { useEffect, useState } from "react";
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
import { Users } from "lucide-react";

export default function TeamSizePage() {
  const t = useTranslations("onboarding");
  const { user } = useAuth();
  const { setSubmitHandler } = useOnboarding();
  const supabase = createBrowserClient();
  const [teamSize, setTeamSize] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debug function to log state changes
  const handleTeamSizeChange = (value: string) => {
    console.log("Team size selected:", value);
    setTeamSize(value);
  };

  // Load existing team size from Supabase
  useEffect(() => {
    const fetchTeamSize = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("merchant_profiles")
          .select("team_size")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching team size:", error);
          setIsLoading(false);
          return;
        }

        // Convert the stored value back to our internal representation
        if (data && data.team_size) {
          let selectedValue: string;
          switch (data.team_size) {
            case "1":
              selectedValue = "individual";
              break;
            case "2-6":
              selectedValue = "small";
              break;
            case "7+":
              selectedValue = "large";
              break;
            default:
              // Handle any other values that might be in the database
              selectedValue = String(data.team_size);
          }
          console.log(
            "Loaded team size from DB:",
            data.team_size,
            "converted to:",
            selectedValue
          );
          setTeamSize(selectedValue);
        }
      } catch (err) {
        console.error("Error in fetchTeamSize:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamSize();
  }, [user, supabase]);

  // Handle form submission
  const handleComplete = async () => {
    if (!user) return false;

    console.log("Submitting with team size:", teamSize);

    if (!teamSize || teamSize === "") {
      console.log("Team size validation failed");
      toast({
        title: t("errorTitle"),
        description: t("teamSize.selectionRequired"),
        variant: "destructive",
      });
      return false;
    }

    // Convert team size selection to the appropriate value for Supabase
    let teamSizeValue: string;
    switch (teamSize) {
      case "individual":
        teamSizeValue = "1";
        break;
      case "small":
        teamSizeValue = "2-6";
        break;
      case "large":
        teamSizeValue = "7+";
        break;
      default:
        teamSizeValue = teamSize; // Fallback to original value
    }

    console.log("Converted team size value:", teamSizeValue);

    try {
      // Update merchant profile with team size only
      const { error } = await supabase
        .from("merchant_profiles")
        .update({
          team_size: teamSizeValue,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Show success toast
      toast({
        title: t("successTitle"),
        description: t("successMessage"),
      });

      return true; // Return success status
    } catch (error) {
      console.error("Error updating team size:", error);
      toast({
        title: t("errorTitle"),
        description: t("errorMessage"),
        variant: "destructive",
      });
      return false; // Return failure status
    }
  };

  // Register the submit handler with the context
  useEffect(() => {
    // Create a stable reference to the submit handler that returns a Promise<boolean>
    const submitFn = async (): Promise<boolean> => {
      try {
        console.log("Submit function called, current teamSize:", teamSize);
        return await handleComplete();
      } catch (error) {
        console.error("Error in submit handler:", error);
        return false;
      }
    };

    console.log("Registering submit handler");
    setSubmitHandler(submitFn);
    // We need to include teamSize in dependencies to ensure the latest value is used
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSubmitHandler, teamSize]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("teamSize.title")}</CardTitle>
        <CardDescription>{t("teamSize.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            <RadioGroup
              value={teamSize || ""}
              onValueChange={handleTeamSizeChange}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* Individual Option */}
              <label
                htmlFor="individual"
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  teamSize === "individual"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }`}
                onClick={() => handleTeamSizeChange("individual")}
              >
                <RadioGroupItem
                  value="individual"
                  id="individual"
                  className="absolute right-4 top-4 h-5 w-5"
                />
                <div className="flex flex-col items-center justify-center gap-2 h-full">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                  <span className="text-lg font-medium">
                    {t("teamSize.options.individual")}
                  </span>
                  <span className="text-sm text-muted-foreground text-center">
                    {t("teamSize.options.individualDescription")}
                  </span>
                </div>
              </label>

              {/* Small Team Option */}
              <label
                htmlFor="small"
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  teamSize === "small"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }`}
                onClick={() => handleTeamSizeChange("small")}
              >
                <RadioGroupItem
                  value="small"
                  id="small"
                  className="absolute right-4 top-4 h-5 w-5"
                />
                <div className="flex flex-col items-center justify-center gap-2 h-full">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                  <span className="text-lg font-medium">
                    {t("teamSize.options.small")}
                  </span>
                  <span className="text-sm text-muted-foreground text-center">
                    {t("teamSize.options.smallDescription")}
                  </span>
                </div>
              </label>

              {/* Large Team Option */}
              <label
                htmlFor="large"
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  teamSize === "large"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }`}
                onClick={() => handleTeamSizeChange("large")}
              >
                <RadioGroupItem
                  value="large"
                  id="large"
                  className="absolute right-4 top-4 h-5 w-5"
                />
                <div className="flex flex-col items-center justify-center gap-2 h-full">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                  <span className="text-lg font-medium">
                    {t("teamSize.options.large")}
                  </span>
                  <span className="text-sm text-muted-foreground text-center">
                    {t("teamSize.options.largeDescription")}
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

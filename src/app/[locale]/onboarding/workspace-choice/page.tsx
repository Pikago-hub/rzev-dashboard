"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useOnboarding } from "@/lib/onboarding-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PlusCircle, Users } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

type WorkspaceChoice = "create" | "join";

export default function WorkspaceChoicePage() {
  const t = useTranslations("onboarding.workspaceChoice");
  // No need for user auth in this component
  const router = useRouter();
  const { setSubmitHandler } = useOnboarding();
  const [selectedChoice, setSelectedChoice] = useState<WorkspaceChoice | null>(
    null
  );

  // No loading state needed in this component

  const handleSubmit = useCallback(async () => {
    try {
      if (!selectedChoice) {
        toast({
          title: t("errorTitle"),
          description: t("selectOption"),
          variant: "destructive",
        });
        return false;
      }

      // We've added a special case in the onboarding context for workspace-choice
      // so we can return true and still handle our own navigation
      if (selectedChoice === "create") {
        router.push("/onboarding/create-workspace");
      } else if (selectedChoice === "join") {
        router.push("/onboarding/join-workspace");
      }

      return true; // Return true to indicate success
    } catch (error) {
      console.error("Error handling workspace choice:", error);
      toast({
        title: t("errorTitle"),
        description: t("errorMessage"),
        variant: "destructive",
      });
      return false;
    }
  }, [selectedChoice, router, t]);

  // Register the submit handler with the onboarding context
  useEffect(() => {
    setSubmitHandler(handleSubmit);

    // Clean up by setting a dummy handler when component unmounts
    return () => {
      setSubmitHandler(() => Promise.resolve(false));
    };
  }, [setSubmitHandler, handleSubmit]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {
          <div className="space-y-6">
            <RadioGroup
              value={selectedChoice || ""}
              onValueChange={(value) => {
                setSelectedChoice(value as WorkspaceChoice);
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="create"
                  id="create"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="create"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <PlusCircle className="mb-3 h-6 w-6" />
                  <div className="text-center">
                    <p className="font-medium">{t("createOption.title")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("createOption.description")}
                    </p>
                  </div>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="join"
                  id="join"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="join"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Users className="mb-3 h-6 w-6" />
                  <div className="text-center">
                    <p className="font-medium">{t("joinOption.title")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("joinOption.description")}
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        }
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Sparkles, Loader2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";

// Define the form values type
interface FormValues {
  name: string;
  website?: string;
}

interface WorkspaceExtractorProps {
  form: UseFormReturn<FormValues>;
  user: { id: string } | null;
  hasExistingWorkspace: boolean;
  existingWorkspace: {
    id: string;
    name: string;
    website: string | null;
  };
  t: ReturnType<typeof useTranslations>; 
  onExtractionSuccess: () => void;
  onExtractionStart?: () => void;
  onExtractionEnd?: () => void;
  className?: string;
}

export function WorkspaceExtractor({
  form,
  user,
  hasExistingWorkspace,
  existingWorkspace,
  t,
  onExtractionSuccess,
  onExtractionStart,
  onExtractionEnd,
  className = "",
}: WorkspaceExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false);

  const extractInfo = useCallback(
    async (values: FormValues) => {
      // Validate both fields are required for AI extraction
      let isValid = true;

      // Clear previous errors
      form.clearErrors();

      // Validate name
      if (!values.name || values.name.trim() === "") {
        form.setError("name", { message: t("nameRequired") });
        isValid = false;
      }

      // Validate website
      if (!values.website || values.website.trim() === "") {
        form.setError("website", { message: t("websiteRequired") });
        isValid = false;
      } else if (
        !/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/.test(
          values.website
        )
      ) {
        form.setError("website", { message: t("validWebsite") });
        isValid = false;
      }

      if (!isValid) {
        return false;
      }

      try {
        if (!user) {
          toast({
            title: t("errorTitle"),
            description: t("notAuthenticated"),
            variant: "destructive",
          });
          return false;
        }

        setIsExtracting(true);
        if (onExtractionStart) onExtractionStart();

        // Prepare workspace data
        const workspaceData = {
          name: values.name,
          website: values.website,
        };

        // If user has an existing workspace, update it instead of creating a new one
        const endpoint = hasExistingWorkspace
          ? "/api/workspace/update"
          : "/api/workspace/create";

        const requestBody = hasExistingWorkspace
          ? {
              userId: user.id,
              workspaceId: existingWorkspace.id,
              workspaceData,
              useWebsiteInfo: true,
            }
          : {
              userId: user.id,
              workspaceData,
              useWebsiteInfo: true,
            };

        // Call the API to create/update a workspace with GPT extraction
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create workspace");
        }

        const data = await response.json();

        if (data.extractionSuccess) {
          toast({
            title: t("extractionSuccessTitle"),
            description: t("extractionSuccessMessage"),
          });

          // Call the success callback
          onExtractionSuccess();
          return true;
        } else {
          toast({
            title: t("extractionFailedTitle"),
            description: t("extractionFailedMessage"),
            variant: "destructive",
          });

          // Stay on the same page if extraction failed
          toast({
            title: t("manualEntryTitle"),
          });
          return false;
        }
      } catch (error) {
        console.error("Error extracting info:", error);
        toast({
          title: t("errorTitle"),
          description:
            error instanceof Error ? error.message : t("errorMessage"),
          variant: "destructive",
        });
        return false;
      } finally {
        setIsExtracting(false);
        if (onExtractionEnd) onExtractionEnd();
      }
    },
    [
      user,
      t,
      form,
      hasExistingWorkspace,
      existingWorkspace.id,
      onExtractionSuccess,
      onExtractionStart,
      onExtractionEnd,
    ]
  );

  return (
    <Button
      type="button"
      onClick={form.handleSubmit(extractInfo)}
      disabled={isExtracting}
      className={`w-full h-12 text-base ${className}`}
    >
      {isExtracting ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-5 w-5" />
      )}
      {hasExistingWorkspace ? t("extractButtonUpdate") : t("extractButton")}
    </Button>
  );
}

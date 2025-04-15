"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/workspace-context";
import { getAuthToken } from "@/lib/auth-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface GoLiveButtonProps {
  translationFunc: (key: string) => string;
}

export function GoLiveButton({ translationFunc: t }: GoLiveButtonProps) {
  const { toast } = useToast();
  const { workspaceProfile, refreshWorkspace } = useWorkspace();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  // We only need the setter function to update validation errors

  // Handle both boolean and string representations of active_status
  const isAlreadyLive =
    workspaceProfile?.active_status === true ||
    String(workspaceProfile?.active_status) === "true";

  const checkValidationStatus = useCallback(async () => {
    setIsChecking(true);

    try {
      const token = await getAuthToken();
      // Use the workspace ID if available, otherwise the server will determine it
      const url = workspaceProfile?.id
        ? `/api/workspace/go-live?workspaceId=${workspaceProfile.id}`
        : "/api/workspace/go-live";

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        // We don't need to track isReadyToGoLive separately as we use validationErrors.length
        setValidationErrors(data.validationErrors || []);
      } else {
        console.error("Error response:", data.error);
        setValidationErrors([
          data.error || "Failed to check validation status",
        ]);
      }
    } catch (error) {
      console.error("Error checking validation status:", error);
      setValidationErrors(["An unexpected error occurred"]);
    } finally {
      setIsChecking(false);
    }
  }, [workspaceProfile?.id]);

  // Check validation status when component mounts
  useEffect(() => {
    // We can check validation status even without workspace ID
    // The server will determine the workspace ID from the authenticated user
    if (!isAlreadyLive) {
      checkValidationStatus();
    }
  }, [isAlreadyLive, checkValidationStatus]);

  const handleGoLiveClick = async () => {
    if (isAlreadyLive) {
      // If already live, show deactivate dialog
      setShowDeactivateDialog(true);
    } else if (validationErrors.length > 0) {
      // If not live but has validation errors, show validation dialog
      setShowValidationDialog(true);
    } else {
      // If not live and no validation errors, show activation dialog
      setShowDialog(true);
    }
  };

  const confirmGoLive = async () => {
    setIsProcessing(true);
    setShowDialog(false);

    try {
      // Get the auth token
      const token = await getAuthToken();

      // Call the API to go live
      const response = await fetch("/api/workspace/go-live", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Only include workspaceId if it's available, otherwise the server will determine it
        body: JSON.stringify(
          workspaceProfile?.id
            ? {
                workspaceId: workspaceProfile.id,
              }
            : {}
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.validationErrors && data.validationErrors.length > 0) {
          setValidationErrors(data.validationErrors);
          setShowValidationDialog(true);
        } else {
          throw new Error(data.error || "Failed to go live");
        }
      } else {
        toast({
          title: t("business.goLive.success.title"),
          description: t("business.goLive.success.description"),
          variant: "default",
        });

        // Refresh workspace data to update UI
        await refreshWorkspace();

        // Force a page reload to ensure all components reflect the updated status
        window.location.reload();
      }
    } catch (error) {
      console.error("Error going live:", error);
      toast({
        title: t("business.goLive.error.title"),
        description: t("business.goLive.error.description"),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeactivate = async () => {
    setIsProcessing(true);
    setShowDeactivateDialog(false);

    try {
      // Get the auth token
      const token = await getAuthToken();

      // Call the API to deactivate
      const response = await fetch("/api/workspace/go-live", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId: workspaceProfile?.id,
          deactivate: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to deactivate workspace");
      } else {
        toast({
          title: t("business.goLive.deactivate.success.title"),
          description: t("business.goLive.deactivate.success.description"),
          variant: "default",
        });

        // Refresh workspace data to update UI
        await refreshWorkspace();

        // Force a page reload to ensure all components reflect the updated status
        window.location.reload();
      }
    } catch (error) {
      console.error("Error deactivating workspace:", error);
      toast({
        title: t("business.goLive.deactivate.error.title"),
        description: t("business.goLive.deactivate.error.description"),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 p-6 border rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">
              {t("business.goLive.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isAlreadyLive
                ? t("business.goLive.alreadyLive")
                : t("business.goLive.description")}
            </p>
          </div>
          {isChecking ? (
            <Button disabled variant="outline">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("common.loading")}
            </Button>
          ) : (
            <Button
              onClick={handleGoLiveClick}
              disabled={isProcessing}
              variant={isAlreadyLive ? "outline" : "default"}
              className={isAlreadyLive ? "bg-green-50" : ""}
            >
              {isAlreadyLive ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {t("business.goLive.deactivateButton")}
                </span>
              ) : (
                t("business.goLive.goLiveButton")
              )}
            </Button>
          )}
        </div>

        {/* Show validation errors summary if there are any */}
        {!isAlreadyLive && validationErrors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 rounded-md border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="font-medium text-red-800">
                {t("business.goLive.validation.issuesFound")}
              </span>
            </div>
            <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
              {validationErrors.slice(0, 3).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
              {validationErrors.length > 3 && (
                <li>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-red-700 underline"
                    onClick={() => setShowValidationDialog(true)}
                  >
                    {t("business.goLive.validation.viewAll")}
                  </Button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Activation Confirmation Dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("business.goLive.dialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("business.goLive.dialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("business.goLive.dialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmGoLive}>
              {t("business.goLive.dialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("business.goLive.deactivate.dialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("business.goLive.deactivate.dialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("business.goLive.deactivate.dialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("business.goLive.deactivate.dialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Validation Errors Dialog */}
      <AlertDialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              {t("business.goLive.validation.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("business.goLive.validation.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <ul className="space-y-2 list-disc pl-5">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">
                  {error}
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowValidationDialog(false)}>
              {t("business.goLive.validation.ok")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

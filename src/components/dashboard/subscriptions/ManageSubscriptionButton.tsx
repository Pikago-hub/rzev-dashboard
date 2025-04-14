"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getAuthToken } from "@/lib/auth-context";

interface ManageSubscriptionButtonProps {
  workspaceId: string;
}

export function ManageSubscriptionButton({
  workspaceId,
}: ManageSubscriptionButtonProps) {
  const t = useTranslations("dashboard.subscriptions");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);

      // Get the auth token
      let token;
      try {
        token = await getAuthToken();
      } catch (authError) {
        console.error("Error getting auth token:", authError);
        toast({
          title: t("error.title"),
          description: t("error.authRequired"),
          variant: "destructive",
        });
        // Redirect to auth page
        window.location.href = "/auth";
        return;
      }

      // Call the API to create a customer portal session
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to create customer portal session"
        );
      }

      const data = await response.json();

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Error creating customer portal session:", err);
      toast({
        title: t("error.title"),
        description:
          err instanceof Error ? err.message : t("error.customerPortal"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleManageSubscription}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ExternalLink className="h-4 w-4" />
      )}
      {t("manageSubscription")}
    </Button>
  );
}

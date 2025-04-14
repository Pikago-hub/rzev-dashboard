"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { getAuthToken } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";

interface AddSeatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translationFunc: (key: string, params?: Record<string, string>) => string;
  billingInterval: string | null;
  onSuccess?: () => void;
}

export function AddSeatsDialog({
  open,
  onOpenChange,
  translationFunc: t,
  billingInterval,
  onSuccess,
}: AddSeatsDialogProps) {
  const [seatsToAdd, setSeatsToAdd] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { workspaceId } = useWorkspace();

  // Calculate the price based on billing interval and number of seats
  const seatPrice = billingInterval === "year" ? 100 : 10;
  const totalPrice = seatPrice * seatsToAdd;
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(totalPrice);

  const handleAddSeats = async () => {
    if (seatsToAdd < 1) {
      toast({
        title: t("error.title"),
        description: t("addSeatsDialog.invalidSeats"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Get the auth token
      const token = await getAuthToken();

      // Call the API to add seats
      const response = await fetch("/api/stripe/add-seats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId,
          seatsToAdd,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add seats");
      }

      toast({
        title: t("common.success"),
        description: t("addSeatsDialog.successMessage", {
          count: seatsToAdd.toString(),
        }),
      });

      // Close the dialog and call onSuccess if provided
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error adding seats:", error);
      toast({
        title: t("error.title"),
        description: errorMessage || t("addSeatsDialog.errorMessage"),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("addSeatsDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("addSeatsDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seats">{t("addSeatsDialog.seatsLabel")}</Label>
            <Input
              id="seats"
              type="number"
              min="1"
              value={seatsToAdd}
              onChange={(e) => setSeatsToAdd(parseInt(e.target.value) || 1)}
              disabled={isProcessing}
            />
          </div>

          <div className="pt-2">
            <p className="text-sm text-muted-foreground">
              {t("addSeatsDialog.priceInfo", {
                price: billingInterval === "year" ? "$100/year" : "$10/month",
              })}
            </p>
            <p className="mt-2 font-medium">
              {t("addSeatsDialog.totalPrice", { total: formattedPrice })}
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="sm:order-1"
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="default"
            onClick={handleAddSeats}
            disabled={isProcessing}
            className="sm:order-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.processing")}
              </>
            ) : (
              t("addSeatsDialog.confirmButton")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { useRouter } from "@/i18n/navigation";
import { AddSeatsDialog } from "./AddSeatsDialog";

interface SeatLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translationFunc: (key: string, params?: Record<string, string>) => string;
  billingInterval: string | null;
  onSuccess?: () => void;
}

export function SeatLimitDialog({
  open,
  onOpenChange,
  translationFunc: t,
  billingInterval,
  onSuccess,
}: SeatLimitDialogProps) {
  const router = useRouter();
  const [isAddSeatsDialogOpen, setIsAddSeatsDialogOpen] = useState(false);

  // Calculate the price based on billing interval
  const seatPrice = billingInterval === "year" ? "$100/year" : "$10/month";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("seatLimitDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("seatLimitDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="mb-4">{t("seatLimitDialog.options")}</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t("seatLimitDialog.upgradePlan")}</li>
              <li>{t("seatLimitDialog.addSeat", { price: seatPrice })}</li>
            </ul>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="sm:order-1"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="default"
              className="sm:order-2"
              onClick={() => {
                onOpenChange(false);
                // Use router.push instead of window.location.href to avoid full page reload
                router.push("/dashboard/subscriptions");
              }}
            >
              {t("seatLimitDialog.upgradePlanButton")}
            </Button>
            <Button
              variant="secondary"
              className="sm:order-3"
              onClick={() => {
                onOpenChange(false);
                setIsAddSeatsDialogOpen(true);
              }}
            >
              {t("seatLimitDialog.addSeatButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddSeatsDialog
        open={isAddSeatsDialogOpen}
        onOpenChange={setIsAddSeatsDialogOpen}
        translationFunc={t}
        billingInterval={billingInterval}
        onSuccess={onSuccess}
      />
    </>
  );
}

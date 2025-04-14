"use client";

import { useTranslations } from "next-intl";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { BillingInterval } from "@/types/subscription";

interface BillingIntervalToggleProps {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
}

export function BillingIntervalToggle({
  value,
  onChange,
}: BillingIntervalToggleProps) {
  const t = useTranslations("dashboard.subscriptions");

  return (
    <div className="flex justify-center mb-8">
      <div className="bg-muted p-1 rounded-full shadow-sm">
        <ToggleGroup
          type="single"
          value={value}
          onValueChange={(value: string) => {
            if (value) onChange(value as BillingInterval);
          }}
          className="rounded-full"
        >
          <ToggleGroupItem
            value="monthly"
            className="px-6 py-2 rounded-full data-[state=on]:bg-white data-[state=on]:shadow-sm"
          >
            {t("billingToggle.monthly")}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="yearly"
            className="px-6 py-2 rounded-full data-[state=on]:bg-white data-[state=on]:shadow-sm"
          >
            {t("billingToggle.yearly")}
            <Badge
              variant="outline"
              className="ml-2 text-xs bg-green-50 text-green-700 border-green-200"
            >
              {t("billingToggle.savePercent")}
            </Badge>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
